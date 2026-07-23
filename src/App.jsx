import { useState } from 'react'
import { LumoraShell } from './components/LumoraShell'
import { ResilientImage } from './components/ResilientImage'
import { SpiritSelectPage } from './components/SpiritSelectPage'
import { BRAND_ICON_URL } from './data/assets'
import { useCloudAccount } from './hooks/useCloudAccount'
import { useLumoraStore } from './hooks/useLumoraStore'
import { useMailbox } from './hooks/useMailbox'

function App() {
  const chat = useLumoraStore()
  const mailbox = useMailbox()
  const account = useCloudAccount({ chat, mailbox })
  const [entering, setEntering] = useState(false)

  if (!chat.onboardingComplete || !chat.selectedSpiritId) {
    return (
      <main className="onboarding-shell" id="main-content">
        <header className="onboarding-brand"><ResilientImage alt="" fetchPriority="high" loading="eager" src={BRAND_ICON_URL} /><div><strong>云栖境</strong><span>Lumora</span></div></header>
        <SpiritSelectPage onboarding onSelect={(id) => { setEntering(true); chat.selectSpirit(id, { create: true }); window.setTimeout(() => setEntering(false), 600) }} />
        {entering && <div className="onboarding-entering">正在进入云栖境…</div>}
      </main>
    )
  }

  return <LumoraShell account={account} chat={chat} mailbox={mailbox} />
}

export default App
