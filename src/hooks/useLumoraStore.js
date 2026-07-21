import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SPIRIT_IDS } from '../data/lumora'
import { requestConversationSummary, requestSpiritReply } from '../services/lumoraService'

const STORAGE_KEY = 'lumora-home:v1'
const LEGACY_KEY = 'lino-home:v2'

function nowIso() {
  return new Date().toISOString()
}

function createConversation(spiritId, context = null) {
  const timestamp = nowIso()
  return {
    id: `conversation-${crypto.randomUUID()}`,
    spiritId,
    title: '新的对话',
    status: 'active',
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    closedAt: null,
    deletedAt: null,
    continuedFromId: context?.continuedFromId ?? null,
    contextSummary: context?.contextSummary ?? '',
  }
}

function createMessage(role, content) {
  return { id: `${role}-${crypto.randomUUID()}`, role, content, createdAt: nowIso() }
}

function memoryContextFromState(state) {
  return [
    ...state.sharedMemories.map((memory) => ({ kind: 'fixed', content: memory.content })),
    ...state.conversationMemories.map((memory) => ({
      kind: 'conversation-summary',
      spiritId: memory.spiritId,
      title: memory.title,
      content: memory.summary,
    })),
  ].slice(-12)
}

function createEmptyState() {
  return {
    version: 1,
    onboardingComplete: false,
    selectedSpiritId: null,
    conversations: [],
    activeBySpirit: {},
    conversationMemories: [],
    sharedMemories: [],
    favoriteMessageIds: [],
    deletedConversationIds: [],
  }
}

function migrateLegacyPayload(legacy) {
  if (!legacy?.messages?.length) return null
  try {
    const conversation = createConversation('lino')
    conversation.messages = legacy.messages.filter((message) => message?.content && ['user', 'assistant'].includes(message.role))
    conversation.status = 'archived'
    conversation.title = '与 Lino 的旧对话'
    conversation.closedAt = nowIso()
    return {
      ...createEmptyState(),
      onboardingComplete: true,
      selectedSpiritId: 'lino',
      conversations: [conversation],
      activeBySpirit: {},
      sharedMemories: Array.isArray(legacy.manualMemories) ? legacy.manualMemories : [],
      favoriteMessageIds: Array.isArray(legacy.favoriteMessageIds) ? legacy.favoriteMessageIds : [],
    }
  } catch {
    return null
  }
}

function migrateLegacy() {
  try {
    return migrateLegacyPayload(JSON.parse(window.localStorage.getItem(LEGACY_KEY)))
  } catch {
    return null
  }
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (parsed?.version === 1 && Array.isArray(parsed.conversations)) return parsed
  } catch {
    // Continue with legacy migration or a fresh state.
  }
  return migrateLegacy() ?? createEmptyState()
}

