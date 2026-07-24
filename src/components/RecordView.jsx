import { CalendarDays, Check, Mail, PenLine, Send, Stamp } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { letterFontOptions, moodOptions, stationeryOptions } from '../data/lumora'
import { getSpirit } from '../data/lumora'
import { ResilientImage } from './ResilientImage'
import { SpiritAsset } from './SpiritAsset'

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function MoodCalendar({ letters, moods, replies }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const days = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  return (
    <div className="mood-calendar">
      <div className="calendar-title"><CalendarDays size={18} /><strong>{year} 年 {month + 1} 月</strong></div>
      <div className="weekday-row">{['日','一','二','三','四','五','六'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1
          const key = dateKey(year, month, day)
          const mood = moods.find((item) => item.localDate === key)
          const hasReply = replies.some((reply) => reply.letterDate === key)
          return (
            <button className={mood ? 'has-mood' : ''} key={key} onClick={() => setSelectedDate(key)} title={mood?.note || `${month + 1}月${day}日`} type="button">
              <span>{day}</span>
              {mood && <SpiritAsset avatar mood={mood.moodId} spiritId={mood.spiritId || 'lino'} />}
              {hasReply && <Mail className="reply-mark" size={11} />}
            </button>
          )
        })}
      </div>
      {selectedDate && <div className="calendar-day-detail" aria-live="polite"><strong>{selectedDate}</strong><p>{moods.find((item) => item.localDate === selectedDate)?.note || '这一天还没有心情记录。'}</p><span>{letters.filter((letter) => letter.localDate === selectedDate).length} 封信 · {replies.filter((reply) => reply.letterDate === selectedDate).length} 封回信</span></div>}
    </div>
  )
}

function MoodWriter({ mailbox, selectedSpiritId }) {
  const [moodId, setMoodId] = useState(mailbox.todayMood?.moodId || 'calm')
  const [note, setNote] = useState(mailbox.todayMood?.note || '')
  const [saved, setSaved] = useState(false)
  const spirit = getSpirit(selectedSpiritId)
  return (
    <div className="record-two-column">
      <section className="paper-panel mood-writer">
        <div className="section-heading"><span className="eyebrow">今日心情</span><h2>记录此刻的你</h2><p>不需要解释得很完整，能被写下来就已经很好。</p></div>
        <div className="record-spirit-stage" style={{ '--spirit-soft': spirit.soft }}><SpiritAsset mood={moodId} spiritId={selectedSpiritId} /><p>当前心情：<strong>{moodOptions.find((mood) => mood.id === moodId)?.label}</strong></p></div>
        <div className="mood-picker">
          {moodOptions.map((mood) => <button className={moodId === mood.id ? 'is-selected' : ''} key={mood.id} onClick={() => setMoodId(mood.id)} style={{ '--mood-color': mood.color }} type="button"><SpiritAsset avatar mood={mood.id} spiritId={selectedSpiritId} /><span>{mood.label}</span></button>)}
          <button className="mixed-mood" onClick={() => setMoodId(null)} type="button"><span>＋</span><small>暂时说不清</small></button>
        </div>
        <textarea onChange={(event) => setNote(event.target.value)} placeholder="想对今天的自己说些什么？" rows="5" value={note} />
        <button className="primary-button" disabled={!moodId} onClick={() => { mailbox.saveMood({ moodId, note, spiritId: selectedSpiritId }); setSaved(true); window.setTimeout(() => setSaved(false), 1600) }} type="button">{saved ? <><Check size={17} />已记录</> : '记录今天'}</button>
      </section>
      <MoodCalendar letters={mailbox.letters} moods={mailbox.moods} replies={mailbox.replies} />
    </div>
  )
}

