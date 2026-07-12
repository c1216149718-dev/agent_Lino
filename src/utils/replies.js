const assistantReplies = [
  '收到。我会先把目标和约束分开看，避免直接跳到结论。',
  '明白。我会用安静一点的方式帮你整理，不制造额外压力。',
  '可以。我们先确定最小可执行的一步，再慢慢推进。',
  '我在处理。先保留你的原意，再把它变得更清楚、更可靠。',
]

const stateReplies = {
  idle: '我会保持在旁边，不催你。',
  playful: '我会轻轻提醒一下，但不会打断你的节奏。',
  happy: '这个方向不错，我们可以继续往下展开。',
  sad: '如果这件事让你有点累，我们可以先从最小的一步开始。',
  angry: '我会帮你把混乱的部分按住，先处理最关键的问题。',
  thinking: '我会先拆解路径，再给你一个稳定判断。',
  proud: '我会给出结论，也留下可选的下一步。',
}

export function createAssistantReply(input, agentState) {
  const normalized = input.trim()
  const seed = normalized.length + agentState.length
  const base = assistantReplies[seed % assistantReplies.length]
  const stateLine = stateReplies[agentState] ?? stateReplies.idle

  if (/累|疲惫|难受|焦虑|压力|烦/.test(normalized)) {
    return `${base} ${stateLine} 我建议先把压力源拆成三类：必须处理、可以延后、可以交给别人。`
  }

  if (/计划|今天|明天|安排|任务/.test(normalized)) {
    return `${stateLine} 我会把任务整理成：目标、约束、下一步、完成信号。你可以先补充截止时间或重要程度。`
  }

  if (/写|回复|消息|表达|反馈/.test(normalized)) {
    return `${stateLine} 我可以帮你生成一版清晰、温和、不牺牲效率的表达。先告诉我对象和语气边界。`
  }

  return `${base} ${stateLine} 你可以继续补充背景，我会把它整理成更可执行的形态。`
}
