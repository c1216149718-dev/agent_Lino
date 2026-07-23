import { useEffect, useRef, useState } from 'react'
import { BRAND_ICON_URL } from '../data/assets'

function withRetryToken(source, attempt) {
  if (!source || attempt === 0 || /^(?:blob:|data:)/.test(source)) return source
  const separator = source.includes('?') ? '&' : '?'
  return `${source}${separator}lumoraRetry=${attempt}`
}

export function useResilientImage(source, {
  fallbackSrc = BRAND_ICON_URL,
  retries = 2,
  retryDelay = 350,
} = {}) {
  const [resolvedSrc, setResolvedSrc] = useState(source)
  const [status, setStatus] = useState('loading')
  const [usingFallback, setUsingFallback] = useState(false)
  const preloaderRef = useRef(null)
  const retryingRef = useRef(false)
  const retryTimerRef = useRef(null)

  useEffect(() => () => {
    window.clearTimeout(retryTimerRef.current)
    if (preloaderRef.current) {
      preloaderRef.current.onload = null
      preloaderRef.current.onerror = null
    }
  }, [])

  const retryable = Boolean(source) && !/^(?:blob:|data:)/.test(source)

  const showFallback = () => {
    retryingRef.current = false
    if (fallbackSrc && fallbackSrc !== source) {
      setUsingFallback(true)
      setResolvedSrc(fallbackSrc)
      setStatus('fallback')
    } else {
      setStatus('error')
    }
  }

  const preloadAttempt = (attempt) => {
    retryTimerRef.current = window.setTimeout(() => {
      const candidate = withRetryToken(source, attempt)
      const preloader = new Image()
      preloaderRef.current = preloader
      preloader.decoding = 'async'
      preloader.onload = () => {
        retryingRef.current = false
        setResolvedSrc(candidate)
        setStatus('loaded')
      }
      preloader.onerror = () => {
        if (attempt < retries) preloadAttempt(attempt + 1)
        else showFallback()
      }
      preloader.src = candidate
    }, retryDelay * (2 ** (attempt - 1)))
  }

  const handleLoad = () => {
    setStatus(usingFallback ? 'fallback' : 'loaded')
  }

  const handleError = () => {
    window.clearTimeout(retryTimerRef.current)
    if (!usingFallback && retryable && retries > 0 && !retryingRef.current) {
      retryingRef.current = true
      setStatus('loading')
      preloadAttempt(1)
      return
    }
    if (retryingRef.current) {
      return
    }
    showFallback()
  }

  return { handleError, handleLoad, resolvedSrc, status }
}
