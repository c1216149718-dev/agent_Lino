import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BackgroundClouds } from './components/BackgroundClouds'
import { ChatStage } from './components/ChatStage'
import { IdleStage } from './components/IdleStage'
import { useStoredChat } from './hooks/useStoredChat'

function App() {
  const prefersReducedMotion = useReducedMotion()
  const [stage, setStage] = useState('idle')
  const [isEntering, setIsEntering] = useState(false)
  const pendingMessageRef = useRef('')
  const chat = useStoredChat()
  const sendMessageRef = useRef(chat.sendMessage)

  useEffect(() => {
    sendMessageRef.current = chat.sendMessage
  }, [chat.sendMessage])

  const enterChat = useCallback(
    (message) => {
      const cleanMessage = message.trim()

      if (prefersReducedMotion) {
        setStage('chat')
        if (cleanMessage) {
          chat.sendMessage(cleanMessage)
        }
        return
      }

      pendingMessageRef.current = cleanMessage
      setIsEntering(true)
      setStage('chat')
    },
    [chat, prefersReducedMotion],
  )

  useEffect(() => {
    if (!isEntering) {
      return undefined
    }

    const messageTimer = window.setTimeout(() => {
      const pendingMessage = pendingMessageRef.current
      pendingMessageRef.current = ''
      if (pendingMessage) {
        sendMessageRef.current(pendingMessage)
      }
    }, 560)
    const completeTimer = window.setTimeout(() => setIsEntering(false), 900)

    return () => {
      window.clearTimeout(messageTimer)
      window.clearTimeout(completeTimer)
    }
  }, [isEntering])

  return (
    <main
      className="cloud-field relative min-h-svh overflow-hidden text-neutral-950"
      id="main-content"
    >
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-neutral-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href="#main-content"
      >
        跳到主要内容
      </a>
      <BackgroundClouds />
      <AnimatePresence mode="sync">
        {stage === 'idle' ? (
          <IdleStage key="idle" onBegin={enterChat} />
        ) : (
          <ChatStage key="chat" chat={chat} isEntering={isEntering} />
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
