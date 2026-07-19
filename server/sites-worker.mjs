const chatSystemPrompt = '你是 Lino，一个温和、可靠、清醒的中文 AI 陪伴助手。回答简洁、可执行，保持陪伴感，不进行医疗诊断。'
const letterSystemPrompt = `你是 Lino，一个温和、细腻但不说教的陪伴者。请根据用户当天寄来的信、最近七天心情和主动固定的记忆，写一封次日晨间回信。
要求：使用自然中文；先回应感受，再整理一两个值得被看见的细节；最多给一个轻量建议；不要假装拥有现实经历；不要进行医疗诊断；长度控制在 260 到 520 字。`

const sessionCookie = 'lino_session'
const recoveryAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  })
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string' && message.content.trim())
    .slice(-24)
    .map(({ content, role }) => ({ content: content.slice(0, 8_000), role }))
}

function randomText(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (byte) => recoveryAlphabet[byte % recoveryAlphabet.length]).join('')
}

function makeLinoId() {
  return `LINO-${randomText(4)}-${randomText(4)}`
}

function makeRecoveryCode() {
  return Array.from({ length: 5 }, () => randomText(5)).join('-')
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.get('Cookie') || '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name),
  )
}

function sessionHeader(token, maxAge = 60 * 60 * 24 * 30, secure = true) {
  return `${sessionCookie}=${token}; Path=/; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Max-Age=${maxAge}`
}

async function getUser(request, env) {
  if (!env.DB) return null
  const token = parseCookies(request)[sessionCookie]
  if (!token) return null
  const tokenHash = await sha256(token)
  return env.DB.prepare(`
    SELECT users.id, users.lino_id AS linoId, users.auth_type AS authType, users.created_at AS createdAt
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?1 AND sessions.expires_at > ?2
  `).bind(tokenHash, new Date().toISOString()).first()
}

