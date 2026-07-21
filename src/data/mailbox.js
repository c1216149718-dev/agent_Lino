export { letterFontOptions, moodOptions, stationeryOptions } from './lumora'

export const MAILBOX_STORAGE_KEY = 'lumora-mailbox:v2'
export const LEGACY_MAILBOX_STORAGE_KEY = 'lino-mailbox-v1'

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
