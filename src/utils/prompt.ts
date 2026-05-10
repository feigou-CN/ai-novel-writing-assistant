import type {
  Character,
  CharacterRelation,
  WorldSetting,
  TimelineTrack,
  TimelineEvent,
  StoryOutline,
  Chapter,
  WritingPrefs,
  AttachmentsState,
} from '@/types'

export interface PromptInput {
  novelId: string
  novelTitle: string
  novelType: string
  novelDescription: string
  chapterTitle?: string
  userInput: string
  attachments: AttachmentsState
  prefs: WritingPrefs
  characters?: Character[]
  characterRelations?: CharacterRelation[]
  worldSettings?: WorldSetting[]
  storyOutline?: StoryOutline | null
  chapterOutline?: string
  timelineTracks?: TimelineTrack[]
  timelineEvents?: TimelineEvent[]
  contextChapters?: Chapter[]
  chapterEndings?: Chapter[]
}

function formatCharacterRelations(relations: CharacterRelation[], chars: Character[]): string {
  if (!relations.length) return '暂无人物关系'
  const charMap = new Map(chars.map(c => [c.id, c.name]))
  return relations.map(r => {
    const src = charMap.get(r.sourceId) || '未知'
    const tgt = charMap.get(r.targetId) || '未知'
    const arrow = r.type === 'bidirectional' ? '↔' : '→'
    return `《${src}》${arrow}《${tgt}》:${r.label}`
  }).join('\n')
}

function formatCharacters(chars: Character[]): string {
  return chars.map(c => [
    `《${c.name}》`,
    `性别:${c.gender || '未设定'}`,
    `年龄:${c.age || '未设定'}`,
    `性格:${c.personality || '未设定'}`,
    `外貌:${c.appearance || '未设定'}`,
    `背景:${c.background || '未设定'}`,
    `关系:${c.relationships || '未设定'}`,
    `备注:${c.notes || '无'}`,
  ].join('\n')).join('\n\n')
}

function formatWorldSettings(settings: WorldSetting[]): string {
  return settings.map(s => `《${s.name}》\n${s.content || '暂无内容'}`).join('\n\n')
}

function formatTimeline(tracks: TimelineTrack[], events: TimelineEvent[]): string {
  const lines: string[] = []
  const sortedTracks = [...tracks].sort((a, b) => a.order - b.order)
  const eventsByTrack: Record<string, TimelineEvent[]> = {}
  for (const e of events) {
    (eventsByTrack[e.trackId] ??= []).push(e)
  }
  for (const track of sortedTracks) {
    const trackEvents = (eventsByTrack[track.id] || []).sort((a, b) => a.order - b.order)
    lines.push(`【${track.name}】`)
    for (const e of trackEvents) {
      const span = e.endOrder && e.endOrder > e.order ? `(第${e.order}→${e.endOrder})` : ''
      const prefix = e.important ? '⭐ ' : ''
      lines.push(`${prefix}${e.order}. ${e.name}${span}:${e.description || '暂无描述'}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

function formatContextChapters(chapters: Chapter[]): string {
  return chapters.map(c => `第${c.order}章 ${c.title}\n${c.content.slice(-500)}`).join('\n\n---\n\n')
}

function formatChapterEndings(chapters: Chapter[]): string {
  return chapters.map(c => `第${c.order}章 ${c.title}\n${c.content.slice(-300)}`).join('\n\n---\n\n')
}

export function buildPrompt(input: PromptInput): string {
  const parts: string[] = []

  parts.push(
    '=== 小说基本信息 ===',
    `小说ID:${input.novelId}`,
    `小说标题:${input.novelTitle}`,
    `小说类型:${input.novelType}`,
    `小说简介:${input.novelDescription || '暂无简介'}`,
    '',
  )

  if (input.chapterTitle) {
    parts.push('=== 当前章节 ===', `章节标题:${input.chapterTitle}`, '')
  }

  if (input.attachments.storyOutline && input.storyOutline) {
    parts.push('=== 小说总大纲 ===', input.storyOutline.content || '暂无总大纲', '')
  }

  if (input.attachments.chapterOutline && input.chapterOutline) {
    parts.push('=== 当前章节简述 ===', input.chapterOutline, '')
  }

  if (input.attachments.worldSettings && input.worldSettings?.length) {
    parts.push('=== 世界观设定 ===', formatWorldSettings(input.worldSettings), '')
  }

  if (input.attachments.characters && input.characters?.length) {
    parts.push('=== 人物设定 ===', formatCharacters(input.characters), '')
    if (input.characterRelations?.length) {
      parts.push('---人物关系---', formatCharacterRelations(input.characterRelations, input.characters), '')
    }
  }

  if (input.attachments.timeline && input.timelineTracks?.length && input.timelineEvents?.length) {
    parts.push('=== 时间线 ===', formatTimeline(input.timelineTracks, input.timelineEvents), '')
  }

  if (input.attachments.contextChapters && input.contextChapters?.length) {
    parts.push('=== 前文概要 ===', formatContextChapters(input.contextChapters), '')
  }

  if (input.attachments.chapterEndings && input.chapterEndings?.length) {
    parts.push('=== 前文章节结尾参考 ===', formatChapterEndings(input.chapterEndings), '')
  }

  parts.push('=== 写作要求 ===')
  parts.push(`1. 叙事视角:${input.prefs.perspective}`)
  parts.push(`2. 目标字数:约 ${input.prefs.wordCount} 字`)
  if (input.prefs.focus) {
    parts.push(`3. 本次重点:${input.prefs.focus}`)
  }
  parts.push('4. 严格优先遵循用户本轮需求,其次参考已存在的章节简述和总大纲')
  parts.push('5. 人物行为要符合既有设定,世界观要保持一致')
  parts.push('6. 如果是在写章节正文,需要确保本章有清晰的起承转合')
  parts.push('7. 如果是在规划故事,不要跳过世界观、人物、事件、大纲、章节简述这些关键层级')
  parts.push('')

  parts.push('=== 用户本轮需求 ===', input.userInput)

  return parts.join('\n')
}

