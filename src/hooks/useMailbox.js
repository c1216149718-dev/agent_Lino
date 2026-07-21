import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LEGACY_MAILBOX_STORAGE_KEY,
  MAILBOX_STORAGE_KEY,
  chinaDateKey,
  monthKey,
  nextReplyAt,
} from '../data/mailbox'

const legacyStationeryMap = {
  spring: 'spring-letter',
  cloud: 'bamboo-breeze',
  night: 'starry-journal',
  doodle: 'vintage-collage',
}
const validLegacyMoods = new Set(['happy', 'calm', 'sad'])

const emptyMailbox = {
  deletedLetterIds: [],
  letters: [],
  moods: [],
  replies: [],
  settings: { timezone: 'Asia/Shanghai' },
  version: 2,
}

function migrateLegacyPayload(old) {
  if (old?.version !== 1) return null
  try {
    return {
      ...emptyMailbox,
      deletedLetterIds: old.deletedLetterIds ?? [],
      letters: (old.letters ?? []).map((letter) => ({
        ...letter,
        moodId: validLegacyMoods.has(letter.moodId) ? letter.moodId : null,
        recipientSpiritId: 'lino',
        stationeryId: legacyStationeryMap[letter.stationeryId] ?? 'bamboo-breeze',
      })),
      moods: (old.moods ?? []).map((mood) => ({
        ...mood,
        moodId: validLegacyMoods.has(mood.moodId) ? mood.moodId : null,
        spiritId: 'lino',
      })),
      replies: (old.replies ?? []).map((reply) => ({ ...reply, spiritId: 'lino' })),
    }
  } catch {
    return null
  }
}

function migrateLegacy() {
  try {
    return migrateLegacyPayload(JSON.parse(window.localStorage.getItem(LEGACY_MAILBOX_STORAGE_KEY))) ?? emptyMailbox
  } catch {
    return emptyMailbox
  }
}

function loadMailbox() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MAILBOX_STORAGE_KEY))
    return stored?.version === 2 ? { ...emptyMailbox, ...stored } : migrateLegacy()
  } catch {
    return migrateLegacy()
  }
}

export function useMailbox() {
  const [data, setData] = useState(loadMailbox)

  useEffect(() => {
    try {
      window.localStorage.setItem(MAILBOX_STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Keep the current session usable when storage is unavailable.
    }
  }, [data])

  const saveLetter = useCallback(({ content, delivery, fontId, moodId, recipientSpiritId, stationeryId }) => {
    const cleanContent = content.trim()
    if (!cleanContent) return null
    const now = new Date()
    const localDate = chinaDateKey(now)
    const createdAt = now.toISOString()
    const spiritId = recipientSpiritId || 'lino'
    const letter = {
      id: `letter-${crypto.randomUUID()}`,
      content: cleanContent,
      createdAt,
      delivery,
      dueAt: delivery === 'sent' ? nextReplyAt(localDate) : null,
      fontId,
      localDate,
      moodId,
      recipientSpiritId: spiritId,
      sentAt: delivery === 'sent' ? createdAt : null,
      stationeryId,
      status: delivery === 'sent' ? 'pending' : 'kept',
      updatedAt: createdAt,
    }
    setData((current) => ({
      ...current,
      letters: [...current.letters, letter],
      moods: [
        ...current.moods.filter((item) => item.localDate !== localDate),
        { id: `mood-${localDate}`, localDate, moodId, note: cleanContent.slice(0, 120), spiritId, updatedAt: createdAt },
      ],
    }))
    return letter
  }, [])

  const saveMood = useCallback(({ moodId, note, spiritId }) => {
    const localDate = chinaDateKey()
    const updatedAt = new Date().toISOString()
    setData((current) => ({
      ...current,
      moods: [
        ...current.moods.filter((item) => item.localDate !== localDate),
        { id: `mood-${localDate}`, localDate, moodId, note: note.trim(), spiritId, updatedAt },
      ],
    }))
  }, [])

  const removeLetter = useCallback((letterId) => setData((current) => ({
    ...current,
    deletedLetterIds: [...new Set([...current.deletedLetterIds, letterId])],
    letters: current.letters.filter((letter) => letter.id !== letterId),
  })), [])

  const markReplyRead = useCallback((replyId) => setData((current) => ({
    ...current,
    replies: current.replies.map((reply) => reply.id === replyId ? { ...reply, readAt: new Date().toISOString() } : reply),
  })), [])

  const importData = useCallback((incoming) => {
    if (!incoming || !Array.isArray(incoming.letters)) return false
    const normalized = incoming.version === 1 ? migrateLegacyPayload(incoming) : incoming
    if (!normalized) return false
    setData({ ...emptyMailbox, ...normalized, version: 2 })
    return true
  }, [])
  const clearMailbox = useCallback(() => setData(emptyMailbox), [])
  const exportData = useCallback(() => data, [data])
  const todayMood = data.moods.find((mood) => mood.localDate === chinaDateKey()) ?? null
  const unreadReplies = data.replies.filter((reply) => !reply.readAt)

  return useMemo(() => ({
    ...data,
    clearMailbox,
    currentMonth: monthKey(),
    exportData,
    importData,
    markReplyRead,
    removeLetter,
    saveLetter,
    saveMood,
    todayMood,
    unreadReplies,
  }), [clearMailbox, data, exportData, importData, markReplyRead, removeLetter, saveLetter, saveMood, todayMood, unreadReplies])
}
