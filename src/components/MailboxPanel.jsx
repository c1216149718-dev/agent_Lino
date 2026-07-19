import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Cloud, Mail, Send, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { letterFontOptions, moodOptions, stationeryOptions } from '../data/mailbox'
import { LinoMascot } from './LinoMascot'

const crisisPattern = /(自杀|不想活|结束生命|伤害自己|活不下去|想死)/i

function monthCells(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const firstDay = new Date(year, monthNumber - 1, 1)
  const total = new Date(year, monthNumber, 0).getDate()
  const offset = (firstDay.getDay() + 6) % 7
  return [
    ...Array.from({ length: offset }, (_, index) => ({ id: `blank-${index}` })),
    ...Array.from({ length: total }, (_, index) => ({
      id: `${month}-${String(index + 1).padStart(2, '0')}`,
      day: index + 1,
    })),
  ]
}

function SelectorSheet({ children, onClose, title }) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="mail-selector-layer md:hidden"
      initial={{ opacity: 0 }}
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.section
        animate={{ y: 0 }}
        aria-label={title}
        aria-modal="true"
        className="mail-selector-sheet"
        initial={{ y: '105%' }}
        role="dialog"
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-hand text-2xl font-semibold">{title}</h3>
          <button aria-label={`关闭${title}`} className="message-action-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  )
}

function MoodChoices({ moodId, onChange }) {
  return (
    <div className="mood-choice-grid">
      {moodOptions.map((mood) => (
        <button
          aria-pressed={moodId === mood.id}
          className="mood-stamp"
          key={mood.id}
          onClick={() => onChange(mood.id)}
          style={{ '--mood-color': mood.color }}
          type="button"
        >
          <span>{mood.symbol}</span>
          <small>{mood.label}</small>
        </button>
      ))}
    </div>
  )
}

function StationeryChoices({ stationeryId, onChange }) {
  return (
    <div className="stationery-choice-grid">
      {stationeryOptions.map((option) => (
        <button
          aria-pressed={stationeryId === option.id}
          className={`stationery-swatch stationery-${option.id}`}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          <span>{option.label}</span>
          <small>{option.caption}</small>
        </button>
      ))}
    </div>
  )
}

function FontChoices({ fontId, onChange }) {
  return (
    <div className="font-choice-grid">
      {letterFontOptions.map((font) => (
        <button
          aria-pressed={fontId === font.id}
          className="font-choice"
          data-font-id={font.id}
          key={font.id}
          onClick={() => onChange(font.id)}
          type="button"
        >
          {font.label}
        </button>
      ))}
    </div>
  )
}

