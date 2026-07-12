import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  ChevronRight,
  Download,
  History,
  Lock,
  Menu,
  MessageCircle,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Smile,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { suggestedPrompts } from '../data/seed'
import { BentoCard } from './BentoCard'
import { Composer } from './Composer'
import { LinoMascot } from './LinoMascot'
import { ConversationActions, MessageBubble } from './MessageBubble'

const ambientStates = [
  'idle',
  'idle',
  'idle',
  'idle',
  'happy',
  'playful',
  'curious',
  'shy',
  'surprised',
  'thinking',
  'proud',
  'sleepy',
]

const deskViews = [
  { id: 'chat', label: '对话', icon: MessageCircle },
  { id: 'mood', label: '情绪', icon: Smile },
  { id: 'memory', label: '记忆', icon: Archive },
  { id: 'actions', label: '行动', icon: Sparkles },
  { id: 'local', label: '本地', icon: ShieldCheck },
]

const moodFaces = [
  { id: 'idle', label: '平静', displayLabel: 'calm', hint: '缓慢呼吸，安静等你开口。' },
  { id: 'happy', label: '高兴', displayLabel: 'happy', hint: '开心弹跳，接住你的好消息。' },
  { id: 'playful', label: '顽皮', displayLabel: 'playful', hint: '眨眨眼，轻轻歪向一边。' },
  { id: 'curious', label: '好奇', displayLabel: 'curious', hint: '托腮观察，认真听你继续说。' },
  { id: 'shy', label: '害羞', displayLabel: 'shy', hint: '双手收拢，小幅左右摆动。' },
  { id: 'surprised', label: '惊讶', displayLabel: 'surprised', hint: '向后弹一下，再回到你身边。' },
  { id: 'thinking', label: '思考', displayLabel: 'thinking', hint: '托腮歪头，把信息慢慢理清。' },
  { id: 'proud', label: '坚定', displayLabel: 'proud', hint: '握紧小拳，准备把事情做好。' },
  { id: 'sleepy', label: '困倦', displayLabel: 'sleepy', hint: '轻轻点头，暂时放慢节奏。' },
]

const panelVariants = {
  initial: { opacity: 0, y: 18, rotate: -0.35, scale: 0.988 },
  animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
  exit: { opacity: 0, y: 12, rotate: 0.25, scale: 0.988 },
}

function MotionPanel({ children, className = '' }) {
  return (
    <motion.div
      animate="animate"
      className={className}
      exit="exit"
      initial="initial"
      transition={{ duration: 0.28, ease: 'easeOut' }}
      variants={panelVariants}
    >
      {children}
    </motion.div>
  )
}

