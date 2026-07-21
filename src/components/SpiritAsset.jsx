import { motion } from 'framer-motion'
import { avatarMoodMap, spiritAsset } from '../data/lumora'

export function SpiritAsset({ avatar = false, className = '', mood, spiritId, motionKey = '' }) {
  const state = avatar
    ? `avatar-${avatarMoodMap[mood] ?? 'neutral'}`
    : mood
      ? `mood-${mood}`
      : 'base'
  return (
    <motion.img
      key={`${spiritId}-${state}-${motionKey}`}
      alt=""
      className={`spirit-asset ${className}`}
      draggable="false"
      initial={{ opacity: 0, scale: 0.96, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      src={spiritAsset(spiritId, state)}
    />
  )
}
