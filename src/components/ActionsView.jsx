import { ArrowRight, CheckCircle2, Lightbulb, ListChecks, MoonStar, Sparkles, Wind } from 'lucide-react'
import { SPIRIT_IDS, getSpirit } from '../data/lumora'
import { SpiritAsset } from './SpiritAsset'

const icons = { lino: ListChecks, momo: Wind, piko: Lightbulb, tutu: CheckCircle2, nox: MoonStar }
const prompts = {
  lino: '请帮我梳理这件事：',
  momo: '我现在有些不好受，希望你陪我安放这份情绪：',
  piko: '我想寻找一些新的灵感，主题是：',
  tutu: '请帮我把目标拆成可以行动的步骤：',
  nox: '我想慢慢放松下来，今晚困扰我的是：',
}

export function ActionsView({ onBegin }) {
  return (
    <section className="content-page actions-page">
      <div className="page-heading"><span className="eyebrow"><Sparkles size={14} />精灵指引</span><h1>现在需要哪一种帮助？</h1><p>选择一位精灵，会为这次任务建立一段独立的新对话。</p></div>
      <div className="action-card-grid">{SPIRIT_IDS.map((id) => {
        const spirit = getSpirit(id)
        const Icon = icons[id]
        return <article className="action-card" key={id} style={{ '--spirit-color': spirit.color, '--spirit-soft': spirit.soft }}><div className="action-art"><SpiritAsset spiritId={id} /></div><div className="action-copy"><span className="action-icon"><Icon size={18} /></span><h2>{spirit.action}</h2><p>{spirit.ability}</p><blockquote>{spirit.quote}</blockquote></div><button onClick={() => onBegin(id, prompts[id])} type="button">请 {spirit.name} 帮忙<ArrowRight size={17} /></button></article>
      })}</div>
    </section>
  )
}
