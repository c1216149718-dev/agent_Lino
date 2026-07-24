export const SPIRIT_IDS = ['lino', 'momo', 'piko', 'tutu', 'nox']

export const spirits = {
  lino: {
    id: 'lino',
    name: 'Lino',
    realm: '云之国的倾听精灵',
    ability: '倾听、聊天、整理思绪',
    action: '梳理想法',
    quote: '我会安静地听你说，也陪你把心里的结慢慢解开。',
    color: '#78AEE8',
    soft: '#EAF4FF',
    prompt: '温柔倾听，先回应感受，再帮助用户整理想法。',
  },
  momo: {
    id: 'momo',
    name: 'Momo',
    realm: '花之国的心情精灵',
    ability: '识别情绪、安抚与自我关怀',
    action: '安抚情绪',
    quote: '不用急着变好，先让我陪你照看此刻的心情。',
    color: '#E58B7B',
    soft: '#FFF0EC',
    prompt: '细腻安抚情绪，不说教，不否定感受，给出轻量照顾建议。',
  },
  piko: {
    id: 'piko',
    name: 'Piko',
    realm: '星之国的灵感精灵',
    ability: '灵感、创意与随机发现',
    action: '寻找灵感',
    quote: '给我一颗小小的念头，我们把它点亮成一片星光。',
    color: '#E9A934',
    soft: '#FFF7D9',
    prompt: '活泼但不吵闹，善于联想和发散，给出新鲜具体的创意。',
  },
  tutu: {
    id: 'tutu',
    name: 'Tutu',
    realm: '时之国的计划精灵',
    ability: '规划、任务拆解与习惯',
    action: '规划步骤',
    quote: '别担心，我们把复杂的事拆成下一小步。',
    color: '#9B6B3F',
    soft: '#F7EEE3',
    prompt: '沉稳高效，把目标拆为清晰步骤，主动标明优先级和下一步。',
  },
  nox: {
    id: 'nox',
    name: 'Nox',
    realm: '月影国的梦境精灵',
    ability: '夜间陪伴、放松与梦境记录',
    action: '夜间放松',
    quote: '夜晚不必独自醒着，我会陪你把声音慢慢调轻。',
    color: '#6658A6',
    soft: '#EEEBFA',
    prompt: '语气安静舒缓，适合夜间陪伴与放松，不制造紧迫感。',
  },
}

export const moodOptions = [
  { id: 'happy', label: '开心', color: '#F2CD62' },
  { id: 'calm', label: '平静', color: '#B9DCEB' },
  { id: 'shy', label: '害羞', color: '#F4B8C3' },
  { id: 'sad', label: '难过', color: '#AFC5DA' },
  { id: 'angry', label: '生气', color: '#E99B82' },
  { id: 'excited', label: '兴奋', color: '#F1B45C' },
]

export const avatarMoodMap = {
  angry: 'angry',
  calm: 'calm',
  excited: 'excited',
  happy: 'happy',
  sad: 'sad',
  shy: 'shy',
}

export const stationeryOptions = [
  { id: 'bamboo-breeze', label: '竹影清风', group: '东方雅致', image: '/lumora-assets/stationery/bamboo-breeze.webp', accent: '#77966D', paperColor: '#FAEFDD', slice: [300, 1, 430, 1], caps: [200, 0, 250, 0] },
  { id: 'cherry-poem', label: '落樱成诗', group: '东方雅致', image: '/lumora-assets/stationery/cherry-poem.webp', accent: '#D99A9D', paperColor: '#FAF1E6', slice: [180, 36, 190, 36], caps: [150, 24, 150, 24] },
  { id: 'mountain-mist', label: '云山烟岚', group: '东方雅致', image: '/lumora-assets/stationery/mountain-mist.webp', accent: '#7E9BAB', paperColor: '#EEEFEE', slice: [150, 1, 430, 1], caps: [120, 0, 260, 0] },
  { id: 'brocade-cloud', label: '锦绣云纹', group: '东方雅致', image: '/lumora-assets/stationery/brocade-cloud.webp', accent: '#B49A52', paperColor: '#FBF2DD', slice: [170, 45, 170, 45], caps: [140, 28, 140, 28] },
  { id: 'vintage-collage', label: '复古拼贴', group: '手账日常', image: '/lumora-assets/stationery/vintage-collage.webp', accent: '#B89D7A', paperColor: '#FBF5E6', slice: [180, 1, 250, 1], caps: [150, 0, 200, 0] },
  { id: 'spring-letter', label: '春日来信', group: '手账日常', image: '/lumora-assets/stationery/spring-letter.webp', accent: '#86BB96', paperColor: '#F6F7EE', slice: [150, 1, 350, 1], caps: [120, 0, 230, 0] },
  { id: 'coffee-time', label: '咖啡时光', group: '手账日常', image: '/lumora-assets/stationery/coffee-time.webp', accent: '#A77854', paperColor: '#FDF4E6', slice: [190, 1, 330, 1], caps: [140, 0, 220, 0] },
  { id: 'starry-journal', label: '星夜手札', group: '星云奇境', image: '/lumora-assets/stationery/starry-journal.webp', accent: '#75659D', paperColor: '#FBF5F5', slice: [180, 25, 230, 25], caps: [150, 18, 180, 18] },
  { id: 'unicorn-dream', label: '独角兽梦境', group: '星云奇境', image: '/lumora-assets/stationery/unicorn-dream.webp', accent: '#9B8CE5', paperColor: '#FCFAF7', slice: [190, 30, 300, 30], caps: [150, 20, 220, 20] },
  { id: 'pizza-mood', label: '披萨心情', group: '轻松趣味', image: '/lumora-assets/stationery/pizza-mood.webp', accent: '#E98D64', paperColor: '#FEF4D7', slice: [150, 32, 190, 32], caps: [120, 24, 150, 24] },
  { id: 'frog-eyes', label: '蛙蛙大眼仔', group: '轻松趣味', image: '/lumora-assets/stationery/frog-eyes.webp', accent: '#80B76D', paperColor: '#F3F8DF', slice: [140, 1, 220, 1], caps: [110, 0, 170, 0] },
  { id: 'banana-nope', label: '香蕉不呐呐', group: '轻松趣味', image: '/lumora-assets/stationery/banana-nope.webp', accent: '#E4BD4E', paperColor: '#FEF4B9', slice: [220, 30, 150, 30], caps: [180, 22, 120, 22] },
]

export const letterFontOptions = [
  { id: 'wenkai', label: '文楷', className: 'letter-font-wenkai' },
  { id: 'cute', label: '可爱圆体', className: 'letter-font-cute' },
  { id: 'serif', label: '书信仿宋', className: 'letter-font-serif' },
  { id: 'clear', label: '清晰正文', className: 'letter-font-clear' },
]

export const navItems = [
  { id: 'chat', label: '首页' },
  { id: 'record', label: '记录' },
  { id: 'memory', label: '回忆' },
  { id: 'actions', label: '行动' },
  { id: 'spirits', label: '精灵' },
]

export function spiritAsset(spiritId, state = 'base') {
  const safeSpirit = SPIRIT_IDS.includes(spiritId) ? spiritId : 'lino'
  return `/lumora-assets/characters/${safeSpirit}/${safeSpirit}-${state}.webp`
}

export function getSpirit(spiritId) {
  return spirits[spiritId] ?? spirits.lino
}