function ExpandingLetterTextarea({ fontId, onChange, value }) {
  const textareaRef = useRef(null)
  const [scrollbar, setScrollbar] = useState({ visible: false, size: 100, offset: 0, progress: 0 })

  const syncScrollbar = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const scrollRange = textarea.scrollHeight - textarea.clientHeight
    const visible = scrollRange > 2
    const size = visible ? Math.max(12, (textarea.clientHeight / textarea.scrollHeight) * 100) : 100
    const progress = visible ? (textarea.scrollTop / scrollRange) * 100 : 0
    const offset = visible ? (progress / 100) * (100 - size) : 0
    setScrollbar((current) => (
      current.visible === visible
      && Math.abs(current.size - size) < 0.1
      && Math.abs(current.offset - offset) < 0.1
      && Math.abs(current.progress - progress) < 0.1
        ? current
        : { visible, size, offset, progress }
    ))
  }, [])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const styles = window.getComputedStyle(textarea)
    const minHeight = Number.parseFloat(styles.minHeight) || 430
    const maxHeight = Number.parseFloat(styles.maxHeight) || 620
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight))
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > nextHeight + 2 ? 'auto' : 'hidden'
    if (!value) textarea.scrollTop = 0
    window.requestAnimationFrame(syncScrollbar)
  }, [fontId, syncScrollbar, value])

  useEffect(() => {
    const handleResize = () => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.style.height = 'auto'
      const styles = window.getComputedStyle(textarea)
      const minHeight = Number.parseFloat(styles.minHeight) || 430
      const maxHeight = Number.parseFloat(styles.maxHeight) || 620
      textarea.style.height = `${Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight))}px`
      syncScrollbar()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [syncScrollbar])

  const moveFromTrack = (clientY, track) => {
    const textarea = textareaRef.current
    if (!textarea || !track) return
    const bounds = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height))
    textarea.scrollTop = ratio * (textarea.scrollHeight - textarea.clientHeight)
    syncScrollbar()
  }

  const startThumbDrag = (event) => {
    const textarea = textareaRef.current
    const thumb = event.currentTarget
    const track = thumb.parentElement
    if (!textarea || !track) return
    event.preventDefault()
    const startY = event.clientY
    const startScrollTop = textarea.scrollTop
    const maxScroll = textarea.scrollHeight - textarea.clientHeight
    const maxTravel = track.clientHeight - thumb.clientHeight
    const handleMove = (moveEvent) => {
      textarea.scrollTop = startScrollTop + ((moveEvent.clientY - startY) / Math.max(1, maxTravel)) * maxScroll
      syncScrollbar()
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
  }

  const handleScrollbarKeyDown = (event) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const increments = {
      ArrowDown: 32,
      ArrowUp: -32,
      PageDown: textarea.clientHeight * 0.8,
      PageUp: textarea.clientHeight * -0.8,
      Home: -textarea.scrollHeight,
      End: textarea.scrollHeight,
    }
    if (!(event.key in increments)) return
    event.preventDefault()
    textarea.scrollTop += increments[event.key]
    syncScrollbar()
  }

  return (
    <div className="letter-textarea-shell">
      <textarea
        aria-label="信件正文"
        id="letter-content"
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScrollbar}
        placeholder="今天发生了什么？慢慢写就好…"
        ref={textareaRef}
        rows="9"
        value={value}
      />
      <div
        aria-controls="letter-content"
        aria-label="信件正文滚动位置"
        aria-orientation="vertical"
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={Math.round(scrollbar.progress)}
        className={`letter-scrollbar ${scrollbar.visible ? 'is-visible' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) moveFromTrack(event.clientY, event.currentTarget)
        }}
        onKeyDown={handleScrollbarKeyDown}
        role="scrollbar"
        tabIndex={scrollbar.visible ? 0 : -1}
      >
        <span
          className="letter-scrollbar-thumb"
          onPointerDown={startThumbDrag}
          style={{ height: `${scrollbar.size}%`, top: `${scrollbar.offset}%` }}
        />
      </div>
    </div>
  )
}

function LetterWriter({ mailbox, selectedSpiritId }) {
  const [content, setContent] = useState('')
  const [moodId, setMoodId] = useState('calm')
  const [stationeryId, setStationeryId] = useState('bamboo-breeze')
  const [fontId, setFontId] = useState('wenkai')
  const [recipientSpiritId, setRecipientSpiritId] = useState(selectedSpiritId)
  const [sent, setSent] = useState(false)
  const style = stationeryOptions.find((item) => item.id === stationeryId)
  const font = letterFontOptions.find((item) => item.id === fontId)
  const recipient = getSpirit(recipientSpiritId)
  const [sliceTop, sliceRight, sliceBottom, sliceLeft] = style.slice || [180, 1, 220, 1]
  const [capTop, capRight, capBottom, capLeft] = style.caps || style.slice || [180, 1, 220, 1]
  const paperStyle = {
    '--paper-accent': style.accent,
    '--paper-color': style.paperColor || '#fffdf4',
    '--paper-image': style.image ? `url("${style.image}")` : 'none',
    '--paper-slice': `${sliceTop} ${sliceRight} ${sliceBottom} ${sliceLeft}`,
    '--paper-cap-top': `${(capTop / 7.2).toFixed(3)}cqw`,
    '--paper-cap-right': `${(capRight / 7.2).toFixed(3)}cqw`,
    '--paper-cap-bottom': `${(capBottom / 7.2).toFixed(3)}cqw`,
    '--paper-cap-left': `${(capLeft / 7.2).toFixed(3)}cqw`,
  }
  const save = (delivery) => {
    const letter = mailbox.saveLetter({ content, delivery, fontId, moodId, recipientSpiritId, stationeryId })
    if (!letter) return
    setContent('')
    setSent(delivery === 'sent')
    window.setTimeout(() => setSent(false), 1800)
  }
  return (
    <div className="letter-layout">
      <section className="letter-compose-panel">
        <div className="section-heading"><span className="eyebrow"><PenLine size={14} />写今天的信</span><h2>把心事折进一封信里</h2><p>留在信箱，或者寄给一位精灵，明早八点等一封回信。</p></div>
        <div className="recipient-row">
          <span>寄给</span>
          {['lino','momo','piko','tutu','nox'].map((id) => <button className={recipientSpiritId === id ? 'is-selected' : ''} key={id} onClick={() => setRecipientSpiritId(id)} type="button"><SpiritAsset avatar spiritId={id} /><small>{getSpirit(id).name}</small></button>)}
        </div>
        <div className="field-label">今天是什么心情？</div>
        <div className="compact-mood-picker">{moodOptions.map((mood) => <button className={moodId === mood.id ? 'is-selected' : ''} key={mood.id} onClick={() => setMoodId(mood.id)} style={{ '--mood-color': mood.color }} type="button">{mood.label}</button>)}</div>
        <div className="letter-paper-stage">
          <div className="letter-paper" style={paperStyle}>
            {style.image ? (
              <div className="letter-paper-surface" aria-hidden="true" />
            ) : <div className="generated-style-placeholder"><Stamp size={42} /><strong>{style.label}</strong><span>{style.group}</span></div>}
            <div className={`letter-writing ${font.className}`}>
              <div className="letter-heading"><span>To {recipient.name}</span><time>{new Date().toLocaleDateString('zh-CN')}</time></div>
              <ExpandingLetterTextarea fontId={fontId} onChange={setContent} value={content} />
            </div>
          </div>
        </div>
        <div className="letter-actions"><button className="secondary-button" disabled={!content.trim()} onClick={() => save('kept')} type="button">留在信箱</button><button className="primary-button" disabled={!content.trim()} onClick={() => save('sent')} type="button"><Send size={17} />{sent ? '已寄出' : `寄给 ${recipient.name}`}</button></div>
      </section>
      <aside className="letter-options">
        <div className="option-block"><strong>信纸款式</strong><div className="stationery-grid">{stationeryOptions.map((item) => <button aria-label={`选择信纸：${item.label}`} className={stationeryId === item.id ? 'is-selected' : ''} key={item.id} onClick={() => setStationeryId(item.id)} style={{ '--style-color': item.accent }} type="button">{item.image ? <ResilientImage alt="" src={item.image} /> : <span className="style-swatch" />}<small>{item.label}</small></button>)}</div></div>
        <div className="option-block"><strong>信件字体</strong><div className="font-options">{letterFontOptions.map((item) => <button className={`${item.className} ${fontId === item.id ? 'is-selected' : ''}`} key={item.id} onClick={() => setFontId(item.id)} type="button">{item.label}</button>)}</div></div>
      </aside>
    </div>
  )
}

function MailboxHistory({ mailbox, onRead }) {
  const entries = useMemo(() => [...mailbox.letters].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [mailbox.letters])
  return (
    <div className="mailbox-history-grid">
      <section className="paper-panel"><div className="section-heading"><span className="eyebrow"><Mail size={14} />我的信箱</span><h2>写过的信</h2></div>{entries.length === 0 ? <p className="empty-note">信箱还是空的。第一封信可以很短，只写一句也好。</p> : entries.map((letter) => <article className="letter-history-card" key={letter.id}><SpiritAsset avatar mood={letter.moodId} spiritId={letter.recipientSpiritId || 'lino'} /><div><strong>{new Date(letter.createdAt).toLocaleDateString('zh-CN')} · 致 {getSpirit(letter.recipientSpiritId || 'lino').name}</strong><p>{letter.content}</p><span>{stationeryOptions.find((item) => item.id === letter.stationeryId)?.label} · {letter.status === 'pending' ? '等待回信' : letter.status === 'replied' ? '已回信' : '留在信箱'}</span></div></article>)}</section>
      <section className="paper-panel"><div className="section-heading"><span className="eyebrow"><Stamp size={14} />云中来信</span><h2>精灵的回信</h2></div>{mailbox.replies.length === 0 ? <p className="empty-note">寄出的信会在次日上午八点收到回复。今晚先把心事交给云朵保管。</p> : mailbox.replies.map((reply) => <button className={`reply-card ${reply.readAt ? '' : 'is-unread'}`} key={reply.id} onClick={() => onRead(reply.id)} type="button"><SpiritAsset avatar spiritId={reply.spiritId || 'lino'} /><div><strong>{getSpirit(reply.spiritId || 'lino').name} 的回信</strong><p>{reply.content}</p></div></button>)}</section>
    </div>
  )
}

export function RecordView({ account, mailbox, selectedSpiritId }) {
  const [tab, setTab] = useState('mood')
  return (
    <section className="content-page record-page">
      <div className="page-heading"><span className="eyebrow">记录此刻</span><h1>把今天轻轻放进云里</h1><p>心情、信件和回信都留在同一条时间线上。</p></div>
      <div className="segmented-control"><button className={tab === 'mood' ? 'is-active' : ''} onClick={() => setTab('mood')} type="button">心情记录</button><button className={tab === 'letter' ? 'is-active' : ''} onClick={() => setTab('letter')} type="button">写一封信</button><button className={tab === 'mailbox' ? 'is-active' : ''} onClick={() => setTab('mailbox')} type="button">我的信箱 {mailbox.unreadReplies.length > 0 && <span>{mailbox.unreadReplies.length}</span>}</button></div>
      {tab === 'mood' && <MoodWriter mailbox={mailbox} selectedSpiritId={selectedSpiritId} />}
      {tab === 'letter' && <LetterWriter mailbox={mailbox} selectedSpiritId={selectedSpiritId} />}
      {tab === 'mailbox' && <MailboxHistory mailbox={mailbox} onRead={account.markReplyRead} />}
    </section>
  )
}