function ComicNav({ activeView, onChange }) {
  return (
    <nav
      aria-label="Lino 工作台视图"
      className="comic-tabs relative z-20 -mt-2 grid grid-cols-5 gap-2 pb-1 pt-2 sm:flex"
    >
      {deskViews.map((view) => {
        const Icon = view.icon
        const isActive = activeView === view.id
        return (
          <button
            aria-current={isActive ? 'page' : undefined}
            aria-label={`打开${view.label}界面`}
            className={`comic-tab inline-flex h-11 w-full items-center justify-center rounded-full border-[3px] border-neutral-950 p-0 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 sm:w-auto sm:gap-2 sm:px-4 ${
              isActive
                ? 'bg-neutral-950 text-white'
                : 'bg-white text-neutral-950 hover:-translate-y-0.5'
            }`}
            key={view.id}
            onClick={() => onChange(view.id)}
            type="button"
          >
            <Icon size={16} strokeWidth={2.4} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function ChatPanel({ chat, focusMessageId, isEntering, onFocusHandled }) {
  const bottomRef = useRef(null)
  const messageRefs = useRef(new Map())
  const [editingMessageId, setEditingMessageId] = useState(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat.isResponding, chat.messages])

  useEffect(() => {
    if (!focusMessageId) {
      return undefined
    }

    const target = messageRefs.current.get(focusMessageId)
    if (!target) {
      return undefined
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timeoutId = window.setTimeout(onFocusHandled, 1600)
    return () => window.clearTimeout(timeoutId)
  }, [focusMessageId, onFocusHandled])

  return (
    <motion.section
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="conversation-panel doodle-card doodle-card-heavy relative flex min-h-[620px] flex-col overflow-hidden rounded-[2rem] bg-white/[0.82] p-4 sm:p-5 lg:min-h-0"
      initial={isEntering ? { opacity: 0, scale: 0.98, y: 16 } : false}
      transition={{ duration: 0.44, ease: 'easeOut' }}
    >
      <div className="chat-paper-layer" aria-hidden="true" />
      <div className="scribble-spine" aria-hidden="true" />
      <div className="speed-lines speed-lines-top" aria-hidden="true" />
      {chat.isResponding ? <div className="thinking-burst" aria-hidden="true" /> : null}

      <div className="relative z-10 mb-3 flex items-start justify-between gap-4 px-6 pt-3">
        <div>
          <p className="comic-page-tag">主对话</p>
          <h1 className="font-hand text-2xl font-semibold text-neutral-950 sm:text-3xl">
            对话
          </h1>
        </div>
        <span className="text-3xl font-bold leading-none text-neutral-950">...</span>
      </div>

      <div className="relative z-10 flex-1 space-y-4 overflow-y-auto px-2 pb-5 pl-10 pr-2 sm:pl-14">
        {chat.messages.map((message, index) => {
          const userMessage = message.role === 'assistant' ? chat.messages[index - 1] : null
          const isTurnReply = userMessage?.role === 'user'

          return (
          <div
            className="flex items-start gap-3"
            key={message.id}
            ref={(node) => {
              if (node) {
                messageRefs.current.set(message.id, node)
              } else {
                messageRefs.current.delete(message.id)
              }
            }}
          >
            {message.role === 'assistant' ? (
              <LinoMascot
                className="mt-1 hidden shrink-0 sm:block"
                pose="still"
                size="xs"
                state={chat.isResponding ? 'thinking' : chat.agentState}
              />
            ) : null}
            <MessageBubble
              isEditing={editingMessageId === message.id}
              isFocused={focusMessageId === message.id}
              message={message}
              onCancelEdit={() => setEditingMessageId(null)}
              onSaveEdit={(messageId, content) => {
                if (chat.editAndRegenerate(messageId, content)) {
                  setEditingMessageId(null)
                }
              }}
            >
              {isTurnReply ? (
                <ConversationActions
                  isFavorite={chat.favoriteMessageIds.includes(message.id)}
                  message={message}
                  onEdit={setEditingMessageId}
                  onRetry={chat.retryAssistantReply}
                  onToggleFavorite={chat.toggleFavoriteMessage}
                  userMessage={userMessage}
                />
              ) : null}
            </MessageBubble>
          </div>
          )
        })}
        {chat.isResponding ? (
          <div
            aria-live="polite"
            className="flex items-center gap-3 rounded-[1.5rem] px-1 py-2 text-sm text-neutral-700"
          >
            <LinoMascot pose="thinking" size="xs" state="thinking" />
            <span>Lino 正在思考</span>
            <span className="inline-flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-500" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-500 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-500 [animation-delay:240ms]" />
            </span>
            <button
              className="ml-auto rounded-full border-2 border-neutral-950 bg-white px-3 py-1 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-950 hover:text-white"
              onClick={chat.cancelReply}
              type="button"
            >
              停止生成
            </button>
          </div>
        ) : null}
        {chat.connectionNotice ? (
          <p aria-live="polite" className="rounded-xl border-2 border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-600">
            {chat.connectionNotice}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div
        className={`relative z-10 px-2 pb-1 pl-8 transition-opacity duration-200 sm:pl-12 ${
          isEntering ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <Composer
          disabled={chat.isResponding}
          isThinking={chat.isResponding || chat.agentState === 'thinking'}
          onSubmit={chat.sendMessage}
          placeholder={chat.isResponding ? 'Lino 正在思考...' : '写下想法...'}
        />
      </div>
      {isEntering ? (
        <motion.div
          aria-hidden="true"
          className="entry-composer-flight absolute bottom-3 left-8 right-4 z-20 pointer-events-none sm:left-12"
          layoutId="conversation-frame"
          transition={{ type: 'spring', stiffness: 180, damping: 23, mass: 0.78 }}
        >
          <Composer
            className="opacity-100"
            disabled
            onSubmit={chat.sendMessage}
            placeholder="写下想法..."
          />
        </motion.div>
      ) : null}
    </motion.section>
  )
}

function MoodPanel({ chat }) {
  const [isReacting, setIsReacting] = useState(false)

  useEffect(() => {
    if (!isReacting) {
      return undefined
    }

    const timerId = window.setTimeout(() => setIsReacting(false), 1000)
    return () => window.clearTimeout(timerId)
  }, [isReacting])

  const chooseRandomMood = () => {
    const availableMoods = moodFaces.filter((mood) => mood.id !== chat.agentState)
    const nextMood = availableMoods[Math.floor(Math.random() * availableMoods.length)]
    chat.setAgentState(nextMood.id)
    setIsReacting(true)
  }

  return (
    <MotionPanel className="comic-page-grid mood-layout">
      <section className="doodle-card mood-feature-panel relative overflow-hidden bg-white/[0.86] p-6">
        <div className="panel-burst" aria-hidden="true" />
        <div className="mood-meter-lines" aria-hidden="true" />
        <div className="absolute inset-x-6 top-6 z-10 text-center">
          <p className="comic-page-tag mx-auto w-fit">情绪分镜</p>
          <h1 className="font-hand text-3xl font-semibold text-neutral-950">情绪画板</h1>
        </div>
        <div className="relative z-10 grid h-full min-h-[560px] place-items-center text-center">
          <div className="translate-y-12">
            <button
              aria-label="随机切换 Lino 情绪"
              className="mood-lino-trigger mx-auto block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={chat.isResponding}
              onClick={chooseRandomMood}
              title="随机切换 Lino 情绪"
              type="button"
            >
              <LinoMascot
                activity={isReacting ? 'reacting' : 'mood'}
                pose={chat.agentState}
                size="xl"
                state={chat.agentState}
              />
            </button>
            <p className="mt-5 text-lg font-semibold text-neutral-950">
              当前情绪：{moodFaces.find((mood) => mood.id === chat.agentState)?.label ?? '平静'}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
              选择一个分镜情绪，Lino 会用动作回应。
            </p>
          </div>
        </div>
      </section>
      <aside className="grid gap-4">
        {moodFaces.map((mood, index) => (
          <button
            aria-pressed={chat.agentState === mood.id}
            className="doodle-card expression-strip bg-white p-4 text-left transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            key={mood.id}
            onClick={() => chat.setAgentState(mood.id)}
            type="button"
          >
            <span className="font-hand text-xl font-semibold text-neutral-950">
              {index + 1}. {mood.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-neutral-500">{mood.hint}</span>
            <LinoMascot className="ml-auto mt-2" pose="still" size="sm" state={mood.id} />
          </button>
        ))}
      </aside>
    </MotionPanel>
  )
}

function MemoryPanel({ chat, onOpenMessage }) {
  const [activeMemoryTab, setActiveMemoryTab] = useState('basic')
  const [newMemory, setNewMemory] = useState('')
  const [memoryActivity, setMemoryActivity] = useState('searching')

  useEffect(() => {
    if (memoryActivity === 'searching') {
      return undefined
    }

    const timerId = window.setTimeout(() => setMemoryActivity('searching'), 1000)
    return () => window.clearTimeout(timerId)
  }, [memoryActivity])
  const basicMemories = useMemo(
    () => [
      ...chat.manualMemories.map((memory) => ({ ...memory, kind: 'manual' })),
      ...chat.messages
        .filter(
          (message) =>
            message.role === 'user' && !chat.hiddenMemoryMessageIds.includes(message.id),
        )
        .slice()
        .reverse()
        .map((message) => ({ ...message, kind: 'conversation' })),
    ],
    [chat.hiddenMemoryMessageIds, chat.manualMemories, chat.messages],
  )
  const favoriteMemories = useMemo(
    () =>
      chat.messages
        .map((message, index) => ({ message, userMessage: chat.messages[index - 1] }))
        .filter(
          ({ message, userMessage }) =>
            message.role === 'assistant' &&
            userMessage?.role === 'user' &&
            chat.favoriteMessageIds.includes(message.id),
        )
        .map(({ userMessage }) => ({ ...userMessage, kind: 'favorite' }))
        .slice()
        .reverse(),
    [chat.favoriteMessageIds, chat.messages],
  )
  const memories = activeMemoryTab === 'basic' ? basicMemories : favoriteMemories

  const saveMemory = (event) => {
    event.preventDefault()
    if (chat.addMemory(newMemory)) {
      setNewMemory('')
      setMemoryActivity('saving')
    }
  }

  const removeMemory = (memory) => {
    if (memory.kind === 'manual') {
      chat.removeManualMemory(memory.id)
    } else if (memory.kind === 'favorite') {
      chat.removeFavoriteMemory(memory.id)
    } else {
      chat.hideMemoryMessage(memory.id)
    }
    setMemoryActivity('saving')
  }

  return (
    <MotionPanel className="comic-page-grid memory-layout">
      <section className="doodle-card scrapbook-panel bg-white/[0.86] p-6">
        <p className="comic-page-tag">对话线索</p>
        <h1 className="font-hand text-3xl font-semibold text-neutral-950">
          记忆剪贴簿
        </h1>
        <div aria-label="记忆类型" className="memory-tabs mt-7 inline-flex gap-2" role="tablist">
          <button
            aria-selected={activeMemoryTab === 'basic'}
            className="memory-tab"
            onClick={() => {
              setActiveMemoryTab('basic')
              setMemoryActivity('searching')
            }}
            role="tab"
            type="button"
          >
            基本记忆
          </button>
          <button
            aria-selected={activeMemoryTab === 'favorite'}
            className="memory-tab"
            onClick={() => {
              setActiveMemoryTab('favorite')
              setMemoryActivity('searching')
            }}
            role="tab"
            type="button"
          >
            收藏记忆
          </button>
        </div>
        {activeMemoryTab === 'basic' ? (
          <form className="mt-5 flex gap-2" onSubmit={saveMemory}>
            <input
              aria-label="添加一条记忆"
              className="min-w-0 flex-1 rounded-full border-2 border-neutral-950 bg-white px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
              onChange={(event) => setNewMemory(event.target.value)}
              placeholder="写下一条想保留的记忆"
              value={newMemory}
            />
            <button
              aria-label="保存记忆"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-neutral-950 bg-neutral-950 text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-neutral-950 disabled:opacity-45"
              disabled={!newMemory.trim()}
              type="submit"
            >
              <Plus size={18} strokeWidth={2.6} />
            </button>
          </form>
        ) : null}
        <div className="mt-5 grid gap-4">
          {memories.length ? (
            memories.map((memory, index) => (
              <div
                className="memory-note flex items-start gap-3 px-5 py-4"
                key={memory.id}
              >
                <button
                  className="memory-link min-w-0 flex-1 text-left"
                  disabled={memory.kind === 'manual'}
                  onClick={() => memory.kind !== 'manual' && onOpenMessage(memory.id)}
                  type="button"
                >
                  <span className="text-xs font-semibold text-neutral-500">
                    {memory.kind === 'manual'
                      ? '手动记忆'
                      : activeMemoryTab === 'basic'
                        ? `对话 ${index + 1}`
                        : `收藏 ${index + 1}`}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-neutral-800">{memory.content}</span>
                </button>
                <button
                  aria-label={`${memory.kind === 'favorite' ? '取消收藏' : '删除记忆'}：${memory.content}`}
                  className="message-action-button shrink-0"
                  onClick={() => removeMemory(memory)}
                  title={memory.kind === 'favorite' ? '取消收藏' : '删除记忆'}
                  type="button"
                >
                  <X size={16} strokeWidth={2.6} />
                </button>
              </div>
            ))
          ) : (
            <p className="memory-empty">{activeMemoryTab === 'basic' ? '还没有可保存的对话。' : '还没有收藏对话。'}</p>
          )}
        </div>
        <button
          aria-label={activeMemoryTab === 'basic' ? '清空基本记忆' : '清空收藏记忆'}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 underline decoration-2 underline-offset-4 transition hover:text-neutral-950 disabled:opacity-40"
          disabled={!memories.length}
          onClick={() => {
            if (activeMemoryTab === 'basic') {
              chat.clearBasicMemories()
            } else {
              chat.clearFavoriteMemories()
            }
            setMemoryActivity('saving')
          }}
          type="button"
        >
          <Trash2 size={16} strokeWidth={2.4} />
          清空当前记忆
        </button>
      </section>
      <aside className="doodle-card stamp-panel bg-white/[0.86] p-6">
        <LinoMascot activity={memoryActivity} pose="rest" size="lg" state="idle" />
        <p className="mt-4 font-hand text-2xl font-semibold text-neutral-950">本机记忆</p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          这些内容只保存在浏览器本地存储中，当前版本不会上传或同步。
        </p>
      </aside>
    </MotionPanel>
  )
}

function ActionsPanel({ chat, onRunAction }) {
  return (
    <MotionPanel className="comic-page-grid actions-layout">
      <section className="doodle-card action-board bg-white/[0.86] p-6">
        <p className="comic-page-tag">快捷行动</p>
        <h1 className="font-hand text-3xl font-semibold text-neutral-950">行动面板</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {suggestedPrompts.map((prompt, index) => (
            <button
              className="action-frame min-h-[180px] p-5 text-left transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:opacity-45"
              disabled={chat.isResponding}
              key={prompt.id}
              onClick={() => onRunAction(prompt.prompt)}
              type="button"
            >
              <span className="action-index">0{index + 1}</span>
              <Sparkles size={20} />
              <span className="mt-5 block font-hand text-2xl font-semibold text-neutral-950">
                {prompt.label}
              </span>
              <span className="mt-3 block text-sm leading-6 text-neutral-500">
                点一下，Lino 会把它送进主对话分镜。
              </span>
            </button>
          ))}
        </div>
      </section>
      <aside className="doodle-card action-side-panel bg-white/[0.86] p-6">
        <LinoMascot activity="execute-ready" pose="playful" size="lg" state="playful" />
        <p className="mt-4 font-hand text-2xl font-semibold text-neutral-950">动作分镜</p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          建议按钮不是普通 chips，而是 Lino 的漫画动作指令。
        </p>
      </aside>
    </MotionPanel>
  )
}

function LocalPanel({ chat, clearNotice, onRequestClear }) {
  const importInputRef = useRef(null)
  const [status, setStatus] = useState('')

  const exportData = () => {
    const blob = new Blob([chat.exportLocalData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lino-local-data.json'
    link.click()
    URL.revokeObjectURL(url)
    setStatus('本地数据已导出。')
  }

  const importData = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setStatus(chat.importLocalData(await file.text()) ? '本地数据已导入。' : '导入失败，请选择 Lino 数据文件。')
    event.target.value = ''
  }

  return (
    <MotionPanel className="comic-page-grid local-layout">
      <section className="doodle-card local-safe-panel bg-white/[0.86] p-6">
        <p className="comic-page-tag">仅限本机</p>
        <h1 className="font-hand text-3xl font-semibold text-neutral-950">本地空间</h1>
        <div className="mt-10 flex items-center gap-5">
          <Lock size={48} strokeWidth={2.4} />
          <div>
            <p className="text-lg font-semibold text-neutral-950">
              所有内容只保存在本设备。
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
              当前 MVP 不连接账号、数据库或云同步。刷新后会恢复本地对话。
            </p>
          </div>
        </div>
      </section>
      <aside className="ticket-card doodle-card bg-white/[0.86] p-6">
        <LinoMascot activity={status || clearNotice ? 'saving' : 'guarding'} pose="rest" size="md" state="idle" />
        <ShieldCheck className="mt-4" size={28} />
        <p className="mt-4 font-hand text-2xl font-semibold text-neutral-950">安全票据</p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          本页更规整，用来和情绪、记忆、行动页的漫画形态区分开。
        </p>
        <div className="mt-6 grid gap-2">
          <button
            aria-label="导出本地数据"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-950 bg-white px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white"
            onClick={exportData}
            type="button"
          >
            <Download size={16} strokeWidth={2.5} />
            导出
          </button>
          <button
            aria-label="导入本地数据"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-950 bg-white px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white"
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            <Upload size={16} strokeWidth={2.5} />
            导入
          </button>
          <input
            accept="application/json"
            className="sr-only"
            onChange={importData}
            ref={importInputRef}
            type="file"
          />
          <button
            aria-label="清除本地数据"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-950 bg-white px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white"
            onClick={onRequestClear}
            type="button"
          >
            <Trash2 size={16} strokeWidth={2.5} />
            清除
          </button>
        </div>
        {status || clearNotice ? <p aria-live="polite" className="mt-4 text-sm font-semibold text-neutral-800">{clearNotice || status}</p> : null}
      </aside>
    </MotionPanel>
  )
}

function ConfirmDialog({ confirmLabel, description, onCancel, onConfirm, title }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/20 p-4" role="presentation">
      <section aria-labelledby="confirm-dialog-title" aria-modal="true" className="doodle-card w-full max-w-sm bg-white p-6" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="comic-page-tag">需要确认</p>
            <h2 className="mt-3 font-hand text-2xl font-semibold text-neutral-950" id="confirm-dialog-title">{title}</h2>
          </div>
          <button aria-label="关闭确认框" className="message-action-button" onClick={onCancel} type="button">
            <X size={18} strokeWidth={2.6} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-neutral-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-full border-2 border-neutral-950 bg-white px-4 py-2 text-sm font-semibold" onClick={onCancel} type="button">取消</button>
          <button aria-label={confirmLabel} className="rounded-full border-2 border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-semibold text-white" onClick={onConfirm} type="button">继续</button>
        </div>
      </section>
    </div>
  )
}

function SidePreview({ chat, isEntering, onViewChange }) {
  const memoryPreview = useMemo(() => chat.messages.slice(-2).reverse(), [chat.messages])

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0, y: 0 }}
      className="side-preview-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1"
      initial={isEntering ? { opacity: 0, x: 26, y: 12 } : false}
      transition={{ delay: isEntering ? 0.32 : 0, duration: 0.36, ease: 'easeOut' }}
    >
      <BentoCard className="cloud-card min-h-[250px]" icon={Smile} title="情绪">
        <div className="flex flex-col items-center text-center">
          <LinoMascot pose={chat.agentState} size="lg" state={chat.agentState} />
          <p className="mt-1 text-base font-semibold text-neutral-950">
            当前情绪：{moodFaces.find((mood) => mood.id === chat.agentState)?.label ?? '平静'}
          </p>
          <button
            className="mt-4 text-sm font-semibold text-neutral-950 underline decoration-2 underline-offset-4"
            onClick={() => onViewChange('mood')}
            type="button"
          >
            查看情绪
          </button>
        </div>
      </BentoCard>

      <BentoCard className="memory-card" icon={Archive} title="记忆">
        <div className="space-y-3">
          {memoryPreview.map((memory) => (
            <button
              className="memory-strip w-full break-words px-4 py-3 text-left text-sm leading-6 text-neutral-700 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              key={memory.id}
              onClick={() => onViewChange('chat', memory.id)}
              type="button"
            >
              {memory.content}
            </button>
          ))}
          <button
            className="mt-2 inline-flex w-full items-center justify-between text-left text-sm font-semibold text-neutral-950 transition hover:translate-x-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            onClick={() => onViewChange('memory')}
            type="button"
          >
            查看全部
            <ChevronRight size={20} strokeWidth={2.4} />
          </button>
        </div>
      </BentoCard>

      <BentoCard
        className="suggestion-tray sm:col-span-2 lg:col-span-1"
        icon={Sparkles}
        title="灵感"
      >
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              className="rounded-full border-[2.6px] border-neutral-950 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white disabled:translate-y-0 disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
              disabled={chat.isResponding}
              key={prompt.id}
              onClick={() => chat.sendMessage(prompt.prompt)}
              type="button"
            >
              {prompt.label}
            </button>
          ))}
          <button
            aria-label="换一组建议"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[2.6px] border-neutral-950 bg-white text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            onClick={() => onViewChange('actions')}
            type="button"
          >
            <RotateCcw size={18} strokeWidth={2.4} />
          </button>
        </div>
      </BentoCard>

      <BentoCard className="ticket-card" icon={ShieldCheck} title="本地">
        <div className="flex items-center gap-4">
          <Lock className="shrink-0" size={28} strokeWidth={2.5} />
          <div>
            <p className="text-sm font-semibold text-neutral-950">
              所有内容只保存在本设备。
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">仅使用浏览器本地存储。</p>
          </div>
        </div>
      </BentoCard>
    </motion.aside>
  )
}

export function ChatStage({ chat, isEntering = false }) {
  const [activeView, setActiveView] = useState('chat')
  const [focusedMessageId, setFocusedMessageId] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [localClearNotice, setLocalClearNotice] = useState('')
  const menuRef = useRef(null)

  const openDeskView = useCallback((view, messageId = null) => {
    setActiveView(view)
    setFocusedMessageId(view === 'chat' ? messageId : null)
    setIsMenuOpen(false)
  }, [])

  const runAction = useCallback(
    (prompt) => {
      const messageId = chat.sendMessage(prompt)
      if (messageId) {
        openDeskView('chat', messageId)
      }
    },
    [chat, openDeskView],
  )

  const clearFocusedMessage = useCallback(() => setFocusedMessageId(null), [])

  const resetDesk = () => {
    chat.resetChat()
    setActiveView('chat')
    setFocusedMessageId(null)
    setIsMenuOpen(false)
  }

  const requestReset = () => setConfirmation('reset')
  const requestLocalClear = () => setConfirmation('local-clear')

  const confirmAction = () => {
    if (confirmation === 'reset') {
      resetDesk()
    } else if (confirmation === 'local-clear') {
      chat.clearLocalData()
      setLocalClearNotice('本地数据已清除。')
    }
    setConfirmation(null)
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const closeMenuOnOutsidePress = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    const closeMenuOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', closeMenuOnOutsidePress)
    window.addEventListener('keydown', closeMenuOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeMenuOnOutsidePress)
      window.removeEventListener('keydown', closeMenuOnEscape)
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (chat.isResponding || chat.agentState === 'thinking') {
      return undefined
    }

    if (chat.agentState === 'proud') {
      const timerId = window.setTimeout(() => chat.setAgentState('idle'), 3600)
      return () => window.clearTimeout(timerId)
    }

    const timerId = window.setInterval(() => {
      const nextState = ambientStates[Math.floor(Math.random() * ambientStates.length)]
      chat.setAgentState(nextState)
    }, 8200)

    return () => window.clearInterval(timerId)
  }, [chat, chat.agentState, chat.isResponding])

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1260px] flex-col px-4 py-5 sm:px-6"
      exit={{ opacity: 0, y: 10 }}
      initial={isEntering ? { opacity: 0.38, y: 4 } : { opacity: 0, y: 16 }}
      transition={{ duration: isEntering ? 0.46 : 0.36, ease: 'easeOut' }}
    >
      <div className="doodle-page-frame relative flex min-h-[calc(100svh-2.5rem)] flex-col overflow-hidden rounded-[2.25rem] bg-white/[0.84] px-5 py-5 sm:px-8 sm:py-7">
        <header className="relative z-20 mb-5 flex flex-col gap-4">
          <div className="relative flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lino-header-orbit relative flex items-center justify-center">
                {isEntering ? (
                  <motion.div
                    aria-hidden="true"
                    animate={{ opacity: [0, 0.62, 0], rotate: [-8, 0, 7], scale: [0.72, 1, 1.2] }}
                    className="entry-comic-burst comic-rays--tapered"
                    initial={{ opacity: 0, rotate: -14, scale: 0.64 }}
                    transition={{ duration: 0.84, ease: 'easeOut' }}
                  />
                ) : null}
                <LinoMascot
                  activity={chat.isResponding ? 'thinking' : chat.agentState === 'proud' ? 'complete' : 'listening'}
                  layoutId="lino-entry"
                  pose="header"
                  size="sm"
                  state={chat.agentState}
                />
              </div>
              <span className="font-hand text-3xl font-semibold text-neutral-950">Lino</span>
            </div>
            <div className="flex items-center gap-3" ref={menuRef}>
              <button
                aria-label="重置对话"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-[3px] border-neutral-950 bg-white text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                onClick={requestReset}
                type="button"
              >
                <History size={22} strokeWidth={2.4} />
              </button>
              <button
                aria-controls="desk-action-menu"
                aria-expanded={isMenuOpen}
                aria-label="打开菜单"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-[3px] border-neutral-950 bg-white text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                onClick={() => setIsMenuOpen((current) => !current)}
                type="button"
              >
                <Menu size={24} strokeWidth={2.4} />
              </button>
              {isMenuOpen ? (
                <div
                  className="desk-action-menu absolute right-0 top-[calc(100%+0.7rem)] z-30 w-56 border-[3px] border-neutral-950 bg-white p-2 shadow-[5px_6px_0_rgba(10,10,10,0.14)]"
                  id="desk-action-menu"
                  role="menu"
                >
                  <button
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-neutral-950 transition hover:bg-neutral-950 hover:text-white"
                    onClick={requestReset}
                    role="menuitem"
                    type="button"
                  >
                    重新开始对话
                  </button>
                  {deskViews.map((view) => (
                    <button
                      className="w-full px-3 py-2 text-left text-sm font-semibold text-neutral-950 transition hover:bg-neutral-950 hover:text-white"
                      key={view.id}
                      onClick={() => openDeskView(view.id)}
                      role="menuitem"
                      type="button"
                    >
                      打开{view.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <ComicNav activeView={activeView} onChange={openDeskView} />
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'chat' ? (
            <MotionPanel
              className="relative z-10 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
              key="chat"
            >
              <ChatPanel
                chat={chat}
                focusMessageId={focusedMessageId}
                isEntering={isEntering}
                onFocusHandled={clearFocusedMessage}
              />
              <SidePreview chat={chat} isEntering={isEntering} onViewChange={openDeskView} />
            </MotionPanel>
          ) : activeView === 'mood' ? (
            <MoodPanel chat={chat} key="mood" />
          ) : activeView === 'memory' ? (
            <MemoryPanel chat={chat} key="memory" onOpenMessage={(messageId) => openDeskView('chat', messageId)} />
          ) : activeView === 'actions' ? (
            <ActionsPanel chat={chat} key="actions" onRunAction={runAction} />
          ) : (
            <LocalPanel chat={chat} clearNotice={localClearNotice} key="local" onRequestClear={requestLocalClear} />
          )}
        </AnimatePresence>
      </div>
      {confirmation ? (
        <ConfirmDialog
          confirmLabel={confirmation === 'reset' ? '确认重新开始' : '确认清除本地数据'}
          description={confirmation === 'reset' ? '这会清空当前对话和本机记忆，操作后无法恢复。' : '这会清空当前浏览器中的对话、记忆与收藏。'}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmAction}
          title={confirmation === 'reset' ? '重新开始对话' : '清除本地数据'}
        />
      ) : null}
    </motion.section>
  )
}
