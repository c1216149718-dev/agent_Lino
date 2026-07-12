import { createAssistantReply } from '../utils/replies'

const MOCK_REPLY_DELAY_MS = 420

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestMockReply({ agentState, content, onDelta }) {
  await wait(MOCK_REPLY_DELAY_MS)
  const reply = createAssistantReply(content, agentState)
  onDelta?.(reply)

  return {
    content: reply,
    source: 'local-mock',
  }
}

async function readStream(response, onDelta) {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('stream_unavailable')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

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
      if (!dataLine) {
        return
      }

      const payload = JSON.parse(dataLine.slice(5).trim())
      if (payload.type === 'delta' && payload.content) {
        content += payload.content
        onDelta?.(payload.content)
      }
      if (payload.type === 'error') {
        throw new Error(payload.message || 'stream_error')
      }
    })
  }

  return content
}

export async function requestAssistantReply({ agentState, content, messages, onDelta, signal }) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })
    if (!response.ok) {
      throw new Error(`api_${response.status}`)
    }

    const streamedContent = await readStream(response, onDelta)
    if (!streamedContent) {
      throw new Error('empty_response')
    }

    return { content: streamedContent, source: 'deepseek' }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    return requestMockReply({ agentState, content, onDelta })
  }
}
