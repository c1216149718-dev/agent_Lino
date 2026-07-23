import { Camera, Cloud, CloudCheck, Download, LogOut, RefreshCw, ShieldCheck, Trash2, Upload, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { BRAND_ICON_URL } from '../data/assets'
import { ResilientImage } from './ResilientImage'

const defaultAvatarUrl = BRAND_ICON_URL

async function prepareAvatar(file) {
  if (!file?.type.startsWith('image/')) throw new Error('请选择图片文件。')
  if (file.size > 8 * 1024 * 1024) throw new Error('图片不能超过 8 MB。')
  let bitmap
  let objectUrl
  if ('createImageBitmap' in window) {
    bitmap = await createImageBitmap(file)
  } else {
    objectUrl = URL.createObjectURL(file)
    bitmap = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('无法读取这张图片。'))
      image.src = objectUrl
    })
  }
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  const side = Math.min(bitmap.width, bitmap.height)
  const sourceX = (bitmap.width - side) / 2
  const sourceY = (bitmap.height - side) / 2
  context.fillStyle = '#fffdf8'
  context.fillRect(0, 0, 256, 256)
  context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, 256, 256)
  bitmap.close?.()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  const dataUrl = canvas.toDataURL('image/webp', 0.82)
  if (dataUrl.length > 350_000) throw new Error('处理后的图片仍然太大，请换一张图片。')
  return dataUrl
}

const syncLabels = {
  checking: '正在确认账户…',
  local: '仅保存在本机',
  offline: '等待网络恢复',
  synced: '云端内容已同步',
  syncing: '正在同步…',
  waiting: '等待选择数据来源',
}

