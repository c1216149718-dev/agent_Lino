import { Cloud, Download, LogOut, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

export function AccountView({ account, chat, mailbox }) {
  const [restoreId, setRestoreId] = useState('')
  const [restoreCode, setRestoreCode] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef(null)
  const download = () => {
    const payload = JSON.stringify({ chat: JSON.parse(chat.exportLocalData()), mailbox: mailbox.exportData(), exportedAt: new Date().toISOString() }, null, 2)
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
      const ok = chat.importLocalData(payload.chat) && mailbox.importData(payload.mailbox)
      setNotice(ok ? '本地数据已导入。' : '这份文件无法识别。')
    } catch {
      setNotice('这份文件无法识别。')
    }
  }
  return (
    <section className="content-page account-page">
      <div className="page-heading"><span className="eyebrow"><ShieldCheck size={14} />账户与隐私</span><h1>你的云端栖居地</h1><p>不登录也能在当前设备使用；连接 Lumora ID 后可以在设备间同步。</p></div>
      <div className="account-grid">
        <section className="paper-panel account-status"><Cloud size={28} /><div><strong>{account.status === 'connected' ? '已连接云端' : '当前仅保存在本机'}</strong><p>{account.profile ? `Lumora ID：${account.profile.linoId}` : '创建恢复卡后即可启用云同步。旧 LINO- 开头的恢复卡仍然有效。'}</p></div>{account.status === 'connected' ? <button className="secondary-button" onClick={account.syncNow} type="button">立即同步</button> : <button className="primary-button" onClick={() => account.createAccount().catch(() => setNotice('暂时无法创建云端账户。'))} type="button">创建 Lumora ID</button>}</section>
        {account.recoveryCard && <section className="recovery-card"><strong>请保存这张恢复卡</strong><p>它只展示一次，用于在其他设备恢复你的数据。</p><code>{account.recoveryCard.linoId}</code><code>{account.recoveryCard.recoveryCode}</code><button className="primary-button" onClick={account.closeRecoveryCard} type="button">我已妥善保存</button></section>}
        {account.status !== 'connected' && <form className="paper-panel restore-form" onSubmit={(event) => { event.preventDefault(); account.restoreAccount({ linoId: restoreId, recoveryCode: restoreCode }).catch(() => setNotice('恢复卡不匹配，请检查后再试。')) }}><h2>用恢复卡登录</h2><input aria-label="Lumora ID" onChange={(event) => setRestoreId(event.target.value)} placeholder="LUMO-XXXX-XXXX 或旧 LINO ID" value={restoreId} /><input aria-label="恢复码" onChange={(event) => setRestoreCode(event.target.value)} placeholder="恢复码" value={restoreCode} /><button className="secondary-button" type="submit">恢复账户</button></form>}
        <section className="paper-panel data-tools"><h2>本地数据</h2><div><button className="secondary-button" onClick={download} type="button"><Download size={17} />导出备份</button><button className="secondary-button" onClick={() => fileRef.current?.click()} type="button"><Upload size={17} />导入备份</button><input accept="application/json" className="sr-only" onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])} ref={fileRef} type="file" /></div><p>备份包含对话、对话记忆、心情与信件。请妥善保存。</p></section>
        {account.status === 'connected' && <section className="danger-zone"><h2>账户操作</h2><button className="secondary-button" onClick={account.logout} type="button"><LogOut size={17} />退出登录</button><button className="danger-button" onClick={() => window.confirm('确定删除云端账户和全部云端数据吗？此操作无法撤销。') && account.deleteAccount()} type="button"><Trash2 size={17} />删除云端账户</button></section>}
      </div>
      {notice && <p className="inline-notice">{notice}</p>}
    </section>
  )
}