function LetterComposer({ mailbox }) {
  const [content, setContent] = useState('')
  const [moodId, setMoodId] = useState(mailbox.todayMood?.moodId ?? 'calm')
  const [stationeryId, setStationeryId] = useState('spring')
  const [fontId, setFontId] = useState('clear')
  const [sheet, setSheet] = useState(null)
  const [sentState, setSentState] = useState(null)
  const selectedFont = letterFontOptions.find((font) => font.id === fontId)
  const selectedMood = moodOptions.find((mood) => mood.id === moodId)

  const save = (delivery) => {
    const letter = mailbox.saveLetter({ content, delivery, fontId, moodId, stationeryId })
    if (!letter) return
    setSentState(delivery)
    setContent('')
    window.setTimeout(() => setSentState(null), 1800)
  }

  return (
    <div className="mail-compose-layout">
      <aside className="mail-controls hidden md:block">
        <h2>今天是什么心情？</h2>
        <MoodChoices moodId={moodId} onChange={setMoodId} />
        <h2>挑一张信纸</h2>
        <StationeryChoices stationeryId={stationeryId} onChange={setStationeryId} />
        <h2>选择字迹</h2>
        <FontChoices fontId={fontId} onChange={setFontId} />
      </aside>

      <section className={`letter-paper stationery-${stationeryId} ${selectedFont?.className ?? ''}`}>
        <div className="letter-paper-head">
          <span>To Lino / 留给自己</span>
          <time>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date())}</time>
        </div>
        <div className="letter-mood-line">
          <span className="mini-mood-dot" style={{ background: selectedMood?.color }} />
          心情：{selectedMood?.label}
        </div>
        <textarea
          aria-label="写下今天的感受"
          maxLength={4000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="今天发生了什么？不用急着整理好，想到哪里就写到哪里。"
          value={content}
        />
        <div className="letter-signature">Lino mood post · {content.length}/4000</div>
        <AnimatePresence>
          {sentState ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="envelope-seal-state"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.82 }}
            >
              <motion.div animate={{ rotate: [-5, 2, 0], y: [8, -4, 0] }} className="sealed-envelope">
                <Mail size={34} strokeWidth={2.3} />
              </motion.div>
              <strong>{sentState === 'sent' ? '已经寄给 Lino' : '已经留在信箱'}</strong>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <div className="mail-mobile-tools md:hidden">
        <button onClick={() => setSheet('mood')} type="button">心情 · {selectedMood?.label}</button>
        <button onClick={() => setSheet('stationery')} type="button">信纸</button>
        <button onClick={() => setSheet('font')} type="button">字体</button>
      </div>

      {crisisPattern.test(content) ? (
        <div className="crisis-note" role="status">
          <strong>现在的你不必一个人撑着。</strong>
          <p>如果你正处于危险中，请立即联系身边可信任的人，或拨打 120 / 110 获得即时帮助。Lino 的次日回信不能代替紧急支持。</p>
        </div>
      ) : null}

      <div className="letter-actions">
        <button className="mail-secondary-button" disabled={!content.trim()} onClick={() => save('kept')} type="button">
          <Check size={18} />留在信箱
        </button>
        <button className="mail-primary-button" disabled={!content.trim()} onClick={() => save('sent')} type="button">
          <Send size={18} />寄给 Lino
        </button>
      </div>

      <AnimatePresence>
        {sheet === 'mood' ? (
          <SelectorSheet onClose={() => setSheet(null)} title="选择今天的心情">
            <MoodChoices moodId={moodId} onChange={(value) => { setMoodId(value); setSheet(null) }} />
          </SelectorSheet>
        ) : null}
        {sheet === 'stationery' ? (
          <SelectorSheet onClose={() => setSheet(null)} title="挑一张信纸">
            <StationeryChoices stationeryId={stationeryId} onChange={(value) => { setStationeryId(value); setSheet(null) }} />
          </SelectorSheet>
        ) : null}
        {sheet === 'font' ? (
          <SelectorSheet onClose={() => setSheet(null)} title="选择字迹">
            <FontChoices fontId={fontId} onChange={(value) => { setFontId(value); setSheet(null) }} />
          </SelectorSheet>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function MailCalendar({ mailbox }) {
  const [month, setMonth] = useState(mailbox.currentMonth)
  const [selectedDate, setSelectedDate] = useState(null)
  const cells = useMemo(() => monthCells(month), [month])
  const moveMonth = (delta) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const next = new Date(year, monthNumber - 1 + delta, 1)
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
    setSelectedDate(null)
  }
  const dateLetters = mailbox.letters.filter((letter) => letter.localDate === selectedDate)
  const dateReply = mailbox.replies.find((reply) => reply.letterDate === selectedDate)

  return (
    <div className="mailbox-calendar-layout">
      <section className="mail-calendar-card">
        <div className="calendar-heading">
          <button aria-label="上个月" onClick={() => moveMonth(-1)} type="button"><ChevronLeft /></button>
          <h2>{month.replace('-', ' 年 ')} 月</h2>
          <button aria-label="下个月" onClick={() => moveMonth(1)} type="button"><ChevronRight /></button>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mail-calendar-grid">
          {cells.map((cell) => {
            if (!cell.day) return <span key={cell.id} />
            const mood = mailbox.moods.find((item) => item.localDate === cell.id)
            const reply = mailbox.replies.find((item) => item.letterDate === cell.id)
            const hasLetter = mailbox.letters.some((item) => item.localDate === cell.id)
            const moodOption = moodOptions.find((item) => item.id === mood?.moodId)
            return (
              <button
                aria-label={`${cell.id}${hasLetter ? '，写过信' : ''}${reply ? '，收到回信' : ''}`}
                aria-pressed={selectedDate === cell.id}
                className={`calendar-day ${hasLetter ? 'has-letter' : ''}`}
                key={cell.id}
                onClick={() => setSelectedDate(cell.id)}
                type="button"
              >
                <span>{cell.day}</span>
                {moodOption ? <i style={{ '--stamp-color': moodOption.color }}>{moodOption.symbol}</i> : null}
                {reply ? <Mail className="calendar-mail-mark" size={13} /> : null}
              </button>
            )
          })}
        </div>
      </section>
      <aside className="mail-day-detail">
        {selectedDate ? (
          <>
            <p className="postmark-label">{selectedDate}</p>
            <h2>这一天留下的信</h2>
            {dateLetters.length ? dateLetters.map((letter) => (
              <article className={`stored-letter stationery-${letter.stationeryId}`} key={letter.id}>
                <span>{moodOptions.find((mood) => mood.id === letter.moodId)?.label}</span>
                <p>{letter.content}</p>
                <button aria-label="删除这封信" onClick={() => mailbox.removeLetter(letter.id)} type="button"><Trash2 size={15} /></button>
              </article>
            )) : <p className="mail-empty-copy">这一天还没有写信。</p>}
            {dateReply ? <article className="lino-reply-note"><strong>Lino 的回信</strong><p>{dateReply.content}</p></article> : null}
          </>
        ) : (
          <div className="mailbox-empty-illustration">
            <LinoMascot activity="searching" pose="rest" size="lg" state="curious" />
            <h2>选一个有印记的日期</h2>
            <p>那一天的心情和信，会在这里重新展开。</p>
          </div>
        )}
      </aside>
    </div>
  )
}

function CloudLetters({ account, mailbox }) {
  const replies = [...mailbox.replies].reverse()
  const pendingDates = [...new Set(mailbox.letters.filter((letter) => letter.delivery === 'sent' && letter.status === 'pending').map((letter) => letter.localDate))]
  return (
    <div className="cloud-letter-layout">
      <section className="cloud-letter-stage">
        <Cloud className="cloud-letter-cloud" size={92} strokeWidth={1.4} />
        <LinoMascot activity={mailbox.unreadReplies.length ? 'feedback' : 'receiving'} pose="rest" size="xl" state={mailbox.unreadReplies.length ? 'proud' : 'idle'} />
        <h2>{mailbox.unreadReplies.length ? 'Lino 带着回信来了' : '云层正在替你保管来信'}</h2>
        <p>寄出的信会在次日北京时间 8:00 汇成一封回信。</p>
      </section>
      <section className="reply-stack">
        {account.status === 'connected' ? (
          <button className="mail-secondary-button justify-self-start" onClick={() => account.syncNow().catch(() => undefined)} type="button">
            <Cloud size={17} />检查新来信
          </button>
        ) : null}
        {replies.map((reply) => (
          <article className={`reply-envelope ${reply.readAt ? '' : 'is-unread'}`} key={reply.id}>
            <div className="flex items-center justify-between gap-3">
              <span>{reply.letterDate} 的回信</span>
              {!reply.readAt ? <i>新</i> : null}
            </div>
            <p>{reply.content}</p>
            {!reply.readAt ? <button onClick={() => account.markReplyRead(reply.id)} type="button">收下回信</button> : null}
          </article>
        ))}
        {pendingDates.map((date) => (
          <article className="reply-envelope is-pending" key={date}>
            <span>{date} 的信已寄出</span>
            <p>Lino 会把今天寄来的几封信放在一起读，明早再认真写给你。</p>
          </article>
        ))}
        {!replies.length && !pendingDates.length ? <p className="mail-empty-copy">还没有云中来信。先写下今天吧。</p> : null}
      </section>
    </div>
  )
}

export function MailboxPanel({ account, mailbox }) {
  const [tab, setTab] = useState('write')
  return (
    <motion.section animate={{ opacity: 1, y: 0 }} className="mailbox-page" initial={{ opacity: 0, y: 12 }}>
      <header className="mailbox-page-header">
        <div>
          <p>MOOD POST · 情绪邮局</p>
          <h1>情绪信箱</h1>
        </div>
        <div className="mailbox-tabs" role="tablist" aria-label="情绪信箱视图">
          <button aria-selected={tab === 'write'} onClick={() => setTab('write')} role="tab" type="button">写今天的信</button>
          <button aria-selected={tab === 'calendar'} onClick={() => setTab('calendar')} role="tab" type="button">我的信箱</button>
          <button aria-selected={tab === 'replies'} onClick={() => setTab('replies')} role="tab" type="button">
            云中来信{mailbox.unreadReplies.length ? <span>{mailbox.unreadReplies.length}</span> : null}
          </button>
        </div>
      </header>
      {tab === 'write' ? <LetterComposer mailbox={mailbox} /> : null}
      {tab === 'calendar' ? <MailCalendar mailbox={mailbox} /> : null}
      {tab === 'replies' ? <CloudLetters account={account} mailbox={mailbox} /> : null}
    </motion.section>
  )
}
