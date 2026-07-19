import { AnimatePresence, motion } from 'framer-motion'
import { CloudCheck, Copy, Download, KeyRound, LogOut, Phone, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { LinoMascot } from './LinoMascot'

function RecoveryCard({ account }) {
  const [copied, setCopied] = useState(false)
  const text = `Lino ID: ${account.recoveryCard.linoId}\n恢复码: ${account.recoveryCard.recoveryCode}`
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }
  const download = () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    link.download = 'lino-recovery-card.txt'
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <motion.div animate={{ opacity: 1 }} className="account-modal-layer" initial={{ opacity: 0 }}>
      <section aria-modal="true" className="recovery-card" role="dialog">
        <button aria-label="关闭恢复卡" className="message-action-button absolute right-5 top-5" onClick={account.closeRecoveryCard} type="button"><X size={18} /></button>
        <span className="recovery-stamp">LINO POST</span>
        <h2>你的 Lino 恢复卡</h2>
        <p>恢复码只显示这一次。换设备时，需要它找回信箱与聊天。</p>
        <dl>
          <div><dt>Lino ID</dt><dd>{account.recoveryCard.linoId}</dd></div>
          <div><dt>恢复码</dt><dd>{account.recoveryCard.recoveryCode}</dd></div>
        </dl>
        <div className="grid grid-cols-2 gap-3">
          <button className="mail-secondary-button" onClick={copy} type="button"><Copy size={17} />{copied ? '已复制' : '复制'}</button>
          <button className="mail-primary-button" onClick={download} type="button"><Download size={17} />下载</button>
        </div>
      </section>
    </motion.div>
  )
}

export function AccountPanel({ account, chat, mailbox, onRequestLocalClear }) {
  const [restoreId, setRestoreId] = useState('')
  const [restoreCode, setRestoreCode] = useState('')
  const [notice, setNotice] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const importInputRef = useRef(null)

  const restore = async (event) => {
    event.preventDefault()
    setIsRestoring(true)
    setNotice('')
    try {
      await account.restoreAccount({ linoId: restoreId.trim(), recoveryCode: restoreCode.trim() })
      setNotice('账号已恢复，云端内容正在同步。')
    } catch {
      setNotice('没有找到对应账号，请检查 Lino ID 和恢复码。')
    } finally {
      setIsRestoring(false)
    }
  }

  const exportAll = () => {
    const payload = JSON.stringify({ chat: JSON.parse(chat.exportLocalData()), mailbox: mailbox.exportData() }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    link.download = 'lino-data.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const importAll = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      const importedChat = chat.importLocalData(JSON.stringify(payload.chat))
      const importedMailbox = mailbox.importData(payload.mailbox)
      setNotice(importedChat && importedMailbox ? '本地数据已导入。' : '文件内容不完整，未能导入。')
    } catch {
      setNotice('无法读取这个 Lino 数据文件。')
    }
    event.target.value = ''
  }

  const deleteAccount = async () => {
    if (!window.confirm('确定删除账号与全部云端数据吗？此操作无法恢复。')) return
    await account.deleteAccount()
    setNotice('账号与云端数据已删除。')
  }

  return (
    <motion.section animate={{ opacity: 1, y: 0 }} className="account-page" initial={{ opacity: 0, y: 12 }}>
      <header>
        <p>ACCOUNT & PRIVACY</p>
        <h1>账户与隐私</h1>
      </header>
      <div className="account-layout">
        <section className="account-main-sheet">
          {account.status === 'checking' ? <p>正在确认账号状态...</p> : null}
          {account.status === 'guest' ? (
            <>
              <div className="account-intro">
                <LinoMascot activity="guarding" pose="rest" size="lg" state="idle" />
                <div><h2>让信箱跟着你</h2><p>创建一个不需要手机号和邮箱的 Lino ID。完成小范围测试后，可直接绑定手机号。</p></div>
              </div>
              <button className="account-create-button" onClick={() => account.createAccount().catch(() => setNotice('暂时无法创建账号，请稍后再试。'))} type="button">
                <KeyRound size={20} />创建 Lino ID
              </button>
              <div className="account-divider"><span>已有恢复卡</span></div>
              <form className="restore-form" onSubmit={restore}>
                <label>Lino ID<input onChange={(event) => setRestoreId(event.target.value)} placeholder="LINO-XXXX-XXXX" value={restoreId} /></label>
                <label>恢复码<input onChange={(event) => setRestoreCode(event.target.value)} placeholder="输入恢复卡上的代码" value={restoreCode} /></label>
                <button disabled={isRestoring || !restoreId.trim() || !restoreCode.trim()} type="submit">{isRestoring ? '正在恢复...' : '恢复账号'}</button>
              </form>
            </>
          ) : null}
          {account.status === 'connected' ? (
            <>
              <div className="account-connected-head">
                <CloudCheck size={34} />
                <div><span>已连接</span><strong>{account.profile?.linoId}</strong></div>
                <i className={`sync-dot sync-${account.syncStatus}`} />
              </div>
              {account.needsImport ? (
                <div className="import-consent">
                  <h2>要把这台设备的内容带进账号吗？</h2>
                  <p>找到 {account.localSummary.messages} 条消息、{account.localSummary.memories} 条记忆、{account.localSummary.letters} 封信和 {account.localSummary.moods} 天心情。确认后才会上传。</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button onClick={() => account.syncNow().catch(() => setNotice('同步失败，本地数据仍然安全。'))} type="button">上传本机内容</button>
                    <button className="mail-secondary-button" onClick={account.useCloudData} type="button">只使用云端内容</button>
                  </div>
                </div>
              ) : (
                <p className="sync-copy">{account.syncStatus === 'syncing' ? '正在把变化送往云端...' : account.syncStatus === 'offline' ? '当前离线，恢复网络后会继续同步。' : '聊天、记忆、心情和信件已同步。'}</p>
              )}
              <div className="account-action-list">
                <button onClick={account.syncNow} type="button"><CloudCheck />立即同步<span>保存最新变化</span></button>
                <button onClick={account.logout} type="button"><LogOut />退出账号<span>本机缓存会保留</span></button>
                <button className="danger" onClick={deleteAccount} type="button"><Trash2 />删除账号<span>清除全部云端数据</span></button>
              </div>
            </>
          ) : null}
          {notice ? <p aria-live="polite" className="account-notice">{notice}</p> : null}
        </section>
        <aside className="privacy-ticket">
          <ShieldCheck size={30} />
          <h2>你的内容属于你</h2>
          <p>旧数据会先征得同意再上传。你可以随时导出、清除本机内容，或删除账号与云端内容。</p>
          <div className="grid gap-2">
            <button onClick={exportAll} type="button"><Download size={17} />导出全部数据</button>
            <button onClick={() => importInputRef.current?.click()} type="button"><Upload size={17} />导入数据</button>
            <button onClick={onRequestLocalClear} type="button"><Trash2 size={17} />清除本机数据</button>
            <input accept="application/json" className="sr-only" onChange={importAll} ref={importInputRef} type="file" />
          </div>
          <div className="phone-future-row" aria-disabled="true"><Phone size={18} /><span>手机号绑定</span><small>短信资质准备中</small></div>
        </aside>
      </div>
      <AnimatePresence>{account.recoveryCard ? <RecoveryCard account={account} /> : null}</AnimatePresence>
    </motion.section>
  )
}
