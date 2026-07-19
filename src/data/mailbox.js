export const MAILBOX_STORAGE_KEY = 'lino-mailbox-v1'

export const moodOptions = [
  { id: 'happy', label: '开心', symbol: '笑', color: '#F2CD62' },
  { id: 'calm', label: '平静', symbol: '静', color: '#B9DCEB' },
  { id: 'hopeful', label: '期待', symbol: '盼', color: '#9BCB83' },
  { id: 'tired', label: '疲惫', symbol: '歇', color: '#C8C2D6' },
  { id: 'sad', label: '难过', symbol: '雨', color: '#AFC5DA' },
  { id: 'annoyed', label: '烦躁', symbol: '乱', color: '#F4B8C3' },
  { id: 'mixed', label: '说不清', symbol: '?', color: '#D7D3C8' },
]

export const stationeryOptions = [
  { id: 'spring', label: '春日邮票', caption: '一封带着嫩绿气息的信' },
  { id: 'cloud', label: '云朵便笺', caption: '轻一点，也柔软一点' },
  { id: 'night', label: '夜空来信', caption: '把不想惊动人的话留在夜里' },
  { id: 'doodle', label: '黑白涂鸦', caption: '简单、直接，像和 Lino 说话' },
]

export const letterFontOptions = [
  { id: 'wenkai', label: '文楷', className: 'letter-font-wenkai' },
  { id: 'cute', label: '可爱圆体', className: 'letter-font-cute' },
  { id: 'serif', label: '书信仿宋', className: 'letter-font-serif' },
  { id: 'clear', label: '清晰正文', className: 'letter-font-clear' },
]

export function chinaDateKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

export function nextReplyAt(localDate) {
  const [year, month, day] = localDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0)).toISOString()
}

export function monthKey(value = new Date()) {
  return chinaDateKey(value).slice(0, 7)
}

