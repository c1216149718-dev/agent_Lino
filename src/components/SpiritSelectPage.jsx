import { Check, Sparkles } from 'lucide-react'
import { SPIRIT_IDS, getSpirit } from '../data/lumora'
import { SpiritAsset } from './SpiritAsset'

export function SpiritSelectPage({ currentSpiritId, onSelect, onboarding = false }) {
  return (
    <section className="spirit-select-page" aria-labelledby="spirit-select-title">
      <div className="page-heading centered-heading">
        <span className="eyebrow"><Sparkles size={15} /> 云栖境的伙伴</span>
        <h1 id="spirit-select-title">{onboarding ? '先选择一位陪你出发的精灵' : '选择你的精灵伙伴'}</h1>
        <p>每个精灵都有不同的专长；他们共享你允许保存的长期记忆，但不会互相翻看完整对话。</p>
      </div>
      <div className="spirit-card-grid">
        {SPIRIT_IDS.map((id) => {
          const spirit = getSpirit(id)
          const selected = id === currentSpiritId
          return (
            <article className={`spirit-card ${selected ? 'is-selected' : ''}`} key={id} style={{ '--spirit-color': spirit.color, '--spirit-soft': spirit.soft }}>
              <div className="spirit-card-art"><SpiritAsset spiritId={id} /></div>
              <div className="spirit-card-copy">
                <div className="spirit-name-row"><h2>{spirit.name}</h2>{selected && <Check size={18} />}</div>
                <strong>{spirit.realm}</strong>
                <p>{spirit.ability}</p>
                <blockquote>“{spirit.quote}”</blockquote>
              </div>
              <button className="primary-button" onClick={() => onSelect(id)} type="button">
                {selected ? '继续和 TA 相处' : `选择 ${spirit.name}`}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