export function useLumoraStore() {
  const [state, setState] = useState(loadState)
  const [isResponding, setIsResponding] = useState(false)
  const [connectionNotice, setConnectionNotice] = useState('')
  const [lastDeleted, setLastDeleted] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Keep the current session usable when storage is unavailable.
    }
  }, [state])

  const visibleConversations = useMemo(
    () => state.conversations.filter((conversation) => !conversation.deletedAt),
    [state.conversations],
  )

  const conversationsBySpirit = useMemo(() => Object.fromEntries(
    SPIRIT_IDS.map((spiritId) => [
      spiritId,
      visibleConversations
        .filter((conversation) => conversation.spiritId === spiritId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ]),
  ), [visibleConversations])

  const activeConversationId = state.selectedSpiritId
    ? state.activeBySpirit[state.selectedSpiritId] ?? null
    : null
  const activeConversation = visibleConversations.find((item) => item.id === activeConversationId) ?? null
  const messages = activeConversation?.messages ?? []

  const selectSpirit = useCallback((spiritId, { create = false } = {}) => {
    if (!SPIRIT_IDS.includes(spiritId)) return null
    let nextId = null
    setState((current) => {
      const next = { ...current, onboardingComplete: true, selectedSpiritId: spiritId }
      if (create && !current.activeBySpirit[spiritId]) {
        const conversation = createConversation(spiritId)
        nextId = conversation.id
        next.conversations = [...current.conversations, conversation]
        next.activeBySpirit = { ...current.activeBySpirit, [spiritId]: conversation.id }
      }
      return next
    })
    return nextId
  }, [])

  const openConversation = useCallback((conversationId) => {
    setState((current) => {
      const conversation = current.conversations.find((item) => item.id === conversationId && !item.deletedAt)
      if (!conversation) return current
      return {
        ...current,
        selectedSpiritId: conversation.spiritId,
        activeBySpirit: { ...current.activeBySpirit, [conversation.spiritId]: conversation.id },
      }
    })
  }, [])

  const finishSummary = useCallback(async (conversation) => {
    const memory = await requestConversationSummary({ conversation })
    setState((current) => {
      const storedConversation = current.conversations.find((item) => item.id === conversation.id)
      if (!storedConversation || storedConversation.deletedAt) return current
      return {
        ...current,
        conversations: current.conversations.map((item) =>
          item.id === conversation.id ? { ...item, title: memory.title || item.title, organizing: false } : item,
        ),
        conversationMemories: [
          ...current.conversationMemories.filter((item) => item.conversationId !== conversation.id),
          memory,
        ],
      }
    })
  }, [])

  const newConversation = useCallback((spiritId = state.selectedSpiritId, context = null) => {
    if (!SPIRIT_IDS.includes(spiritId) || isResponding) return null
    const nextConversation = createConversation(spiritId, context)
    const currentId = state.activeBySpirit[spiritId]
    const existing = state.conversations.find((item) => item.id === currentId && !item.deletedAt)
    const timestamp = nowIso()
    const closingConversation = existing?.messages.length
      ? { ...existing, status: 'archived', closedAt: timestamp, updatedAt: timestamp, organizing: true }
      : null
    setState((current) => {
      const conversations = current.conversations.map((item) => {
        if (item.id !== closingConversation?.id) return item
        return closingConversation
      })
      return {
        ...current,
        onboardingComplete: true,
        selectedSpiritId: spiritId,
        conversations: [...conversations.filter((item) => item.id !== existing?.id || existing.messages.length), nextConversation],
        activeBySpirit: { ...current.activeBySpirit, [spiritId]: nextConversation.id },
      }
    })
    if (closingConversation) void finishSummary(closingConversation)
    return nextConversation.id
  }, [finishSummary, isResponding, state.activeBySpirit, state.conversations, state.selectedSpiritId])

  const updateMessages = useCallback((conversationId, updater) => {
    setState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, messages: updater(conversation.messages), updatedAt: nowIso() }
          : conversation,
      ),
    }))
  }, [])

  const requestReply = useCallback((conversation, userMessageId, history) => {
    const assistant = createMessage('assistant', '')
    const controller = new AbortController()
    abortRef.current = controller
    setIsResponding(true)
    setConnectionNotice('')
    updateMessages(conversation.id, (current) => [...current, assistant])
    void requestSpiritReply({
      conversationId: conversation.id,
      memoryContext: memoryContextFromState(state),
      messages: history,
      spiritId: conversation.spiritId,
      signal: controller.signal,
      onDelta: (delta) => updateMessages(conversation.id, (current) => current.map((message) =>
        message.id === assistant.id ? { ...message, content: `${message.content}${delta}` } : message,
      )),
    }).then((reply) => {
      updateMessages(conversation.id, (current) => current.map((message) =>
        message.id === assistant.id ? { ...message, content: message.content || reply.content, source: reply.source } : message,
      ))
      if (reply.source === 'local-mock') setConnectionNotice('DeepSeek 暂时不可用，当前为本地陪伴模式。')
    }).catch((error) => {
      if (error.name === 'AbortError') {
        updateMessages(conversation.id, (current) => current.filter((message) => message.id !== assistant.id || message.content))
      } else {
        updateMessages(conversation.id, (current) => current.map((message) =>
          message.id === assistant.id ? { ...message, content: '这次回应没有顺利抵达。你可以点重试，我会重新整理。', source: 'error' } : message,
        ))
      }
    }).finally(() => {
      if (abortRef.current === controller) abortRef.current = null
      setIsResponding(false)
    })
    return userMessageId
  }, [state, updateMessages])

  const sendMessage = useCallback((content, target = null) => {
    const clean = content.trim()
    if (!clean || isResponding) return null
    let conversation = target?.conversationId
      ? state.conversations.find((item) => item.id === target.conversationId) ?? { ...createConversation(target.spiritId || 'lino'), id: target.conversationId }
      : activeConversation
    if (!conversation || conversation.status !== 'active') {
      const id = newConversation(state.selectedSpiritId || 'lino')
      conversation = createConversation(state.selectedSpiritId || 'lino')
      conversation.id = id
    }
    const userMessage = createMessage('user', clean)
    updateMessages(conversation.id, (current) => [...current, userMessage])
    const history = [...conversation.messages, userMessage].map(({ role, content: messageContent }) => ({ role, content: messageContent }))
    requestReply(conversation, userMessage.id, history)
    return userMessage.id
  }, [activeConversation, isResponding, newConversation, requestReply, state.conversations, state.selectedSpiritId, updateMessages])

  const retryReply = useCallback((userMessageId) => {
    if (!activeConversation || isResponding) return false
    const index = activeConversation.messages.findIndex((message) => message.id === userMessageId && message.role === 'user')
    if (index < 0) return false
    const nextMessages = activeConversation.messages.filter((_, messageIndex) => messageIndex !== index + 1)
    updateMessages(activeConversation.id, () => nextMessages)
    const history = nextMessages.slice(0, index + 1).map(({ role, content }) => ({ role, content }))
    requestReply(activeConversation, userMessageId, history)
    return true
  }, [activeConversation, isResponding, requestReply, updateMessages])

  const editAndRegenerate = useCallback((userMessageId, content) => {
    if (!activeConversation || isResponding || !content.trim()) return false
    const index = activeConversation.messages.findIndex((message) => message.id === userMessageId && message.role === 'user')
    if (index < 0) return false
    const nextMessages = activeConversation.messages
      .map((message) => message.id === userMessageId ? { ...message, content: content.trim() } : message)
      .filter((_, messageIndex) => messageIndex !== index + 1)
    updateMessages(activeConversation.id, () => nextMessages)
    requestReply(activeConversation, userMessageId, nextMessages.slice(0, index + 1).map(({ role, content: value }) => ({ role, content: value })))
    return true
  }, [activeConversation, isResponding, requestReply, updateMessages])

  const toggleFavoriteMessage = useCallback((messageId) => setState((current) => ({
    ...current,
    favoriteMessageIds: current.favoriteMessageIds.includes(messageId)
      ? current.favoriteMessageIds.filter((id) => id !== messageId)
      : [...current.favoriteMessageIds, messageId],
  })), [])

  const continueConversation = useCallback((conversationId) => {
    const original = visibleConversations.find((item) => item.id === conversationId)
    const memory = state.conversationMemories.find((item) => item.conversationId === conversationId)
    if (!original) return null
    return newConversation(original.spiritId, { continuedFromId: original.id, contextSummary: memory?.summary || original.title })
  }, [newConversation, state.conversationMemories, visibleConversations])

  const deleteConversation = useCallback((conversationId) => {
    let deleted = null
    setState((current) => {
      const timestamp = nowIso()
      const conversation = current.conversations.find((item) => item.id === conversationId && !item.deletedAt)
      if (!conversation) return current
      const memory = current.conversationMemories.find((item) => item.conversationId === conversationId) ?? null
      deleted = { conversation, memory }
      const messageIds = new Set(conversation.messages.map((message) => message.id))
      const isActive = current.activeBySpirit[conversation.spiritId] === conversationId
      const replacement = isActive ? createConversation(conversation.spiritId) : null
      return {
        ...current,
        conversations: [
          ...current.conversations.map((item) => item.id === conversationId ? { ...item, deletedAt: timestamp } : item),
          ...(replacement ? [replacement] : []),
        ],
        conversationMemories: current.conversationMemories.filter((item) => item.conversationId !== conversationId),
        favoriteMessageIds: current.favoriteMessageIds.filter((id) => !messageIds.has(id)),
        deletedConversationIds: [...new Set([...current.deletedConversationIds, conversationId])],
        activeBySpirit: isActive
          ? { ...current.activeBySpirit, [conversation.spiritId]: replacement.id }
          : current.activeBySpirit,
      }
    })
    if (deleted) setLastDeleted(deleted)
    return Boolean(deleted)
  }, [])

  const restoreLastDeleted = useCallback(() => {
    if (!lastDeleted) return false
    setState((current) => ({
      ...current,
      conversations: current.conversations.map((item) => item.id === lastDeleted.conversation.id ? lastDeleted.conversation : item),
      conversationMemories: lastDeleted.memory ? [...current.conversationMemories, lastDeleted.memory] : current.conversationMemories,
      deletedConversationIds: current.deletedConversationIds.filter((id) => id !== lastDeleted.conversation.id),
    }))
    setLastDeleted(null)
    return true
  }, [lastDeleted])

  const addMemory = useCallback((content) => {
    if (!content.trim()) return false
    setState((current) => ({
      ...current,
      sharedMemories: [{ id: `fixed-${crypto.randomUUID()}`, content: content.trim(), createdAt: nowIso() }, ...current.sharedMemories],
    }))
    return true
  }, [])

  const removeManualMemory = useCallback((memoryId) => setState((current) => ({
    ...current,
    sharedMemories: current.sharedMemories.filter((memory) => memory.id !== memoryId),
  })), [])

  const cancelReply = useCallback(() => abortRef.current?.abort(), [])
  const exportLocalData = useCallback(() => JSON.stringify(state), [state])
  const importLocalData = useCallback((raw) => {
    try {
      const incoming = typeof raw === 'string' ? JSON.parse(raw) : raw
      const normalized = incoming?.version === 1 && Array.isArray(incoming.conversations)
        ? incoming
        : migrateLegacyPayload(incoming)
      if (!normalized) return false
      setState(normalized)
      return true
    } catch {
      return false
    }
  }, [])
  const clearLocalData = useCallback(() => setState(createEmptyState()), [])

  return {
    ...state,
    activeConversation,
    activeConversationId,
    cancelReply,
    connectionNotice,
    conversationsBySpirit,
    continueConversation,
    deleteConversation,
    editAndRegenerate,
    exportLocalData,
    favoriteMessageIds: state.favoriteMessageIds,
    importLocalData,
    isResponding,
    lastDeleted,
    manualMemories: state.sharedMemories,
    memories: state.conversationMemories,
    messages,
    newConversation,
    openConversation,
    removeManualMemory,
    restoreLastDeleted,
    retryAssistantReply: retryReply,
    selectSpirit,
    sendMessage,
    sharedMemories: state.sharedMemories,
    toggleFavoriteMessage,
    addMemory,
    clearLocalData,
  }
}
