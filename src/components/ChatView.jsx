import { Bookmark, Copy, Edit3, History, LoaderCircle, RefreshCw, Send, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getSpirit } from '../data/lumora'
import { SpiritAsset } from './SpiritAsset'

function TurnActions({ assistant, favorite, onEdit, onFavorite, onRetry, user }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(`${user.content}\n\n${assistant?.content ?? ''}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className="turn-actions" aria-label="本轮对话操作">
      <button onClick={copy} title="复制本轮对话" type="button"><Copy size={15} />{copied && <span>已复制</span>}</button>
      <button onClick={() => onEdit(user)} title="修改你的发言" type="button"><Edit3 size={15} /></button>
      <button className={favorite ? 'is-favorite' : ''} onClick={() => onFavorite(assistant?.id ?? user.id)} title="收藏本轮对话" type="button"><Bookmark size={15} /></button>
      <button onClick={() => onRetry(user.id)} title="让精灵重新回答" type="button"><RefreshCw size={15} /></button>
    </div>
  )
}

function toTurns(messages) {
  const turns = []
  for (const message of messages) {
    if (message.role === 'user') turns.push({ user: message, assistant: null })
    else if (turns.length) turns[turns.length - 1].assistant = message
    else turns.push({ user: null, assistant: message })
  }
  return turns
}

export function ChatView({ chat, onDelete, onShowHistory }) {
  const spirit = getSpirit(chat.selectedSpiritId || 'lino')
  const conversation = chat.activeConversation
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(null)
  const endRef = useRef(null)
  const readOnly = conversation?.status === 'archived'
  const turns = toTurns(conversation?.messages ?? [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [conversation?.messages])

  const submit = (event) => {
    event.preventDefault()
    if (chat.sendMessage(draft)) setDraft('')
  }

  if (!conversation) {
    return (
      <section className="chat-empty-state">
        <SpiritAsset className="empty-spirit" spiritId={spirit.id} />
        <h1>想从哪里开始？</h1>
        <p>{spirit.quote}</p>
        <button className="primary-button" onClick={() => chat.newConversation(spirit.id)} type="button">建立新对话</button>
        <button className="text-button" onClick={onShowHistory} type="button"><History size={16} />查看历史对话</button>
      </section>
    )
  }

  return (
    <section className="chat-view" style={{ '--spirit-color': spirit.color, '--spirit-soft': spirit.soft }}>
      <header className="chat-header">
        <div className="chat-spirit-state"><SpiritAsset avatar spiritId={spirit.id} /><div><strong>{spirit.name}</strong><span>{chat.isResponding ? '正在整理你的话…' : spirit.realm}</span></div></div>
        <div className="chat-header-actions">
          <button className="icon-text-button" onClick={onShowHistory} type="button"><History size={17} />历史</button>
          <button className="icon-button" onClick={() => onDelete(conversation)} title="删除这次对话" type="button"><Trash2 size={17} /></button>
        </div>
      </header>
      {conversation.contextSummary && <div className="context-banner">延续的记忆：{conversation.contextSummary}</div>}
      <div className="message-scroll" aria-live="polite">
        {turns.length === 0 && (
          <div className="conversation-welcome">
            <SpiritAsset className="welcome-spirit" spiritId={spirit.id} />
            <h2>{spirit.name} 已经在这里了</h2>
            <p>{spirit.quote}</p>
          </div>
        )}
        {turns.map((turn, index) => (
          <article className="conversation-turn" key={turn.user?.id ?? turn.assistant?.id ?? index}>
            {turn.user && <div className="message user-message">{turn.user.content}</div>}
            {turn.assistant && (
              <div className="assistant-row">
                <SpiritAsset avatar spiritId={spirit.id} />
                <div className="message assistant-message">
                  {turn.assistant.content || <LoaderCircle className="spin" size={18} />}
                  {turn.assistant.source === 'local-mock' && <small>本地陪伴模式</small>}
                </div>
              </div>
            )}
            {turn.user && turn.assistant?.content && !readOnly && (
              <TurnActions
                assistant={turn.assistant}
                favorite={chat.favoriteMessageIds.includes(turn.assistant.id)}
                onEdit={setEditing}
                onFavorite={chat.toggleFavoriteMessage}
                onRetry={chat.retryAssistantReply}
                user={turn.user}
              />
            )}
          </article>
        ))}
        <div ref={endRef} />
      </div>
      {chat.connectionNotice && <p className="connection-notice">{chat.connectionNotice}</p>}
      {readOnly ? (
        <div className="readonly-bar"><span>这次对话已封存，不会再改变。</span><button className="primary-button" onClick={() => chat.continueConversation(conversation.id)} type="button">继续聊这个话题</button></div>
      ) : (
        <form className="chat-composer" onSubmit={submit}>
          <textarea aria-label="输入消息" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
          }} placeholder={`和 ${spirit.name} 说说吧…`} rows="1" value={draft} />
          {chat.isResponding ? (
            <button aria-label="停止回答" className="send-button" onClick={chat.cancelReply} type="button"><Square size={17} /></button>
          ) : (
            <button aria-label="发送" className="send-button" disabled={!draft.trim()} type="submit"><Send size={18} /></button>
          )}
        </form>
      )}
      {editing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditing(null)}>
          <form className="modal-card" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault()
            const value = new FormData(event.currentTarget).get('content')
            if (chat.editAndRegenerate(editing.id, String(value))) setEditing(null)
          }}>
            <h2>修改你的发言</h2>
            <textarea defaultValue={editing.content} name="content" rows="5" />
            <div className="modal-actions"><button className="secondary-button" onClick={() => setEditing(null)} type="button">取消</button><button className="primary-button" type="submit">修改并重新回答</button></div>
          </form>
        </div>
      )}
    </section>
  )
}
