import { expect, test } from '@playwright/test'
import worker from '../server/sites-worker.mjs'

function createDatabaseDouble() {
  const state = { replies: [] }
  return {
    state,
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) {
          this.args = args
          return this
        },
        async first() {
          if (sql.includes('COUNT(*) AS count')) return { count: state.replies.length }
          if (sql.includes('SELECT id FROM replies')) {
            return state.replies.find((reply) => reply.userId === this.args[0] && reply.letterDate === this.args[1]) || null
          }
          if (sql.includes('chat_json AS chatJson')) return { chatJson: '{"manualMemories":[{"content":"用户喜欢安静的早晨"}]}' }
          return null
        },
        async all() {
          if (sql.includes('GROUP BY user_id, local_date')) return { results: [{ userId: 'user-1', localDate: '2026-07-18' }] }
          if (sql.includes('SELECT content, mood_id FROM letters')) return { results: [{ content: '今天很累，但我完成了任务。', mood_id: 'tired' }] }
          if (sql.includes('SELECT local_date, mood_id, note FROM moods')) return { results: [{ local_date: '2026-07-18', mood_id: 'tired', note: '需要休息' }] }
          return { results: [] }
        },
      }
    },
    async batch(statements) {
      const insert = statements.find((statement) => statement.sql.includes('INSERT OR IGNORE INTO replies'))
      if (insert && !state.replies.some((reply) => reply.userId === 'user-1' && reply.letterDate === '2026-07-18')) {
        state.replies.push({ userId: 'user-1', letterDate: '2026-07-18', content: insert.args[4] })
      }
      return statements.map(() => ({ success: true }))
    },
  }
}

test('scheduled retries create one merged reply and remain idempotent', async () => {
  const database = createDatabaseDouble()
  const originalFetch = globalThis.fetch
  let modelCalls = 0
  globalThis.fetch = async () => {
    modelCalls += 1
    return new Response(JSON.stringify({ choices: [{ message: { content: '我看见你今天的疲惫，也看见你仍然完成了重要的事。今晚先让自己歇一会儿。' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const run = async () => {
      let pending
      await worker.scheduled(
        { scheduledTime: Date.parse('2026-07-19T00:00:00.000Z') },
        { DB: database, DEEPSEEK_API_KEY: 'test-key', DEEPSEEK_MODEL: 'deepseek-v4-flash' },
        { waitUntil: (promise) => { pending = promise } },
      )
      await pending
    }

    await run()
    await run()

    expect(modelCalls).toBe(1)
    expect(database.state.replies).toHaveLength(1)
    expect(database.state.replies[0].content).toContain('我看见你今天的疲惫')
  } finally {
    globalThis.fetch = originalFetch
  }
})
