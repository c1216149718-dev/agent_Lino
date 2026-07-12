import { createServer } from 'node:http'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const port = Number(process.env.PORT || 5174)
const envPath = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', 'agent-home.env'),
].find((candidate) => {
  try {
    readFileSync(candidate)
    return true
  } catch {
    return false
  }
})

try {
  readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  })
} catch {
  // Running without .env keeps the frontend available in local mock mode.
}

const systemPrompt = '你是 Lino，一个温和、可靠、清晰的中文 AI 助手。回答简洁、可执行，并保持陪伴感。'
const staticRoot = resolve(process.cwd(), 'dist')
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function sendEvent(response, type, payload = {}) {
  response.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...payload })}\n\n`)
}

function readRequestBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 64_000) {
        reject(new Error('request_too_large'))
        request.destroy()
      }
    })
    request.on('end', () => resolveBody(body))
    request.on('error', reject)
  })
}

function serveStatic(request, response) {
  if (!existsSync(staticRoot)) {
    sendJson(response, 503, { error: 'frontend_not_built' })
    return
  }

  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const requestedPath = resolve(staticRoot, `.${pathname}`)
  const filePath = existsSync(requestedPath) && statSync(requestedPath).isFile()
    ? requestedPath
    : resolve(staticRoot, 'index.html')

  if (!filePath.startsWith(staticRoot) || !existsSync(filePath)) {
    sendJson(response, 404, { error: 'not_found' })
    return
  }

  response.writeHead(200, {
    'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'Content-Type': contentTypes[filePath.slice(filePath.lastIndexOf('.'))] || 'application/octet-stream',
  })
  createReadStream(filePath).pipe(response)
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages
    .filter(
      (message) =>
        ['user', 'assistant'].includes(message?.role) &&
        typeof message.content === 'string' &&
        message.content.trim(),
    )
    .slice(-24)
    .map(({ content, role }) => ({ content: content.slice(0, 8_000), role }))
}

async function forwardDeepSeekStream(response, messages, signal) {
  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      thinking: { type: 'disabled' },
      temperature: 0.7,
    }),
    signal,
  })

  if (!upstream.ok || !upstream.body) {
    throw new Error(`deepseek_${upstream.status}`)
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    events.forEach((event) => {
      const dataLine = event.split('\n').find((line) => line.startsWith('data:'))
      if (!dataLine || dataLine.slice(5).trim() === '[DONE]') {
        return
      }

      const payload = JSON.parse(dataLine.slice(5).trim())
      const content = payload.choices?.[0]?.delta?.content
      if (content) {
        sendEvent(response, 'delta', { content })
      }
    })
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && !request.url.startsWith('/api/')) {
    serveStatic(request, response)
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/chat') {
    sendJson(response, 404, { error: 'not_found' })
    return
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    sendJson(response, 503, { error: 'provider_unavailable' })
    return
  }

  try {
    const payload = JSON.parse(await readRequestBody(request))
    const messages = sanitizeMessages(payload.messages)
    if (!messages.length) {
      sendJson(response, 400, { error: 'messages_required' })
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45_000)
    request.on('aborted', () => controller.abort())

    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
    })
    try {
      await forwardDeepSeekStream(response, messages, controller.signal)
      sendEvent(response, 'done')
      response.end()
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.error(`[DeepSeek] ${error.name || 'Error'}: ${error.message || 'provider_error'}`)
    if (!response.headersSent) {
      sendJson(response, 502, { error: 'provider_error' })
    } else {
      sendEvent(response, 'error', { message: 'provider_error' })
      response.end()
    }
  }
})

server.listen(port, () => {
  console.log(`Lino API proxy listening on http://localhost:${port}`)
})
