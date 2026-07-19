async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'request_failed')
    error.status = response.status
    throw error
  }
  return payload
}

export const cloudService = {
  session: () => request('/api/auth/session'),
  createAccount: () => request('/api/auth/create', { method: 'POST', body: '{}' }),
  restoreAccount: (credentials) =>
    request('/api/auth/restore', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: '{}' }),
  deleteAccount: () => request('/api/auth/account', { method: 'DELETE' }),
  pull: () => request('/api/sync'),
  push: (snapshot) =>
    request('/api/sync', { method: 'POST', body: JSON.stringify(snapshot) }),
  markReplyRead: (replyId) =>
    request(`/api/replies/${encodeURIComponent(replyId)}/read`, {
      method: 'POST',
      body: '{}',
    }),
}

