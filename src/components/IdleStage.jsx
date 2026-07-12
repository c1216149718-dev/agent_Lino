import { motion } from 'framer-motion'
import { ChevronDown, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Composer } from './Composer'
import { LinoMascot } from './LinoMascot'

export function IdleStage({ onBegin }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isMenuOpen])

  return (
    <motion.section
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex min-h-svh items-center justify-center px-4 py-5 sm:px-6"
      exit={{ opacity: 0, scale: 0.98 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.44, ease: 'easeOut' }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="doodle-page-frame relative flex min-h-[min(880px,calc(100svh-2.5rem))] w-full max-w-[760px] flex-col overflow-hidden rounded-[2.2rem] bg-white/[0.82] px-6 py-6 sm:px-10 sm:py-8"
        initial={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <header className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LinoMascot pose="still" size="sm" state="idle" />
            <span className="font-hand text-3xl font-semibold text-neutral-950">Lino</span>
          </div>
          <button
            aria-controls="entry-action-menu"
            aria-expanded={isMenuOpen}
            aria-label="打开菜单"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-neutral-950 transition hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <Menu size={25} strokeWidth={2.5} />
          </button>
          {isMenuOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+0.7rem)] z-30 w-48 border-[3px] border-neutral-950 bg-white p-2 shadow-[5px_6px_0_rgba(10,10,10,0.14)]"
              id="entry-action-menu"
              role="menu"
            >
              <button
                className="w-full px-3 py-2 text-left text-sm font-semibold text-neutral-950 transition hover:bg-neutral-950 hover:text-white"
                onClick={() => onBegin('')}
                role="menuitem"
                type="button"
              >
                进入对话空间
              </button>
            </div>
          ) : null}
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center pb-12">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="lino-entry-orbit relative mb-5 flex items-center justify-center"
            initial={{ opacity: 0, y: 18 }}
            transition={{ delay: 0.14, duration: 0.52, ease: 'easeOut' }}
          >
            <div className="idle-comic-stage comic-rays--tapered" aria-hidden="true" />
            <LinoMascot layoutId="lino-entry" pose="rest" size="xl" state="idle" />
          </motion.div>
          <motion.div
            className="w-full max-w-[520px]"
            layoutId="conversation-frame"
            transition={{ type: 'spring', stiffness: 155, damping: 22, mass: 0.8 }}
          >
            <Composer
              className="h-[72px] rounded-[1.75rem] px-5"
              onSubmit={onBegin}
              placeholder="请和我对话吧"
            />
          </motion.div>
        </div>

        <div className="relative z-10 flex justify-center pb-5 text-neutral-950">
          <ChevronDown size={28} strokeWidth={2.8} />
        </div>
      </motion.div>
    </motion.section>
  )
}
