import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const sizeClasses = {
  xs: 'h-11 w-11',
  sm: 'h-14 w-14',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-44 w-44',
}

const spriteByState = {
  idle: { row: 0, column: 0 },
  happy: { row: 0, column: 1 },
  playful: { row: 0, column: 2 },
  curious: { row: 1, column: 0 },
  shy: { row: 1, column: 1 },
  surprised: { row: 1, column: 2 },
  thinking: { row: 2, column: 0 },
  proud: { row: 2, column: 1 },
  sleepy: { row: 2, column: 2 },
}

const poseAnimations = {
  rest: {
    y: [0, -5, 0],
    rotate: [-0.4, 0.4, -0.4],
    transition: { duration: 4.4, repeat: Infinity, ease: 'easeInOut' },
  },
  idle: {
    y: [0, -4, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
  playful: {
    y: [0, -8, 0, -3, 0],
    rotate: [0, -4, 4, -1, 0],
    transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
  },
  happy: {
    y: [0, -12, 1, 0],
    scaleX: [1, 1.03, 1.06, 1],
    scaleY: [1, 1.06, 0.94, 1],
    transition: { duration: 1.55, repeat: Infinity, repeatDelay: 0.6 },
  },
  curious: {
    y: [0, -3, 0],
    rotate: [0, -4, -4, 0],
    transition: { duration: 2.8, repeat: Infinity, repeatDelay: 0.5 },
  },
  shy: {
    y: [0, 3, 0],
    rotate: [-1.5, 1.5, -1.5],
    scale: [1, 0.975, 1],
    transition: { duration: 2.7, repeat: Infinity, ease: 'easeInOut' },
  },
  surprised: {
    y: [0, 5, -5, 0],
    scale: [1, 0.92, 1.08, 1],
    transition: { duration: 0.72, repeat: Infinity, repeatDelay: 2.1 },
  },
  thinking: {
    y: [0, -5, 0],
    rotate: [0, -3, 1, 0],
    transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
  },
  proud: {
    y: [0, -9, 0],
    rotate: [0, 2.5, 0],
    scale: [1, 1.055, 1],
    transition: { duration: 1.05, repeat: Infinity, repeatDelay: 1.2 },
  },
  sleepy: {
    y: [0, 3, 6, 0],
    rotate: [0, 1.8, 0],
    scaleY: [1, 0.98, 0.94, 1],
    transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
  },
  fly: {
    x: [0, 78, 150],
    y: [0, -82, -10],
    rotate: [0, -10, 7],
    scale: [1, 0.96, 0.8],
    transition: { duration: 0.92, ease: [0.2, 0.9, 0.2, 1] },
  },
  tap: {
    y: [0, -4, 0],
    rotate: [0, -3, 3, 0],
    transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
  },
  header: {
    y: [0, -3, 0],
    transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
  },
  listening: {
    y: [0, -3, 0],
    rotate: [0, -1.2, 0.8, 0],
    transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
  },
  complete: {
    y: [0, -10, 0],
    rotate: [0, 2.8, 0],
    scale: [1, 1.06, 1],
    transition: { duration: 0.9, repeat: Infinity, repeatDelay: 1.35 },
  },
  reacting: {
    y: [0, -8, 0, -3, 0],
    rotate: [0, -5, 4, 0],
    transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
  },
  mood: {
    y: [0, -3, 0],
    rotate: [0, -1.8, 1.2, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
  },
  searching: {
    x: [0, -4, 4, 0],
    y: [0, -2, 0],
    rotate: [0, -3, 3, 0],
    transition: { duration: 2.1, repeat: Infinity, ease: 'easeInOut' },
  },
  saving: {
    y: [0, -6, 0],
    scale: [1, 0.95, 1.05, 1],
    transition: { duration: 0.72, repeat: Infinity, ease: 'easeInOut' },
  },
  'execute-ready': {
    x: [0, 3, 0],
    y: [0, -5, 0],
    rotate: [0, 2.5, 0],
    transition: { duration: 1.45, repeat: Infinity, ease: 'easeInOut' },
  },
  guarding: {
    y: [0, -2, 0],
    rotate: [0, -1, 1, 0],
    scale: [1, 1.025, 1],
    transition: { duration: 3.1, repeat: Infinity, ease: 'easeInOut' },
  },
}

export function LinoMascot({
  className = '',
  activity,
  expression,
  layoutId,
  pose,
  size = 'lg',
  state = 'idle',
  view = 'front',
}) {
  const shouldReduceMotion = useReducedMotion()
  const activeState = spriteByState[state] ? state : 'idle'
  const activeExpression = expression ?? activeState
  const activePose = pose ?? state
  const activeActivity = activity ?? activePose
  const animation =
    shouldReduceMotion || activeActivity === 'still' ? undefined : poseAnimations[activeActivity]
  const sprite = spriteByState[activeState]

  return (
    <motion.div
      aria-label={`Lino ${activeState} ${view} ${activeExpression}`}
      animate={animation}
      className={`lino-mascot relative ${sizeClasses[size]} ${className}`}
      data-expression={activeExpression}
      data-activity={activeActivity}
      data-size={size}
      data-sprite-background="transparent"
      data-sprite-column={sprite.column}
      data-sprite-row={sprite.row}
      data-state={activeState}
      initial={false}
      layoutId={layoutId}
      role="img"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          aria-hidden="true"
          className="lino-sprite-frame"
          exit={shouldReduceMotion ? undefined : { opacity: 0, rotate: 2, scale: 0.9 }}
          initial={
            shouldReduceMotion ? false : { opacity: 0, rotate: -2, scale: 0.86 }
          }
          key={activeState}
          transition={{ type: 'spring', stiffness: 310, damping: 22, mass: 0.65 }}
        >
          <img
            alt=""
            className="lino-state-sprite"
            draggable="false"
            src="/lino-assets/lino-nine-states-transparent.png"
            style={{
              '--lino-sprite-column': sprite.column,
              '--lino-sprite-row': sprite.row,
            }}
          />
        </motion.span>
      </AnimatePresence>
    </motion.div>
  )
}
