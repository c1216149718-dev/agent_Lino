import { useEffect, useState } from 'react'
import { SPIRIT_IDS, spiritAsset } from '../data/lumora'

const BOOT_ASSETS = [
  '/lumora-assets/brand/lumora-mark.png',
  ...SPIRIT_IDS.map((spiritId) => spiritAsset(spiritId, 'base')),
]

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image()
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    image.decoding = 'async'
    image.onload = async () => {
      try {
        await image.decode?.()
      } catch {
        // A completed load is enough when decode is unavailable or rejects.
      }
      finish()
    }
    image.onerror = finish
    image.src = src
    window.setTimeout(finish, 4_000)
  })
}

export function useLumoraBoot() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    const startedAt = performance.now()
    const forceReadyTimer = window.setTimeout(() => {
      if (active) setReady(true)
    }, 5_000)

    const fontReady = document.fonts?.ready ?? Promise.resolve()
    Promise.allSettled([fontReady, ...BOOT_ASSETS.map(preloadImage)]).then(() => {
      const remaining = Math.max(0, 1_050 - (performance.now() - startedAt))
      window.setTimeout(() => {
        if (active) setReady(true)
      }, remaining)
    })

    return () => {
      active = false
      window.clearTimeout(forceReadyTimer)
    }
  }, [])

  return ready
}
