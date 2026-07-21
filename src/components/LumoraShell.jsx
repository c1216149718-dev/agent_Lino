import { AnimatePresence, motion } from 'framer-motion'
import { Archive, ChevronRight, Menu, MessageCirclePlus, Settings, Trash2, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { SPIRIT_IDS, getSpirit, navItems } from '../data/lumora'
import { AccountView } from './AccountView'
import { ActionsView } from './ActionsView'
import { ChatView } from './ChatView'
import { CloudTransition } from './CloudTransition'
import { ConversationSidebar } from './ConversationSidebar'
import { MemoryView } from './MemoryView'
import { RecordView } from './RecordView'
import { SpiritAsset } from './SpiritAsset'
import { SpiritSelectPage } from './SpiritSelectPage'

function ConversationLibrary({ chat, onDelete, onNew, onOpen }) {
  const spirit = getSpirit(chat.selectedSpiritId || 'lino')
  const conversations = chat.conversationsBySpirit[spirit.id] ?? []
  return (
    <section className="conversation-library" style={{ '--spirit-color': spirit.color, '--spirit-soft': spirit.soft }}>
      <div className="library-hero"><SpiritAsset spiritId={spirit.id} /><div><span className="eyebrow"><Archive size={14} />{spirit.name} 的对话库</span><h1>想继续哪一段对话？</h1><p>打开历史只会阅读；建立新对话才会结束当前边界并开始新的一次。</p><button className="primary-button" disabled={chat.isResponding} onClick={onNew} type="button"><MessageCirclePlus size={17} />建立新对话</button></div></div>
      <div className="library-list">{conversations.length === 0 ? <p className="large-empty">这里还没有对话。第一句可以很简单，比如“今天有点累”。</p> : conversations.map((conversation) => <article className="library-card" key={conversation.id}><button onClick={() => onOpen(conversation.id)} type="button"><SpiritAsset avatar spiritId={spirit.id} /><div><span>{new Date(conversation.updatedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><h2>{conversation.organizing ? '正在整理…' : conversation.title}</h2><p>{[...conversation.messages].reverse().find((message) => message.content)?.content.slice(0, 70) || '空白对话'}</p><small>{conversation.messages.length} 条消息</small></div><ChevronRight size={20} /></button><button aria-label={`删除 ${conversation.title}`} className="icon-button subtle" onClick={() => onDelete(conversation)} type="button"><Trash2 size={16} /></button></article>)}</div>
    </section>
  )
}

function Brand() {
  return <div className="lumora-brand"><img alt="" src="/lumora-assets/brand/lumora-mark.png" /><div><strong>云栖境</strong><span>Lumora</span></div></div>
}

export function LumoraShell({ account, chat, mailbox }) {
  const [page, setPage] = useState('chat')
  const [libraryOnly, setLibraryOnly] = useState(!chat.activeConversation)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [pendingPage, setPendingPage] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [transitionSpiritId, setTransitionSpiritId] = useState('lino')

  const navigate = useCallback((nextPage) => {
    if (nextPage === page) { setDrawerOpen(false); return }
    setTransitionSpiritId(SPIRIT_IDS[Math.floor(Math.random() * SPIRIT_IDS.length)])
    setPendingPage(nextPage)
    setTransitioning(true)
    setDrawerOpen(false)
  }, [page])
  const finishTransition = useCallback(() => {
    if (pendingPage) setPage(pendingPage)
    setPendingPage(null)
    setTransitioning(false)
  }, [pendingPage])
  const newConversation = (spiritId = chat.selectedSpiritId) => {
    const id = chat.newConversation(spiritId)
    if (id) { setLibraryOnly(false); setPage('chat') }
  }
  const openConversation = (id) => { chat.openConversation(id); setLibraryOnly(false); setPage('chat') }
  const chooseSpirit = (id) => { chat.selectSpirit(id); setLibraryOnly(true); navigate('chat') }
  const beginAction = (id, prompt) => {
    chat.selectSpirit(id)
    const conversationId = chat.newConversation(id)
    if (conversationId) chat.sendMessage(prompt, { conversationId, spiritId: id })
    setLibraryOnly(false)
    navigate('chat')
  }
  const confirmDelete = () => {
    if (!deleteTarget) return
    chat.deleteConversation(deleteTarget.id)
    setDeleteTarget(null)
  }
  const selectedSpirit = getSpirit(chat.selectedSpiritId || 'lino')

  return (
    <div className="lumora-app" style={{ '--current-spirit': selectedSpirit.color, '--current-soft': selectedSpirit.soft }}>
      <header className="site-header">
        <button className="mobile-menu-button" aria-label="打开导航" onClick={() => setDrawerOpen(true)} type="button"><Menu size={23} /></button>
        <button className="brand-button" onClick={() => navigate('chat')} type="button"><Brand /></button>
        <nav aria-label="主导航">{navItems.map((item) => <button className={page === item.id ? 'is-active' : ''} key={item.id} onClick={() => navigate(item.id)} type="button">{item.label}{item.id === 'record' && mailbox.unreadReplies.length > 0 && <span className="nav-badge">{mailbox.unreadReplies.length}</span>}</button>)}</nav>
        <div className="header-tools"><button className="current-spirit-button" onClick={() => navigate('spirits')} type="button"><SpiritAsset avatar spiritId={selectedSpirit.id} /><span>{selectedSpirit.name}</span></button><button aria-label="账户与隐私" className="icon-button" onClick={() => navigate('account')} title="账户与隐私" type="button"><Settings size={18} /></button></div>
      </header>

      <AnimatePresence>{drawerOpen && <motion.div className="mobile-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)}><motion.aside className="mobile-drawer" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><Brand /><button className="icon-button" onClick={() => setDrawerOpen(false)} type="button"><X size={19} /></button></div><div className="drawer-spirit"><SpiritAsset spiritId={selectedSpirit.id} /><strong>{selectedSpirit.name}</strong><span>{selectedSpirit.realm}</span></div>{navItems.map((item) => <button className={page === item.id ? 'is-active' : ''} key={item.id} onClick={() => navigate(item.id)} type="button">{item.label}{item.id === 'record' && mailbox.unreadReplies.length > 0 && <span>{mailbox.unreadReplies.length}</span>}</button>)}<button onClick={() => navigate('account')} type="button">账户与隐私</button></motion.aside></motion.div>}</AnimatePresence>

      <main className={`app-main page-${page}`} id="main-content">
        {page === 'chat' && <div className="chat-shell"><ConversationSidebar activeId={chat.activeConversationId} conversations={chat.conversationsBySpirit[selectedSpirit.id] ?? []} isResponding={chat.isResponding} onDelete={setDeleteTarget} onNew={() => newConversation()} onOpen={openConversation} spiritId={selectedSpirit.id} /><div className="chat-main-panel">{libraryOnly ? <ConversationLibrary chat={chat} onDelete={setDeleteTarget} onNew={() => newConversation()} onOpen={openConversation} /> : <ChatView chat={chat} onDelete={setDeleteTarget} onShowHistory={() => setLibraryOnly(true)} />}</div></div>}
        {page === 'record' && <RecordView account={account} mailbox={mailbox} selectedSpiritId={selectedSpirit.id} />}
        {page === 'memory' && <MemoryView chat={chat} mailbox={mailbox} onDelete={setDeleteTarget} onOpenConversation={openConversation} />}
        {page === 'actions' && <ActionsView onBegin={beginAction} />}
        {page === 'spirits' && <SpiritSelectPage currentSpiritId={selectedSpirit.id} onSelect={chooseSpirit} />}
        {page === 'account' && <AccountView account={account} chat={chat} mailbox={mailbox} />}
      </main>

      {deleteTarget && <div className="modal-backdrop" onMouseDown={() => setDeleteTarget(null)} role="presentation"><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><h2>删除这次对话？</h2><p><strong>{deleteTarget.title}</strong><br />{new Date(deleteTarget.updatedAt).toLocaleString('zh-CN')} · {deleteTarget.messages.length} 条消息</p><p>对应的自动摘要、收藏片段和关联记忆也会一同移除。固定记忆不会受影响。</p><div className="modal-actions"><button className="secondary-button" onClick={() => setDeleteTarget(null)} type="button">取消</button><button className="danger-button" onClick={confirmDelete} type="button"><Trash2 size={16} />确认删除</button></div></div></div>}
      {chat.lastDeleted && <div className="undo-toast"><span>对话和关联记忆已删除</span><button onClick={chat.restoreLastDeleted} type="button">撤销</button></div>}
      <CloudTransition active={transitioning} onComplete={finishTransition} spiritId={transitionSpiritId} />
    </div>
  )
}
