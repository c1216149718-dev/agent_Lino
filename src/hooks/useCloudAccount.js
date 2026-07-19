import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloudService } from '../services/cloudService'

export function useCloudAccount({ chat, mailbox }) {
  const [status, setStatus] = useState('checking')
  const [profile, setProfile] = useState(null)
  const [recoveryCard, setRecoveryCard] = useState(null)
  const [syncStatus, setSyncStatus] = useState('local')
  const [needsImport, setNeedsImport] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(false)
  const hydratedRef = useRef(false)
  const latestRef = useRef({ chat, mailbox })
  const pendingCloudRef = useRef(null)

  useEffect(() => {
    latestRef.current = { chat, mailbox }
  }, [chat, mailbox])

  const localSummary = useMemo(
    () => ({
      letters: mailbox.letters.length,
      memories: chat.manualMemories.length + chat.memories.length,
      messages: chat.messages.length,
      moods: mailbox.moods.length,
    }),
    [chat.manualMemories.length, chat.memories.length, chat.messages.length, mailbox.letters.length, mailbox.moods.length],
  )

  const hydrate = useCallback((payload) => {
    if (payload.chat?.version) {
      latestRef.current.chat.importLocalData(JSON.stringify(payload.chat))
    } else {
      latestRef.current.chat.clearLocalData()
    }
    if (payload.mailbox) {
      latestRef.current.mailbox.importData(payload.mailbox)
    }
    hydratedRef.current = true
    setSyncEnabled(true)
    setSyncStatus('synced')
  }, [])

  useEffect(() => {
    let active = true
    cloudService
      .session()
      .then(async ({ user }) => {
        if (!active || !user) return
        setProfile(user)
        setStatus('connected')
        setSyncStatus('syncing')
        hydrate(await cloudService.pull())
      })
      .catch(() => {
        if (active) {
          setStatus('guest')
          setSyncStatus('local')
        }
      })
    return () => {
      active = false
    }
  }, [hydrate])

  const createAccount = useCallback(async () => {
    setSyncStatus('syncing')
    const result = await cloudService.createAccount()
    setProfile(result.user)
    setRecoveryCard({ linoId: result.user.linoId, recoveryCode: result.recoveryCode })
    setStatus('connected')
    setNeedsImport(true)
    setSyncStatus('waiting')
    return result
  }, [])

  const restoreAccount = useCallback(async (credentials) => {
    setSyncStatus('syncing')
    const result = await cloudService.restoreAccount(credentials)
    setProfile(result.user)
    setStatus('connected')
    pendingCloudRef.current = await cloudService.pull()
    setNeedsImport(true)
    setSyncEnabled(false)
    setSyncStatus('waiting')
    return result
  }, [])

  const snapshot = useCallback(() => ({
    chat: JSON.parse(latestRef.current.chat.exportLocalData()),
    mailbox: latestRef.current.mailbox.exportData(),
  }), [])

  const syncNow = useCallback(async () => {
    if (status !== 'connected') return false
    setSyncStatus('syncing')
    await cloudService.push(snapshot())
    hydrate(await cloudService.pull())
    hydratedRef.current = true
    setSyncEnabled(true)
    setNeedsImport(false)
    setSyncStatus('synced')
    return true
  }, [hydrate, snapshot, status])

  const useCloudData = useCallback(() => {
    if (pendingCloudRef.current) {
      hydrate(pendingCloudRef.current)
      pendingCloudRef.current = null
    } else {
      latestRef.current.chat.clearLocalData()
      latestRef.current.mailbox.clearMailbox()
      hydratedRef.current = true
      setSyncEnabled(true)
      setSyncStatus('synced')
    }
    setNeedsImport(false)
  }, [hydrate])

  useEffect(() => {
    if (status !== 'connected' || !syncEnabled) return undefined
    const resumeSync = () => {
      syncNow().catch(() => setSyncStatus('offline'))
    }
    window.addEventListener('online', resumeSync)
    return () => window.removeEventListener('online', resumeSync)
  }, [status, syncEnabled, syncNow])

  useEffect(() => {
    if (status !== 'connected' || !syncEnabled || !hydratedRef.current) {
      return undefined
    }
    const timerId = window.setTimeout(() => {
      setSyncStatus('syncing')
      cloudService.push(snapshot()).then(
        () => setSyncStatus('synced'),
        () => setSyncStatus('offline'),
      )
    }, 1400)
    return () => window.clearTimeout(timerId)
  }, [chat, mailbox, snapshot, status, syncEnabled])

  const logout = useCallback(async () => {
    await cloudService.logout().catch(() => undefined)
    setProfile(null)
    setStatus('guest')
    setSyncEnabled(false)
    setSyncStatus('local')
    hydratedRef.current = false
  }, [])

  const deleteAccount = useCallback(async () => {
    await cloudService.deleteAccount()
    latestRef.current.chat.clearLocalData()
    latestRef.current.mailbox.clearMailbox()
    setProfile(null)
    setStatus('guest')
    setSyncEnabled(false)
    setSyncStatus('local')
  }, [])

  const markReplyRead = useCallback(async (replyId) => {
    latestRef.current.mailbox.markReplyRead(replyId)
    if (status === 'connected') {
      await cloudService.markReplyRead(replyId).catch(() => undefined)
    }
  }, [status])

  return {
    closeRecoveryCard: () => setRecoveryCard(null),
    createAccount,
    deleteAccount,
    localSummary,
    logout,
    markReplyRead,
    needsImport,
    profile,
    recoveryCard,
    restoreAccount,
    status,
    syncNow,
    syncStatus,
    useCloudData,
  }
}
