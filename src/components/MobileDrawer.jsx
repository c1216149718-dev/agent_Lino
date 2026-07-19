import { AnimatePresence, motion } from 'framer-motion'
import { Archive, CloudSun, MessageCircle, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import { LinoMascot } from './LinoMascot'

const items = [
  { id: 'chat', label: '对话', icon: MessageCircle },
  { id: 'mood', label: '情绪信箱', icon: CloudSun },
  { id: 'memory', label: '记忆', icon: Archive },
  { id: 'actions', label: '行动', icon: Sparkles },
  { id: 'local', label: '账户与隐私', icon: ShieldCheck },
]

export function MobileDrawer({ activeView, isOpen, onChange, onClose, onOpen, unreadCount }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen, onClose])

  return (
    <>
      <button
        aria-label="打开移动导航"
        className="mobile-drawer-handle md:hidden"
        onClick={onOpen}
        type="button"
      >
        <span aria-hidden="true" />
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="mobile-drawer-layer md:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onPointerDown={(event) => event.target === event.currentTarget && onClose()}
          >
            <motion.aside
              animate={{ x: 0 }}
              aria-label="Lino 移动导航"
              aria-modal="true"
              className="mobile-drawer-panel"
              exit={{ x: '-104%' }}
              initial={{ x: '-104%' }}
              role="dialog"
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b-[3px] border-neutral-950 pb-4">
                <div className="flex items-center gap-3">
                  <LinoMascot pose="still" size="sm" state="happy" />
                  <div>
                    <strong className="font-hand text-2xl">Lino</strong>
                    <p className="text-xs text-neutral-500">今天也在这里</p>
                  </div>
                </div>
                <button aria-label="关闭移动导航" className="message-action-button" onClick={onClose} type="button">
                  <X size={20} strokeWidth={2.6} />
                </button>
              </div>
              <nav className="mt-5 grid gap-2">
                {items.map((item) => {
                  const Icon = item.icon
                  const active = activeView === item.id
                  return (
                    <button
                      aria-current={active ? 'page' : undefined}
                      className={`mobile-drawer-item ${active ? 'is-active' : ''}`}
                      key={item.id}
                      onClick={() => onChange(item.id)}
                      type="button"
                    >
                      <Icon size={20} strokeWidth={2.5} />
                      <span>{item.label}</span>
                      {item.id === 'mood' && unreadCount ? (
                        <span className="mail-unread-count">{unreadCount}</span>
                      ) : null}
                    </button>
                  )
                })}
              </nav>
              <div className="mobile-drawer-note">
                <span className="postmark-ring" aria-hidden="true">L</span>
                <p>慢慢写。信会替你把今天留住。</p>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

