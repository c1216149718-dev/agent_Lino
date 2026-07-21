import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { getSpirit } from '../data/lumora'
import { SpiritAsset } from './SpiritAsset'

export function CloudTransition({ active, onComplete, spiritId }) {
  const reduced = useReducedMotion()
  const spirit = getSpirit(spiritId)

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setTimeout(onComplete, reduced ? 180 : 620)
    return () => window.clearTimeout(timer)
  }, [active, onComplete, reduced])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          className="cloud-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.12 : 0.2 }}
        >
          <motion.div
            className="cloud-gate"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.78, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: reduced ? 0.12 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <SpiritAsset className="cloud-gate-spirit" spiritId={spiritId} />
            <span>{spirit.name} 正穿过云门</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
