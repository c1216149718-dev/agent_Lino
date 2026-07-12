const systemPrompt = '你是 Lino，一个温和、可靠、清晰的中文 AI 助手。回答简洁、可执行，并保持陪伴感。'

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
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

function sseStream(upstream) {
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      try {
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

            try {
              const payload = JSON.parse(dataLine.slice(5).trim())
              const content = payload.choices?.[0]?.delta?.content
              if (content) {
                controller.enqueue(
                  encoder.encode(`event: delta\ndata: ${JSON.stringify({ type: 'delta', content })}\n\n`),
                )
              }
            } catch {
              // Ignore malformed upstream chunks and continue the stream.
            }
          })
        }

        controller.enqueue(encoder.encode('event: done\ndata: {"type":"done"}\n\n'))
        controller.close()
      } catch {
        controller.enqueue(
          encoder.encode('event: error\ndata: {"type":"error","message":"provider_error"}\n\n'),
        )
        controller.close()
      }
    },
    cancel() {
      reader.cancel()
    },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      if (!env.DEEPSEEK_API_KEY) {
        return jsonResponse(503, { error: 'provider_unavailable' })
      }

      let payload
      try {
        payload = await request.json()
      } catch {
        return jsonResponse(400, { error: 'invalid_json' })
      }

      const messages = sanitizeMessages(payload.messages)
      if (!messages.length) {
        return jsonResponse(400, { error: 'messages_required' })
      }

      try {
        const upstream = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            stream: true,
            thinking: { type: 'disabled' },
            temperature: 0.7,
          }),
        })

        if (!upstream.ok || !upstream.body) {
          return jsonResponse(502, { error: 'provider_error' })
        }

        return new Response(sseStream(upstream), {
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/event-stream; charset=utf-8',
          },
        })
      } catch {
        return jsonResponse(502, { error: 'provider_error' })
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return jsonResponse(404, { error: 'not_found' })
    }

    return env.ASSETS?.fetch(request) ?? jsonResponse(503, { error: 'assets_unavailable' })
  },
}