async function createSession(env, userId) {
  const token = `${randomText(32)}${randomText(32)}`
  const tokenHash = await sha256(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(tokenHash, userId, expiresAt, now.toISOString()).run()
  return token
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
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''
          events.forEach((event) => {
            const line = event.split('\n').find((item) => item.startsWith('data:'))
            if (!line || line.slice(5).trim() === '[DONE]') return
            try {
              const payload = JSON.parse(line.slice(5).trim())
              const content = payload.choices?.[0]?.delta?.content
              if (content) controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify({ type: 'delta', content })}\n\n`))
            } catch {
              // Ignore a malformed provider chunk and continue streaming.
            }
          })
        }
        controller.enqueue(encoder.encode('event: done\ndata: {"type":"done"}\n\n'))
        controller.close()
      } catch {
        controller.enqueue(encoder.encode('event: error\ndata: {"type":"error","message":"provider_error"}\n\n'))
        controller.close()
      }
    },
    cancel() {
      reader.cancel()
    },
  })
}

async function callDeepSeek(env, messages, stream = false) {
  if (!env.DEEPSEEK_API_KEY) return null
  return fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      messages,
      stream,
      thinking: { type: 'disabled' },
      temperature: 0.72,
    }),
  })
}

async function authRoutes(request, env, url) {
  if (!env.DB) return jsonResponse(503, { error: 'cloud_storage_unavailable' })
  const secureCookie = url.protocol === 'https:'
  if (url.pathname === '/api/auth/session' && request.method === 'GET') {
    const user = await getUser(request, env)
    return user ? jsonResponse(200, { user }) : jsonResponse(401, { error: 'not_authenticated' })
  }

  if (url.pathname === '/api/auth/create' && request.method === 'POST') {
    const id = crypto.randomUUID()
    const linoId = makeLinoId()
    const recoveryCode = makeRecoveryCode()
    const recoveryHash = await sha256(recoveryCode)
    const now = new Date().toISOString()
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, lino_id, recovery_hash, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)').bind(id, linoId, recoveryHash, now),
      env.DB.prepare("INSERT INTO user_snapshots (user_id, chat_json, revision, updated_at) VALUES (?1, '{}', 1, ?2)").bind(id, now),
      env.DB.prepare("INSERT INTO user_settings (user_id, timezone, updated_at) VALUES (?1, 'Asia/Shanghai', ?2)").bind(id, now),
    ])
    const token = await createSession(env, id)
    return jsonResponse(201, { recoveryCode, user: { id, linoId, authType: 'recovery_card', createdAt: now } }, { 'Set-Cookie': sessionHeader(token, undefined, secureCookie) })
  }

  if (url.pathname === '/api/auth/restore' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const linoId = String(body.linoId || '').trim().toUpperCase()
    const recoveryCode = String(body.recoveryCode || '').trim().toUpperCase()
    const user = await env.DB.prepare('SELECT id, lino_id AS linoId, auth_type AS authType, created_at AS createdAt, recovery_hash AS recoveryHash FROM users WHERE lino_id = ?1')
      .bind(linoId).first()
    if (!user || user.recoveryHash !== await sha256(recoveryCode)) return jsonResponse(401, { error: 'invalid_recovery_card' })
    const token = await createSession(env, user.id)
    delete user.recoveryHash
    return jsonResponse(200, { user }, { 'Set-Cookie': sessionHeader(token, undefined, secureCookie) })
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = parseCookies(request)[sessionCookie]
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256(token)).run()
    return jsonResponse(200, { ok: true }, { 'Set-Cookie': sessionHeader('', 0, secureCookie) })
  }

  if (url.pathname === '/api/auth/account' && request.method === 'DELETE') {
    const user = await getUser(request, env)
    if (!user) return jsonResponse(401, { error: 'not_authenticated' })
    await env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(user.id).run()
    return jsonResponse(200, { ok: true }, { 'Set-Cookie': sessionHeader('', 0, secureCookie) })
  }
  return null
}

function mapLetter(letter) {
  return {
    id: letter.id,
    content: letter.content,
    createdAt: letter.created_at,
    delivery: letter.delivery,
    dueAt: letter.due_at,
    fontId: letter.font_id,
    localDate: letter.local_date,
    moodId: letter.mood_id,
    sentAt: letter.sent_at,
    stationeryId: letter.stationery_id,
    status: letter.status,
    updatedAt: letter.updated_at,
  }
}

function mapMood(mood) {
  return { id: mood.id, localDate: mood.local_date, moodId: mood.mood_id, note: mood.note, updatedAt: mood.updated_at }
}

function mapReply(reply) {
  return { id: reply.id, content: reply.content, createdAt: reply.created_at, letterDate: reply.letter_date, readAt: reply.read_at, replyDate: reply.reply_date }
}

async function readMailbox(env, userId, month = null) {
  const suffix = month ? ' AND local_date LIKE ?2' : ''
  const value = month ? `${month}%` : null
  const [lettersResult, moodsResult, repliesResult] = await Promise.all([
    env.DB.prepare(`SELECT * FROM letters WHERE user_id = ?1${suffix} ORDER BY created_at`).bind(...(month ? [userId, value] : [userId])).all(),
    env.DB.prepare(`SELECT * FROM moods WHERE user_id = ?1${suffix} ORDER BY local_date`).bind(...(month ? [userId, value] : [userId])).all(),
    env.DB.prepare(`SELECT * FROM replies WHERE user_id = ?1${month ? ' AND letter_date LIKE ?2' : ''} ORDER BY created_at`).bind(...(month ? [userId, value] : [userId])).all(),
  ])
  return {
    letters: lettersResult.results.map(mapLetter),
    moods: moodsResult.results.map(mapMood),
    replies: repliesResult.results.map(mapReply),
    settings: { timezone: 'Asia/Shanghai' },
    version: 1,
  }
}

async function syncRoutes(request, env, url) {
  if (!env.DB) return jsonResponse(503, { error: 'cloud_storage_unavailable' })
  const user = await getUser(request, env)
  if (!user) return jsonResponse(401, { error: 'not_authenticated' })

  if (url.pathname === '/api/sync' && request.method === 'GET') {
    const [snapshot, mailbox] = await Promise.all([
      env.DB.prepare('SELECT chat_json AS chatJson, revision, updated_at AS updatedAt FROM user_snapshots WHERE user_id = ?1').bind(user.id).first(),
      readMailbox(env, user.id),
    ])
    return jsonResponse(200, { chat: JSON.parse(snapshot?.chatJson || '{}'), mailbox, revision: snapshot?.revision || 1 })
  }

  if (url.pathname === '/api/sync' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    if (!body.chat || !body.mailbox || !Array.isArray(body.mailbox.letters) || !Array.isArray(body.mailbox.moods)) {
      return jsonResponse(400, { error: 'invalid_snapshot' })
    }
    const now = new Date().toISOString()
    const statements = [
      env.DB.prepare(`INSERT INTO user_snapshots (user_id, chat_json, revision, updated_at) VALUES (?1, ?2, 1, ?3)
        ON CONFLICT(user_id) DO UPDATE SET chat_json = excluded.chat_json, revision = revision + 1, updated_at = excluded.updated_at`)
        .bind(user.id, JSON.stringify(body.chat), now),
    ]
    for (const letterId of (body.mailbox.deletedLetterIds || []).slice(-1000)) {
      statements.push(env.DB.prepare('DELETE FROM letters WHERE id = ?1 AND user_id = ?2')
        .bind(String(letterId), user.id))
    }
    for (const mood of body.mailbox.moods.slice(-370)) {
      statements.push(env.DB.prepare(`INSERT INTO moods (id, user_id, local_date, mood_id, note, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(user_id, id) DO UPDATE SET local_date=excluded.local_date, mood_id=excluded.mood_id, note=excluded.note, updated_at=excluded.updated_at`)
        .bind(mood.id, user.id, mood.localDate, mood.moodId, String(mood.note || '').slice(0, 1000), mood.updatedAt || now))
    }
    for (const letter of body.mailbox.letters.slice(-1000)) {
      statements.push(env.DB.prepare(`INSERT INTO letters (id, user_id, local_date, mood_id, stationery_id, font_id, content, delivery, status, sent_at, due_at, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        ON CONFLICT(user_id, id) DO UPDATE SET mood_id=excluded.mood_id, stationery_id=excluded.stationery_id, font_id=excluded.font_id, content=excluded.content, delivery=excluded.delivery, status=CASE WHEN letters.status='replied' THEN letters.status ELSE excluded.status END, sent_at=excluded.sent_at, due_at=excluded.due_at, updated_at=excluded.updated_at`)
        .bind(letter.id, user.id, letter.localDate, letter.moodId, letter.stationeryId, letter.fontId, String(letter.content || '').slice(0, 8000), letter.delivery, letter.status, letter.sentAt, letter.dueAt, letter.createdAt || now, letter.updatedAt || now))
    }
    await env.DB.batch(statements)
    return jsonResponse(200, { ok: true, syncedAt: now })
  }

  if (url.pathname === '/api/moods' && request.method === 'GET') {
    const mailbox = await readMailbox(env, user.id, url.searchParams.get('month'))
    return jsonResponse(200, { moods: mailbox.moods })
  }
  if (url.pathname === '/api/moods' && request.method === 'POST') {
    const mood = await request.json().catch(() => null)
    if (!mood?.id || !mood?.localDate || !mood?.moodId) return jsonResponse(400, { error: 'invalid_mood' })
    const now = new Date().toISOString()
    await env.DB.prepare(`INSERT INTO moods (id, user_id, local_date, mood_id, note, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(user_id, id) DO UPDATE SET local_date=excluded.local_date, mood_id=excluded.mood_id, note=excluded.note, updated_at=excluded.updated_at`)
      .bind(String(mood.id), user.id, String(mood.localDate), String(mood.moodId), String(mood.note || '').slice(0, 1000), mood.updatedAt || now).run()
    return jsonResponse(201, { ok: true })
  }
  if (url.pathname === '/api/letters' && request.method === 'GET') {
    const mailbox = await readMailbox(env, user.id, url.searchParams.get('month'))
    return jsonResponse(200, { letters: mailbox.letters })
  }
  if (url.pathname === '/api/letters' && request.method === 'POST') {
    const letter = await request.json().catch(() => null)
    if (!letter?.id || !letter?.localDate || !letter?.content) return jsonResponse(400, { error: 'invalid_letter' })
    const now = new Date().toISOString()
    const delivery = letter.delivery === 'sent' ? 'sent' : 'kept'
    await env.DB.prepare(`INSERT INTO letters (id, user_id, local_date, mood_id, stationery_id, font_id, content, delivery, status, sent_at, due_at, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
      ON CONFLICT(user_id, id) DO UPDATE SET mood_id=excluded.mood_id, stationery_id=excluded.stationery_id, font_id=excluded.font_id, content=excluded.content, delivery=excluded.delivery, status=CASE WHEN letters.status='replied' THEN letters.status ELSE excluded.status END, sent_at=excluded.sent_at, due_at=excluded.due_at, updated_at=excluded.updated_at`)
      .bind(String(letter.id), user.id, String(letter.localDate), String(letter.moodId || 'mixed'), String(letter.stationeryId || 'cloud'), String(letter.fontId || 'clear'), String(letter.content).slice(0, 8000), delivery, delivery === 'sent' ? 'pending' : 'kept', delivery === 'sent' ? (letter.sentAt || now) : null, delivery === 'sent' ? letter.dueAt : null, letter.createdAt || now, letter.updatedAt || now).run()
    return jsonResponse(201, { ok: true })
  }
  const letterMatch = url.pathname.match(/^\/api\/letters\/([^/]+)$/)
  if (letterMatch && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM letters WHERE id = ?1 AND user_id = ?2').bind(decodeURIComponent(letterMatch[1]), user.id).run()
    return jsonResponse(200, { ok: true })
  }
  const sendLetterMatch = url.pathname.match(/^\/api\/letters\/([^/]+)\/send$/)
  if (sendLetterMatch && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const now = new Date().toISOString()
    await env.DB.prepare("UPDATE letters SET delivery='sent', status=CASE WHEN status='replied' THEN status ELSE 'pending' END, sent_at=?1, due_at=?2, updated_at=?1 WHERE id=?3 AND user_id=?4")
      .bind(now, body.dueAt || now, decodeURIComponent(sendLetterMatch[1]), user.id).run()
    return jsonResponse(200, { ok: true })
  }
  if (url.pathname === '/api/mailbox' && request.method === 'GET') {
    return jsonResponse(200, await readMailbox(env, user.id, url.searchParams.get('month')))
  }

  const replyMatch = url.pathname.match(/^\/api\/replies\/([^/]+)\/read$/)
  if (replyMatch && request.method === 'POST') {
    await env.DB.prepare('UPDATE replies SET read_at = ?1 WHERE id = ?2 AND user_id = ?3').bind(new Date().toISOString(), decodeURIComponent(replyMatch[1]), user.id).run()
    return jsonResponse(200, { ok: true })
  }
  return null
}

async function chatRoute(request, env) {
  if (!env.DEEPSEEK_API_KEY) return jsonResponse(503, { error: 'provider_unavailable' })
  const payload = await request.json().catch(() => null)
  if (!payload) return jsonResponse(400, { error: 'invalid_json' })
  const messages = sanitizeMessages(payload.messages)
  if (!messages.length) return jsonResponse(400, { error: 'messages_required' })
  const upstream = await callDeepSeek(env, [{ role: 'system', content: chatSystemPrompt }, ...messages], true).catch(() => null)
  if (!upstream?.ok || !upstream.body) return jsonResponse(502, { error: 'provider_error' })
  return new Response(sseStream(upstream), { headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'text/event-stream; charset=utf-8' } })
}

function chinaDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}

async function generateDueReplies(env, scheduledTime) {
  if (!env.DB || !env.DEEPSEEK_API_KEY) return
  const now = new Date(scheduledTime || Date.now())
  const replyDay = chinaDate(now)
  const usage = await env.DB.prepare('SELECT COUNT(*) AS count FROM replies WHERE reply_date = ?1').bind(replyDay).first()
  const remainingDailyCalls = Math.max(0, 60 - Number(usage?.count || 0))
  if (!remainingDailyCalls) return
  const dueGroups = await env.DB.prepare(`
    SELECT user_id AS userId, local_date AS localDate
    FROM letters
    WHERE delivery='sent' AND status='pending' AND due_at <= ?1
    GROUP BY user_id, local_date
    ORDER BY MIN(due_at)
    LIMIT ?2
  `).bind(now.toISOString(), Math.min(20, remainingDailyCalls)).all()

  for (const group of dueGroups.results) {
    const existing = await env.DB.prepare('SELECT id FROM replies WHERE user_id=?1 AND letter_date=?2').bind(group.userId, group.localDate).first()
    if (existing) continue
    const [letters, moods, snapshot] = await Promise.all([
      env.DB.prepare("SELECT content, mood_id FROM letters WHERE user_id=?1 AND local_date=?2 AND delivery='sent' ORDER BY sent_at").bind(group.userId, group.localDate).all(),
      env.DB.prepare('SELECT local_date, mood_id, note FROM moods WHERE user_id=?1 AND local_date<=?2 ORDER BY local_date DESC LIMIT 7').bind(group.userId, group.localDate).all(),
      env.DB.prepare('SELECT chat_json AS chatJson FROM user_snapshots WHERE user_id=?1').bind(group.userId).first(),
    ])
    const chat = JSON.parse(snapshot?.chatJson || '{}')
    const memories = Array.isArray(chat.manualMemories) ? chat.manualMemories.slice(0, 6).map((item) => item.content).filter(Boolean) : []
    const prompt = `日期：${group.localDate}\n当天来信：\n${letters.results.map((letter, index) => `${index + 1}. [${letter.mood_id}] ${letter.content}`).join('\n')}\n\n最近心情：\n${moods.results.map((mood) => `${mood.local_date}: ${mood.mood_id} ${mood.note || ''}`).join('\n')}\n\n用户固定记忆：\n${memories.join('\n') || '无'}`
    const response = await callDeepSeek(env, [{ role: 'system', content: letterSystemPrompt }, { role: 'user', content: prompt }]).catch(() => null)
    if (!response?.ok) continue
    const payload = await response.json().catch(() => null)
    const content = payload?.choices?.[0]?.message?.content?.trim()
    if (!content) continue
    const createdAt = new Date().toISOString()
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO replies (id, user_id, letter_date, reply_date, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(`reply-${crypto.randomUUID()}`, group.userId, group.localDate, chinaDate(now), content.slice(0, 6000), createdAt),
      env.DB.prepare("UPDATE letters SET status='replied', updated_at=?1 WHERE user_id=?2 AND local_date=?3 AND delivery='sent'")
        .bind(createdAt, group.userId, group.localDate),
    ])
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/auth/')) {
      return (await authRoutes(request, env, url)) ?? jsonResponse(404, { error: 'not_found' })
    }
    if (request.method === 'POST' && url.pathname === '/api/chat') return chatRoute(request, env)
    if (url.pathname.startsWith('/api/sync') || url.pathname.startsWith('/api/moods') || url.pathname.startsWith('/api/letters') || url.pathname.startsWith('/api/mailbox') || url.pathname.startsWith('/api/replies/')) {
      return (await syncRoutes(request, env, url)) ?? jsonResponse(404, { error: 'not_found' })
    }
    if (url.pathname.startsWith('/api/')) return jsonResponse(404, { error: 'not_found' })
    return env.ASSETS?.fetch(request) ?? jsonResponse(503, { error: 'assets_unavailable' })
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(generateDueReplies(env, controller.scheduledTime))
  },
}
