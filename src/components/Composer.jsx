import { Send } from 'lucide-react'
import { useState } from 'react'

export function Composer({
  autoFocus = false,
  className = '',
  disabled = false,
  isThinking = false,
  onSubmit,
  placeholder = '请和我对话吧',
  submitLabel = '发送消息',
}) {
  const [value, setValue] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (disabled) {
      return
    }
    onSubmit(value)
    setValue('')
  }

  return (
    <form
      className={`doodle-border composer-shell relative flex items-center gap-3 rounded-[2rem] bg-white px-4 py-3 shadow-soft shadow-neutral-950/5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-neutral-950 ${
        isThinking ? 'is-thinking' : ''
      } ${className}`}
      onSubmit={handleSubmit}
    >
      <input
        aria-label="对话输入"
        autoComplete="off"
        autoFocus={autoFocus}
        className="relative z-10 min-w-0 flex-1 bg-transparent px-2 text-base font-medium text-neutral-950 outline-none placeholder:text-neutral-500 disabled:text-neutral-400"
        disabled={disabled}
        name="message"
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      <button
        aria-label={submitLabel}
        className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-neutral-950 bg-neutral-950 text-white shadow-[0_12px_24px_rgba(10,10,10,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 disabled:translate-y-0 disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-neutral-500 disabled:shadow-none"
        disabled={disabled}
        type="submit"
      >
        <Send size={18} strokeWidth={2.6} />
      </button>
    </form>
  )
}
