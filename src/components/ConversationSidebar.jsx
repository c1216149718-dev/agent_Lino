import { History, MessageCirclePlus, Trash2 } from 'lucide-react'
import { getSpirit } from '../data/lumora'
import { SpiritAsset } from './SpiritAsset'

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function ConversationSidebar({ activeId, conversations, isResponding, onDelete, onNew, onOpen, spiritId }) {
  const spirit = getSpirit(spiritId)
  return (
    <aside className="conversation-sidebar">
      <div className="sidebar-spirit" style={{ '--spirit-color': spirit.color, '--spirit-soft': spirit.soft }}>
        <SpiritAsset avatar spiritId={spiritId} />
        <div><strong>{spirit.name}</strong><span>{spirit.action}</span></div>
      </div>
      <button className="new-conversation-button" disabled={isResponding} onClick={onNew} type="button">
        <MessageCirclePlus size={18} />建立新对话
      </button>
      <div className="sidebar-section-title"><History size={15} />历史对话</div>
      <div className="conversation-list">
        {conversations.length === 0 && <p className="empty-note">还没有历史对话，从一句想说的话开始吧。</p>}
        {conversations.map((conversation) => (
          <div className={`conversation-list-item ${conversation.id === activeId ? 'is-active' : ''}`} key={conversation.id}>
            <button onClick={() => onOpen(conversation.id)} type="button">
              <strong>{conversation.organizing ? '正在整理…' : conversation.title}</strong>
              <span>{formatDate(conversation.updatedAt)} · {conversation.messages.length} 条消息</span>
              <small>{[...conversation.messages].reverse().find((message) => message.content)?.content.slice(0, 35) || '空白对话'}</small>
            </button>
            <button aria-label={`删除 ${conversation.title}`} className="icon-button subtle" onClick={() => onDelete(conversation)} title="删除对话" type="button"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </aside>
  )
}
