import { Bookmark, CalendarDays, MessageCircle, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SPIRIT_IDS, getSpirit } from '../data/lumora'
import { SpiritAsset } from './SpiritAsset'

export function MemoryView({ chat, mailbox, onDelete, onOpenConversation }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const memories = useMemo(() => chat.conversationMemories
    .filter((memory) => filter === 'all' || memory.spiritId === filter)
    .filter((memory) => !query.trim() || `${memory.title} ${memory.summary} ${(memory.keyPoints || []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [chat.conversationMemories, filter, query])
  return (
    <section className="content-page memory-page">
      <div className="page-heading"><span className="eyebrow"><Bookmark size={14} />回忆馆</span><h1>我的回忆</h1><p>每次完整对话会被整理成一张记忆卡，原话仍留在只读历史中。</p></div>
      <div className="memory-toolbar"><div className="filter-pills"><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')} type="button">全部</button>{SPIRIT_IDS.map((id) => <button className={filter === id ? 'is-active' : ''} key={id} onClick={() => setFilter(id)} type="button"><SpiritAsset avatar spiritId={id} />{getSpirit(id).name}</button>)}</div><button aria-expanded={searchOpen} aria-label="搜索回忆" className="icon-button" onClick={() => setSearchOpen((value) => !value)} type="button"><Search size={18} /></button></div>
      {searchOpen && <div className="memory-search"><Search size={16} /><input aria-label="回忆关键词" autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、摘要或关键词" value={query} /><button className="text-button" onClick={() => { setQuery(''); setSearchOpen(false) }} type="button">关闭</button></div>}
      {memories.length === 0 ? <div className="large-empty"><MessageCircle size={32} /><h2>还没有对话记忆</h2><p>建立新对话时，上一段有内容的对话会自动整理到这里。</p></div> : <div className="memory-card-grid">{memories.map((memory) => {
        const conversation = chat.conversations.find((item) => item.id === memory.conversationId)
        return <article className="memory-card" key={memory.id} style={{ '--spirit-color': getSpirit(memory.spiritId).color, '--spirit-soft': getSpirit(memory.spiritId).soft }}><div className="memory-card-top"><SpiritAsset spiritId={memory.spiritId} /><div><span><CalendarDays size={13} />{new Date(memory.createdAt).toLocaleDateString('zh-CN')}</span><h2>{memory.title}</h2></div></div><p>{memory.summary}</p><div className="memory-tags">{memory.keyPoints?.slice(0, 3).map((point) => <span key={point}>{point}</span>)}</div><div className="memory-card-actions"><button onClick={() => onOpenConversation(memory.conversationId)} type="button">回到原对话</button><button aria-label="删除对应对话和记忆" className="icon-button subtle" onClick={() => conversation && onDelete(conversation)} type="button"><Trash2 size={16} /></button></div></article>
      })}</div>}
      <section className="fixed-memories"><h2>固定记忆</h2><p>这些是你主动保存的长期信息，不会因删除对话而消失。</p>{chat.sharedMemories.length === 0 ? <span className="empty-note">暂时没有固定记忆。</span> : chat.sharedMemories.map((memory) => <div className="fixed-memory-row" key={memory.id}><span>{memory.content}</span><button aria-label="删除固定记忆" className="icon-button subtle" onClick={() => chat.removeManualMemory(memory.id)} type="button"><Trash2 size={15} /></button></div>)}</section>
      {mailbox.moods.length > 0 && <section className="mood-trail"><h2>最近的心情印记</h2><div>{mailbox.moods.slice(-7).map((mood) => <span key={mood.id}><SpiritAsset avatar mood={mood.moodId} spiritId={mood.spiritId || 'lino'} />{mood.localDate.slice(5)}</span>)}</div></section>}
    </section>
  )
}
