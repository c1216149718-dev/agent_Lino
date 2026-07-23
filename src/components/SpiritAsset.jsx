import { motion } from 'framer-motion'
import { avatarMoodMap, spiritAsset } from '../data/lumora'
import { useResilientImage } from '../hooks/useResilientImage'

function SpiritAssetImage({ className, motionKey, priority, source, spiritId, state }) {
  const image = useResilientImage(source)
  return (
    <motion.img
      key={`${spiritId}-${state}-${motionKey}`}
      alt=""
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`spirit-asset ${className}`}
      data-image-status={image.status}
      decoding="async"
      draggable="false"
      fetchPriority={priority ? 'high' : 'auto'}
      initial={{ opacity: 0, scale: 0.96, y: 5 }}
      loading={priority ? 'eager' : 'lazy'}
      onError={image.handleError}
      onLoad={image.handleLoad}
      src={image.resolvedSrc}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    />
  )
}

export function SpiritAsset({ avatar = false, className = '', mood, spiritId, motionKey = '', priority = false }) {
  const state = avatar
    ? `avatar-${avatarMoodMap[mood] ?? 'neutral'}`
    : mood
      ? `mood-${mood}`
      : 'base'
  return (
    <SpiritAssetImage
      key={`${spiritId}-${state}-${motionKey}`}
      className={className}
      motionKey={motionKey}
      priority={priority}
      source={spiritAsset(spiritId, state)}
      spiritId={spiritId}
      state={state}
    />
  )
}
