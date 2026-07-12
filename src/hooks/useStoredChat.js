import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  agentStateOptions,
  createInitialMessages,
  initialMemories,
} from '../data/seed'
import { requestAssistantReply } from '../services/assistantService'

const validAgentStateIds = new Set(agentStateOptions.map((option) => option.id))
const legacyAgentStates = {
  angry: 'proud',
  sad: 'shy',
}

function createMessage(role, content) {
  return {
    id: `${role}-${crypto.randomUUID()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

function resolveAgentState(agentState) {
  const normalizedState = legacyAgentStates[agentState] ?? agentState
  return validAgentStateIds.has(normalizedState) ? normalizedState : 'idle'
}

function getTurnReplyId(messages, userMessageId) {
  const userIndex = messages.findIndex((message) => message.id === userMessageId)
  const followingMessage = messages[userIndex + 1]
  return followingMessage?.role === 'assistant' ? followingMessage.id : null
}

function isValidMessage(message) {
  return (
    message &&
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string'
  )
}

function insertAssistantMessage(messages, userMessageId, assistantMessage) {
  const userIndex = messages.findIndex((message) => message.id === userMessageId)
  return userIndex === -1
    ? [...messages, assistantMessage]
    : [
        ...messages.slice(0, userIndex + 1),
        assistantMessage,
        ...messages.slice(userIndex + 1),
      ]
}

function createModelHistory(messages, userMessageId) {
  const userIndex = messages.findIndex((message) => message.id === userMessageId)
  return messages
    .slice(0, userIndex + 1)
    .filter((message) => message.content.trim())
    .map(({ content, role }) => ({ content, role }))
}

function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
      if (!legacyRaw) {
        return null
      }

      const legacy = JSON.parse(legacyRaw)
      if (legacy?.version !== 1 || !Array.isArray(legacy.messages)) {
        return null
      }

      return {
        agentState: 'idle',
        memories: Array.isArray(legacy.memories) ? legacy.memories : initialMemories,
        messages: legacy.messages,
      }
    }

    const parsed = JSON.parse(raw)
    if (![2, 3, 4].includes(parsed?.version) || !Array.isArray(parsed.messages)) {
      return null
    }

    return {
      agentState: resolveAgentState(parsed.agentState),
      favoriteMessageIds: Array.isArray(parsed.favoriteMessageIds)
        ? parsed.favoriteMessageIds
        : [],
      hiddenMemoryMessageIds: Array.isArray(parsed.hiddenMemoryMessageIds)
        ? parsed.hiddenMemoryMessageIds
        : [],
      manualMemories: Array.isArray(parsed.manualMemories) ? parsed.manualMemories : [],
      messages: parsed.messages,
      memories: Array.isArray(parsed.memories) ? parsed.memories : initialMemories,
    }
  } catch {
    return null
  }
}

export function useStoredChat() {
  const storedState = useMemo(() => loadStoredState(), [])
  const [messages, setMessages] = useState(
    () => storedState?.messages ?? createInitialMessages(),
  )
  const [agentState, setAgentState] = useState(
    () => storedState?.agentState ?? 'idle',
  )
  const [memories, setMemories] = useState(
    () => storedState?.memories ?? initialMemories,
  )
  const [favoriteMessageIds, setFavoriteMessageIds] = useState(
    () => storedState?.favoriteMessageIds ?? [],
  )
  const [hiddenMemoryMessageIds, setHiddenMemoryMessageIds] = useState(
    () => storedState?.hiddenMemoryMessageIds ?? [],
  )
  const [manualMemories, setManualMemories] = useState(
    () => storedState?.manualMemories ?? [],
  )
  const [isResponding, setIsResponding] = useState(false)
  const [connectionNotice, setConnectionNotice] = useState('')
  const abortControllerRef = useRef(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 4,
          messages,
          agentState,
          favoriteMessageIds,
          hiddenMemoryMessageIds,
          manualMemories,
          memories: memories.slice(0, 4),
        }),
      )
    } catch {
      // localStorage may be unavailable in private browsing or locked contexts.
    }
  }, [agentState, favoriteMessageIds, hiddenMemoryMessageIds, manualMemories, memories, messages])

  const requestReply = useCallback(
    (content, userMessageId, history) => {
      const controller = new AbortController()
      const assistantMessage = createMessage('assistant', '')
      abortControllerRef.current = controller
      setConnectionNotice('')
      setAgentState('thinking')
      setIsResponding(true)
      setMessages((currentMessages) =>
        insertAssistantMessage(currentMessages, userMessageId, assistantMessage),
      )

      void requestAssistantReply({ agentState, content, messages: history, onDelta: (delta) => {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: `${message.content}${delta}` }
              : message,
          ),
        )
      }, signal: controller.signal })
        .then((reply) => {
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content || reply.content, source: reply.source }
                : message,
            ),
          )
          if (reply.source === 'local-mock') {
            setConnectionNotice('DeepSeek 暂不可用，已切换为本地模拟回复。')
          }
          setAgentState('proud')
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            setMessages((currentMessages) =>
              currentMessages.filter(
                (message) => message.id !== assistantMessage.id || Boolean(message.content),
              ),
            )
            setAgentState('idle')
            return
          }

          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: '我这边暂时没有整理好回应。你可以再发一次，我会重新处理。', source: 'error' }
                : message,
            ),
          )
          setConnectionNotice('连接暂时中断，请稍后重试。')
          setAgentState('idle')
        })
        .finally(() => {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null
            setIsResponding(false)
          }
        })
    },
    [agentState],
  )

  const sendMessage = useCallback(
    (content) => {
      const cleanContent = content.trim()
      if (!cleanContent || isResponding) {
        return undefined
      }

      const userMessage = createMessage('user', cleanContent)

      setMessages((currentMessages) => [...currentMessages, userMessage])
      setMemories((currentMemories) => {
        const nextMemory = `刚刚聊到：${cleanContent.slice(0, 22)}${
          cleanContent.length > 22 ? '...' : ''
        }`
        return [nextMemory, ...currentMemories].slice(0, 4)
      })
      requestReply(cleanContent, userMessage.id, [
        ...messages,
        userMessage,
      ].map(({ content: messageContent, role }) => ({ content: messageContent, role })))

      return userMessage.id
    },
    [isResponding, messages, requestReply],
  )

  const editAndRegenerate = useCallback(
    (messageId, content) => {
      const cleanContent = content.trim()
      const message = messages.find((item) => item.id === messageId)
      if (!cleanContent || isResponding || message?.role !== 'user') {
        return false
      }

      const replyMessageId = getTurnReplyId(messages, messageId)
      setMessages((currentMessages) =>
        currentMessages
          .map((item) => (item.id === messageId ? { ...item, content: cleanContent } : item))
          .filter((item) => item.id !== replyMessageId),
      )
      if (replyMessageId) {
        setFavoriteMessageIds((currentIds) => currentIds.filter((id) => id !== replyMessageId))
      }
      const nextMessages = messages
        .map((item) => (item.id === messageId ? { ...item, content: cleanContent } : item))
        .filter((item) => item.id !== replyMessageId)
      requestReply(cleanContent, messageId, createModelHistory(nextMessages, messageId))
      return true
    },
    [isResponding, messages, requestReply],
  )

  const retryAssistantReply = useCallback(
    (userMessageId) => {
      const userMessage = messages.find((message) => message.id === userMessageId)
      if (isResponding || userMessage?.role !== 'user') {
        return false
      }

      const replyMessageId = getTurnReplyId(messages, userMessageId)
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== replyMessageId),
      )
      if (replyMessageId) {
        setFavoriteMessageIds((currentIds) => currentIds.filter((id) => id !== replyMessageId))
      }
      const nextMessages = messages.filter((message) => message.id !== replyMessageId)
      requestReply(userMessage.content, userMessageId, createModelHistory(nextMessages, userMessageId))
      return true
    },
    [isResponding, messages, requestReply],
  )

  const toggleFavoriteMessage = useCallback((messageId) => {
    setFavoriteMessageIds((currentIds) =>
      currentIds.includes(messageId)
        ? currentIds.filter((id) => id !== messageId)
        : [...currentIds, messageId],
    )
  }, [])

  const addMemory = useCallback((content) => {
    const cleanContent = content.trim()
    if (!cleanContent) {
      return false
    }

    setManualMemories((currentMemories) => [
      { id: `memory-${crypto.randomUUID()}`, content: cleanContent },
      ...currentMemories,
    ])
    return true
  }, [])

  const hideMemoryMessage = useCallback((messageId) => {
    setHiddenMemoryMessageIds((currentIds) =>
      currentIds.includes(messageId) ? currentIds : [...currentIds, messageId],
    )
  }, [])

  const removeManualMemory = useCallback((memoryId) => {
    setManualMemories((currentMemories) =>
      currentMemories.filter((memory) => memory.id !== memoryId),
    )
  }, [])

  const clearBasicMemories = useCallback(() => {
    setManualMemories([])
    setHiddenMemoryMessageIds(messages.filter((message) => message.role === 'user').map((message) => message.id))
  }, [messages])

  const removeFavoriteMemory = useCallback(
    (userMessageId) => {
      const replyMessageId = getTurnReplyId(messages, userMessageId)
      if (replyMessageId) {
        setFavoriteMessageIds((currentIds) => currentIds.filter((id) => id !== replyMessageId))
      }
    },
    [messages],
  )

  const clearFavoriteMemories = useCallback(() => setFavoriteMessageIds([]), [])

  const cancelReply = useCallback(() => abortControllerRef.current?.abort(), [])

  const exportLocalData = useCallback(
    () =>
      JSON.stringify({
        version: 4,
        messages,
        agentState,
        favoriteMessageIds,
        hiddenMemoryMessageIds,
        manualMemories,
        memories: memories.slice(0, 4),
      }),
    [agentState, favoriteMessageIds, hiddenMemoryMessageIds, manualMemories, memories, messages],
  )

  const importLocalData = useCallback((rawData) => {
    try {
      const imported = JSON.parse(rawData)
      if (!Array.isArray(imported?.messages) || !imported.messages.every(isValidMessage)) {
        return false
      }

      setMessages(imported.messages)
      setAgentState(resolveAgentState(imported.agentState))
      setFavoriteMessageIds(Array.isArray(imported.favoriteMessageIds) ? imported.favoriteMessageIds : [])
      setHiddenMemoryMessageIds(
        Array.isArray(imported.hiddenMemoryMessageIds) ? imported.hiddenMemoryMessageIds : [],
      )
      setManualMemories(Array.isArray(imported.manualMemories) ? imported.manualMemories : [])
      setMemories(Array.isArray(imported.memories) ? imported.memories : initialMemories)
      return true
    } catch {
      return false
    }
  }, [])

  const resetChat = useCallback(() => {
    setMessages(createInitialMessages())
    setAgentState('idle')
    setMemories(initialMemories)
    setFavoriteMessageIds([])
    setHiddenMemoryMessageIds([])
    setManualMemories([])
  }, [])

  const clearLocalData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // The reset below keeps the UI usable when storage access is restricted.
    }
    setMessages(createInitialMessages())
    setAgentState('idle')
    setMemories(initialMemories)
    setFavoriteMessageIds([])
    setHiddenMemoryMessageIds([])
    setManualMemories([])
  }, [])

  return useMemo(
    () => ({
      isResponding,
      connectionNotice,
      cancelReply,
      memories,
      messages,
      agentState,
      editAndRegenerate,
      addMemory,
      clearBasicMemories,
      clearFavoriteMemories,
      clearLocalData,
      exportLocalData,
      favoriteMessageIds,
      hiddenMemoryMessageIds,
      importLocalData,
      manualMemories,
      hideMemoryMessage,
      removeFavoriteMemory,
      removeManualMemory,
      resetChat,
      retryAssistantReply,
      sendMessage,
      setAgentState,
      toggleFavoriteMessage,
    }),
    [
      agentState,
      addMemory,
      clearBasicMemories,
      clearFavoriteMemories,
      cancelReply,
      clearLocalData,
      connectionNotice,
      editAndRegenerate,
      exportLocalData,
      favoriteMessageIds,
      hiddenMemoryMessageIds,
      hideMemoryMessage,
      importLocalData,
      isResponding,
      manualMemories,
      memories,
      messages,
      resetChat,
      retryAssistantReply,
      removeFavoriteMemory,
      removeManualMemory,
      sendMessage,
      toggleFavoriteMessage,
    ],
  )
}
