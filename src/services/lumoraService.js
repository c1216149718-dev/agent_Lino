import { getSpirit } from '../data/lumora'

const MOCK_DELAY = 380

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function mockReply(spiritId, content) {
  const spirit = getSpirit(spiritId)
  const openings = {
    lino: '我在听。',
    momo: '这份感受值得被好好接住。',
    piko: '这个念头很有意思，我已经看到几颗小星星了。',
    tutu: '收到，我们先把它变成一条清楚的路线。',
    nox: '先把呼吸放慢一点，夜晚不用赶。',
  }
  return `${openings[spirit.id]}你刚才提到“${content.slice(0, 34)}${content.length > 34 ? '…' : ''}”。${spirit.prompt}`
}

async function readStream(response, onDelta) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('stream_unavailable')
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) {
      const dataLine = event.split('\n').find((line) => line.startsWith('data:'))
      if (!dataLine) continue
      const payload = JSON.parse(dataLine.slice(5).trim())
      if (payload.type === 'delta' && payload.content) {
        content += payload.content
        onDelta?.(payload.content)
      }
      if (payload.type === 'error') throw new Error(payload.message || 'stream_error')
    }
  }
  return content
}

export async function requestSpiritReply({ conversationId, memoryContext, messages, onDelta, signal, spiritId }) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, memoryContext, messages, spiritId }),
      signal,
    })
    if (!response.ok) throw new Error(`api_${response.status}`)
    const content = await readStream(response, onDelta)
    if (!content) throw new Error('empty_response')
    return { content, source: 'deepseek' }
  } catch (error) {
    if (error.name === 'AbortError') throw error
    await wait(MOCK_DELAY)
    const lastUser = [...messages].reverse().find((message) => message.role === 'user')
    const content = mockReply(spiritId, lastUser?.content ?? '')
    onDelta?.(content)
    return { content, source: 'local-mock' }
  }
}

export async function requestConversationSummary({ conversation }) {
  const fallback = createLocalSummary(conversation)
  try {
    const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    })
    if (!response.ok) return fallback
    const payload = await response.json()
    return payload.memory?.summary ? payload.memory : fallback
  } catch {
    return fallback
  }
}

export function createLocalSummary(conversation) {
  const userMessages = conversation.messages.filter((message) => message.role === 'user')
  const first = userMessages[0]?.content?.trim() || '一段安静的对话'
  const title = first.replace(/\s+/g, ' ').slice(0, 18)
  const excerpts = userMessages.slice(0, 3).map((message) => message.content.trim()).filter(Boolean)
  const summaryBase = excerpts.join('；').slice(0, 150)
  return {
    id: `memory-${conversation.id}`,
    conversationId: conversation.id,
    spiritId: conversation.spiritId,
    title,
    summary: `这次对话主要记录了：${summaryBase || '用户与精灵之间的一次陪伴交流。'}`.slice(0, 180),
    keyPoints: userMessages.slice(0, 5).map((message) => message.content.trim().slice(0, 60)),
    createdAt: new Date().toISOString(),
    source: 'local',
  }
}
