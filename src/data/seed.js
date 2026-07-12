export const STORAGE_KEY = 'lino-home:v2'
export const LEGACY_STORAGE_KEY = 'lino-home:v1'

export const agentStateOptions = [
  {
    id: 'idle',
    label: '平静',
    description: '缓慢呼吸，安静等待你开口。',
    expression: 'idle',
  },
  {
    id: 'happy',
    label: '高兴',
    description: '弹跳回应，落地时轻轻压缩。',
    expression: 'happy',
  },
  {
    id: 'playful',
    label: '顽皮',
    description: '眨眼歪头，短促地侧跳一下。',
    expression: 'playful',
  },
  {
    id: 'curious',
    label: '好奇',
    description: '托腮观察，向问号方向倾斜。',
    expression: 'curious',
  },
  {
    id: 'shy',
    label: '害羞',
    description: '双手收拢，轻轻左右摆动。',
    expression: 'shy',
  },
  {
    id: 'surprised',
    label: '惊讶',
    description: '快速后仰，再弹回原位。',
    expression: 'surprised',
  },
  {
    id: 'thinking',
    label: '思考',
    description: '托腮歪头，专注整理输入。',
    expression: 'thinking',
  },
  {
    id: 'proud',
    label: '坚定',
    description: '向上弹起，自信地给出反馈。',
    expression: 'proud',
  },
  {
    id: 'sleepy',
    label: '困倦',
    description: '缓慢点头，安静地打个盹。',
    expression: 'sleepy',
  },
]

export const suggestedPrompts = [
  {
    id: 'task',
    label: '整理一个任务',
    prompt: '我想把一个任务整理清楚，请帮我拆解目标、限制和下一步。',
  },
  {
    id: 'priority',
    label: '判断优先级',
    prompt: '帮我判断这些事情的优先级，并给出一个安静可靠的顺序。',
  },
  {
    id: 'feedback',
    label: '生成反馈',
    prompt: '请帮我把当前想法整理成一段清晰、温和、可执行的反馈。',
  },
]

export const initialMemories = [
  'Lino 会保持温和、可靠和低打扰。',
  '当前版本只在本机保存对话、记忆和状态。',
]

export function createInitialMessages() {
  return [
    {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content:
        '你好，我是 Lino。把目标、想法或任务告诉我，我会先安静想一想，再给你一个清楚的回应。',
      createdAt: new Date().toISOString(),
    },
  ]
}