export function AccountView({ account, chat, mailbox }) {
  const [restoreId, setRestoreId] = useState('')
  const [restoreCode, setRestoreCode] = useState('')
  const [displayName, setDisplayName] = useState(account.identity.displayName)
  const [avatarDataUrl, setAvatarDataUrl] = useState(account.identity.avatarUrl === defaultAvatarUrl ? null : account.identity.avatarUrl)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const avatarRef = useRef(null)

  const saveProfile = async (event) => {
    event.preventDefault()
    const nextName = displayName.trim()
    if (!nextName) { setNotice('请输入用户名。'); return }
    setSaving(true)
    try {
      await account.updateProfile({ avatarDataUrl, displayName: nextName })
      setNotice(account.status === 'connected' ? '个人资料已保存到云端。' : '个人资料已保存在本机。')
    } catch {
      setNotice('暂时无法保存个人资料，请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  const selectAvatar = async (file) => {
    if (!file) return
    try {
      setAvatarDataUrl(await prepareAvatar(file))
      setNotice('头像已准备好，点击“保存资料”完成修改。')
    } catch (error) {
      setNotice(error.message || '无法读取这张图片。')
    }
  }

  const download = () => {
    const payload = JSON.stringify({
      chat: JSON.parse(chat.exportLocalData()),
      exportedAt: new Date().toISOString(),
      mailbox: mailbox.exportData(),
      profile: account.localProfile,
    }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `lumora-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file) => {
    try {
      const payload = JSON.parse(await file.text())
      const chatOk = chat.importLocalData(payload.chat)
      const mailboxOk = mailbox.importData(payload.mailbox)
      if (payload.profile) account.importLocalProfile(payload.profile)
      setNotice(chatOk && mailboxOk ? '本地数据与个人资料已导入。' : '这份文件无法识别。')
    } catch {
      setNotice('这份文件无法识别。')
    }
  }

  return (
    <section className="content-page account-page">
      <div className="page-heading"><span className="eyebrow"><ShieldCheck size={14} />个人账户</span><h1>你的云端栖居地</h1><p>设置自己的名字与头像，也可以用云栖 ID 在不同设备间找回这里的一切。</p></div>
      <div className="account-grid">
        <form className="paper-panel profile-editor" onSubmit={saveProfile}>
          <div className="profile-avatar-editor">
            <ResilientImage alt="当前用户头像" loading="eager" src={avatarDataUrl || defaultAvatarUrl} />
            <button aria-label="上传头像" className="avatar-upload-button" onClick={() => avatarRef.current?.click()} title="上传头像" type="button"><Camera size={19} /></button>
            <input accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { selectAvatar(event.target.files?.[0]); event.target.value = '' }} ref={avatarRef} type="file" />
          </div>
          <div className="profile-fields">
            <span className="eyebrow"><UserRound size={14} />我的资料</span>
            <label htmlFor="display-name">用户名</label>
            <input id="display-name" maxLength={20} onChange={(event) => setDisplayName(event.target.value)} placeholder="云栖者" value={displayName} />
            <small>{displayName.trim().length}/20 · 这个名称会显示在页头和账户入口。</small>
          </div>
          <div className="profile-actions">
            <button className="secondary-button" disabled={!avatarDataUrl} onClick={() => setAvatarDataUrl(null)} type="button"><RefreshCw size={16} />恢复默认头像</button>
            <button className="primary-button" disabled={saving} type="submit">{saving ? '正在保存…' : '保存资料'}</button>
          </div>
        </form>

        <section className="paper-panel account-status">
          {account.status === 'connected' ? <CloudCheck size={28} /> : <Cloud size={28} />}
          <div><strong>{account.status === 'connected' ? '已连接云端' : '当前仅保存在本机'}</strong><p>{account.identity.cloudId ? `云栖 ID：${account.identity.cloudId}` : '创建云栖 ID 与恢复卡后，即可在其他设备找回数据。'}</p><span className={`sync-state is-${account.syncStatus}`}>{syncLabels[account.syncStatus] || '同步状态未知'}</span></div>
          {account.status === 'connected' ? <button className="secondary-button" disabled={account.syncStatus === 'syncing' || account.needsImport} onClick={() => account.syncNow().catch(() => setNotice('同步未完成，请稍后重试。'))} type="button">立即同步</button> : <button className="primary-button" disabled={account.status === 'checking'} onClick={() => account.createAccount().catch(() => setNotice('暂时无法创建云端账户。'))} type="button">创建云栖 ID</button>}
        </section>

        {account.needsImport && <section className="cloud-choice-panel"><div><strong>选择这次使用哪份数据</strong><p>本机有 {account.localSummary.messages} 条消息、{account.localSummary.memories} 条记忆、{account.localSummary.letters} 封信和 {account.localSummary.moods} 条心情记录。</p></div><div><button className="primary-button" onClick={() => account.syncNow().catch(() => setNotice('本机数据暂时无法上传。'))} type="button">上传本机数据</button><button className="secondary-button" onClick={account.useCloudData} type="button">使用云端数据</button></div></section>}

        {account.recoveryCard && <section className="recovery-card"><strong>请保存这张恢复卡</strong><p>它只展示一次。云栖 ID 和恢复码需要一起使用。</p><code>{account.recoveryCard.cloudId}</code><code>{account.recoveryCard.recoveryCode}</code><button className="primary-button" onClick={account.closeRecoveryCard} type="button">我已妥善保存</button></section>}

        {account.status !== 'connected' && <form className="paper-panel restore-form" onSubmit={(event) => { event.preventDefault(); account.restoreAccount({ cloudId: restoreId, recoveryCode: restoreCode }).then(({ user }) => { setDisplayName(user.displayName || '云栖者'); setAvatarDataUrl(user.avatarDataUrl || null) }).catch(() => setNotice('恢复卡不匹配，请检查后再试。')) }}><h2>用恢复卡登录</h2><label htmlFor="cloud-id">云栖 ID</label><input id="cloud-id" onChange={(event) => setRestoreId(event.target.value)} placeholder="LUMO-XXXX-XXXX 或旧版 ID" value={restoreId} /><label htmlFor="recovery-code">恢复码</label><input id="recovery-code" onChange={(event) => setRestoreCode(event.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" value={restoreCode} /><button className="secondary-button" type="submit">恢复账户</button></form>}

        <section className="paper-panel data-tools"><h2>本地数据</h2><div><button className="secondary-button" onClick={download} type="button"><Download size={17} />导出备份</button><button className="secondary-button" onClick={() => fileRef.current?.click()} type="button"><Upload size={17} />导入备份</button><input accept="application/json" className="sr-only" onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])} ref={fileRef} type="file" /></div><p>备份包含个人资料、对话、对话记忆、心情与信件。请妥善保存。</p></section>

        {account.status === 'connected' && <section className="danger-zone"><h2>账户操作</h2><button className="secondary-button" onClick={account.logout} type="button"><LogOut size={17} />退出登录</button><button className="danger-button" onClick={() => window.confirm('确定删除云端账户和全部云端数据吗？此操作无法撤销。') && account.deleteAccount()} type="button"><Trash2 size={17} />删除云端账户</button></section>}
      </div>
      {notice && <p aria-live="polite" className="inline-notice">{notice}</p>}
    </section>
  )
}
