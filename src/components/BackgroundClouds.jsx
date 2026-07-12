import { motion } from 'framer-motion'

const clouds = [
  'left-[6%] top-[16%] h-24 w-52 opacity-70',
  'right-[9%] top-[12%] h-20 w-44 opacity-60',
  'bottom-[18%] left-[18%] h-28 w-64 opacity-65',
  'bottom-[10%] right-[12%] h-24 w-56 opacity-55',
]

export function BackgroundClouds() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {clouds.map((cloudClass, index) => (
        <motion.span
          className={`soft-cloud ${cloudClass}`}
          key={cloudClass}
          animate={{ x: [0, index % 2 === 0 ? 12 : -10, 0], y: [0, -8, 0] }}
          transition={{
            duration: 16 + index * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white via-white/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/80 to-transparent" />
    </div>
  )
}
