import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MAILBOX_STORAGE_KEY,
  chinaDateKey,
  monthKey,
  nextReplyAt,
} from '../data/mailbox'

const emptyMailbox = {
  deletedLetterIds: [],
  letters: [],
  moods: [],
  replies: [],
  settings: { timezone: 'Asia/Shanghai' },
  version: 1,
}

function loadMailbox() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MAILBOX_STORAGE_KEY))
    return stored?.version === 1 ? { ...emptyMailbox, ...stored } : emptyMailbox
  } catch {
    return emptyMailbox
  }
}

export function useMailbox() {
  const [data, setData] = useState(loadMailbox)

  useEffect(() => {
    try {
      window.localStorage.setItem(MAILBOX_STORAGE_KEY, JSON.stringify(data))
    } catch {
      // The mailbox remains usable for the current session.
    }
  }, [data])

  const saveLetter = useCallback(({ content, delivery, fontId, moodId, stationeryId }) => {
    const cleanContent = content.trim()
    if (!cleanContent) {
      return null
    }

    const now = new Date()
    const localDate = chinaDateKey(now)
    const createdAt = now.toISOString()
    const letter = {
      id: `letter-${crypto.randomUUID()}`,
      content: cleanContent,
      createdAt,
      delivery,
      dueAt: delivery === 'sent' ? nextReplyAt(localDate) : null,
      fontId,
      localDate,
      moodId,
      sentAt: delivery === 'sent' ? createdAt : null,
      stationeryId,
      status: delivery === 'sent' ? 'pending' : 'kept',
      updatedAt: createdAt,
    }

    setData((current) => {
      const mood = {
        id: `mood-${localDate}`,
        localDate,
        moodId,
        note: cleanContent.slice(0, 120),
        updatedAt: createdAt,
      }
      return {
        ...current,
        letters: [...current.letters, letter],
        moods: [...current.moods.filter((item) => item.localDate !== localDate), mood],
      }
    })
    return letter
  }, [])

  const removeLetter = useCallback((letterId) => {
    setData((current) => ({
      ...current,
      deletedLetterIds: [...new Set([...(current.deletedLetterIds ?? []), letterId])],
      letters: current.letters.filter((letter) => letter.id !== letterId),
    }))
  }, [])

  const markReplyRead = useCallback((replyId) => {
    const readAt = new Date().toISOString()
    setData((current) => ({
      ...current,
      replies: current.replies.map((reply) =>
        reply.id === replyId ? { ...reply, readAt } : reply,
      ),
    }))
  }, [])

  const importData = useCallback((incoming) => {
    if (!incoming || !Array.isArray(incoming.letters)) {
      return false
    }
    setData({ ...emptyMailbox, ...incoming, version: 1 })
    return true
  }, [])

  const clearMailbox = useCallback(() => setData(emptyMailbox), [])
  const exportData = useCallback(() => data, [data])

  const today = chinaDateKey()
  const todayMood = data.moods.find((mood) => mood.localDate === today) ?? null
  const unreadReplies = data.replies.filter((reply) => !reply.readAt)

  return useMemo(
    () => ({
      ...data,
      clearMailbox,
      currentMonth: monthKey(),
      exportData,
      importData,
      markReplyRead,
      removeLetter,
      saveLetter,
      todayMood,
      unreadReplies,
    }),
    [clearMailbox, data, exportData, importData, markReplyRead, removeLetter, saveLetter, todayMood, unreadReplies],
  )
}
