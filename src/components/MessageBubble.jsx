import { Bookmark, Check, Copy, Pencil, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'

async function copyMessageContent(content) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content)
    return
  }

  const fallback = document.createElement('textarea')
  fallback.value = content
  fallback.setAttribute('readonly', '')
  fallback.style.position = 'fixed'
  fallback.style.opacity = '0'
  document.body.appendChild(fallback)
  fallback.select()
  document.execCommand('copy')
  fallback.remove()
}

export function ConversationActions({ isFavorite, message, onEdit, onRetry, onToggleFavorite, userMessage }) {
  const [copied, setCopied] = useState(false)

  const copyMessage = async () => {
    try {
      await copyMessageContent(message.content)
    } catch {
      // The copied state still gives feedback when a browser blocks clipboard access.
    }

    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="message-actions mt-2 inline-flex items-center gap-1" aria-label="本轮对话操作">
      <button
        aria-label={copied ? '已复制 Lino 回答' : '复制 Lino 回答'}
        className="message-action-button"
        onClick={copyMessage}
        title={copied ? '已复制' : '复制回答'}
        type="button"
      >
        {copied ? <Check size={16} strokeWidth={2.4} /> : <Copy size={16} strokeWidth={2.4} />}
      </button>
      <button
        aria-label="编辑本轮用户消息"
        className="message-action-button"
        onClick={() => onEdit(userMessage.id)}
        title="编辑你的提问"
        type="button"
      >
        <Pencil size={16} strokeWidth={2.4} />
      </button>
      <button
        aria-label={isFavorite ? '取消收藏本轮对话' : '收藏本轮对话'}
        aria-pressed={isFavorite}
        className="message-action-button"
        onClick={() => onToggleFavorite(message.id)}
        title={isFavorite ? '取消收藏' : '收藏本轮'}
        type="button"
      >
        <Bookmark fill={isFavorite ? 'currentColor' : 'none'} size={16} strokeWidth={2.4} />
      </button>
      <button
        aria-label="重试 Lino 回答"
        className="message-action-button"
        onClick={() => onRetry(userMessage.id)}
        title="重新思考并回答"
        type="button"
      >
        <RotateCcw size={16} strokeWidth={2.4} />
      </button>
    </div>
  )
}

export function MessageBubble({ children, isEditing, isFocused, message, onCancelEdit, onSaveEdit }) {
  const [draft, setDraft] = useState(message.content)
  const isUser = message.role === 'user'

  const saveEdit = () => {
    onSaveEdit(message.id, draft)
  }

  const cancelEdit = () => {
    setDraft(message.content)
    onCancelEdit()
  }

  return (
    <article
      className={`message-item flex w-full flex-col ${isUser ? 'items-end' : 'items-start'} ${
        isFocused ? 'message-focus' : ''
      }`}
      data-message-id={message.id}
      data-response-source={message.source}
    >
      <div
        className={`max-w-[82%] rounded-[1.6rem] border-[2.5px] px-5 py-4 text-sm leading-6 shadow-sm sm:max-w-[72%] ${
          isUser
            ? 'border-neutral-950 bg-neutral-950 text-white'
            : 'border-neutral-950 bg-white text-neutral-800'
        }`}
      >
        {isEditing ? (
          <textarea
            aria-label="编辑消息内容"
            className="min-h-24 w-full resize-y rounded-xl border-2 border-current bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-current"
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
        ) : (
          <p>{message.content}</p>
        )}
      </div>
      {isEditing ? (
        <div className="message-actions mt-2 inline-flex items-center gap-1">
          <button aria-label="保存修改" className="message-action-button" onClick={saveEdit} title="保存修改" type="button">
            <Check size={16} strokeWidth={2.4} />
          </button>
          <button aria-label="取消编辑" className="message-action-button" onClick={cancelEdit} title="取消编辑" type="button">
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
      ) : null}
      {children}
    </article>
  )
}
