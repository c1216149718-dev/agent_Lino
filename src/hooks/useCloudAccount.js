import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloudService } from '../services/cloudService'

const profileStorageKey = 'lumora-profile:v1'
const defaultLocalProfile = { avatarDataUrl: null, displayName: '云栖者' }
const defaultAvatarUrl = '/lumora-assets/brand/lumora-mark.png'

function readLocalProfile() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(profileStorageKey))
    return normalizeProfile(stored)
  } catch {
    return defaultLocalProfile
  }
}

function normalizeProfile(value = {}) {
  const avatarDataUrl = typeof value.avatarDataUrl === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value.avatarDataUrl) && value.avatarDataUrl.length <= 350_000
    ? value.avatarDataUrl
    : null
  return {
    avatarDataUrl,
    displayName: String(value.displayName || defaultLocalProfile.displayName).trim().slice(0, 20) || defaultLocalProfile.displayName,
  }
}

export function useCloudAccount({ chat, mailbox }) {
  const [status, setStatus] = useState('checking')
  const [profile, setProfile] = useState(null)
  const [localProfile, setLocalProfile] = useState(readLocalProfile)
  const [recoveryCard, setRecoveryCard] = useState(null)
  const [syncStatus, setSyncStatus] = useState('local')
  const [needsImport, setNeedsImport] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(false)
  const hydratedRef = useRef(false)
  const latestRef = useRef({ chat, mailbox })
  const pendingCloudRef = useRef(null)

  const saveLocalProfile = useCallback((nextProfile) => {
    const normalized = normalizeProfile(nextProfile)
    window.localStorage.setItem(profileStorageKey, JSON.stringify(normalized))
    setLocalProfile(normalized)
    return normalized
  }, [])

  useEffect(() => {
    latestRef.current = { chat, mailbox }
  }, [chat, mailbox])

  const localSummary = useMemo(
    () => ({
      letters: mailbox.letters.length,
      memories: chat.manualMemories.length + chat.memories.length,
      messages: chat.conversations.reduce((total, conversation) => total + conversation.messages.length, 0),
      moods: mailbox.moods.length,
    }),
    [chat.conversations, chat.manualMemories.length, chat.memories.length, mailbox.letters.length, mailbox.moods.length],
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
        saveLocalProfile(user)
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
  }, [hydrate, saveLocalProfile])

  const createAccount = useCallback(async () => {
    setSyncStatus('syncing')
    const created = await cloudService.createAccount()
    const profileResult = await cloudService.updateProfile(localProfile).catch(() => created)
    const user = profileResult.user || created.user
    const result = { ...created, user }
    setProfile(user)
    saveLocalProfile(user)
    setRecoveryCard({ cloudId: created.user.cloudId || created.user.linoId, recoveryCode: created.recoveryCode })
    setStatus('connected')
    setNeedsImport(true)
    setSyncStatus('waiting')
    return result
  }, [localProfile, saveLocalProfile])

  const restoreAccount = useCallback(async (credentials) => {
    setSyncStatus('syncing')
    const result = await cloudService.restoreAccount(credentials)
    setProfile(result.user)
    saveLocalProfile(result.user)
    setStatus('connected')
    pendingCloudRef.current = await cloudService.pull()
    setNeedsImport(true)
    setSyncEnabled(false)
    setSyncStatus('waiting')
    return result
  }, [saveLocalProfile])

  const updateProfile = useCallback(async (nextProfile) => {
    const normalized = normalizeProfile(nextProfile)
    if (status === 'connected') {
      const result = await cloudService.updateProfile(normalized)
      setProfile(result.user)
      saveLocalProfile(result.user)
      return result.user
    }
    saveLocalProfile(normalized)
    return normalized
  }, [saveLocalProfile, status])

  const importLocalProfile = useCallback((nextProfile) => {
    if (!nextProfile || typeof nextProfile !== 'object') return false
    saveLocalProfile(nextProfile)
    return true
  }, [saveLocalProfile])

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
    window.localStorage.removeItem(profileStorageKey)
    setLocalProfile(defaultLocalProfile)
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
    identity: {
      avatarUrl: (profile?.avatarDataUrl || localProfile.avatarDataUrl) ?? defaultAvatarUrl,
      cloudId: profile?.cloudId || profile?.linoId || null,
      displayName: profile?.displayName || localProfile.displayName,
    },
    importLocalProfile,
    localProfile,
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
    updateProfile,
    useCloudData,
  }
}
