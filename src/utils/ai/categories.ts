/**
 * AI 工具分类 — 按交互模式分组
 */

/** 交互类工具（需要用户输入） */
export const INTERACTION_TOOLS = new Set(['ask_questions', 'suggest_solutions'])

export function isInteractionTool(name: string): boolean {
  return INTERACTION_TOOLS.has(name)
}

/** 写操作类工具（写入数据库） */
export const WRITE_TOOLS = new Set([
  'write_chapter_content',
  'create_chapter',
  'batch_create_chapters',
  'update_chapter_outline',
  'replace_chapter_text',
  'insert_chapter_text',
  'merge_chapters',
  'generate_chapter_description',
  'create_character',
  'update_character',
  'create_world_setting',
  'update_world_setting',
  'create_event',
  'update_event',
  'update_story_outline',
  'delete_character',
  'delete_world_setting',
  'delete_event',
  'delete_chapter',
  'reorder_chapters',
  'update_novel_memory',
  'create_timeline_track',
  'create_relation',
  'update_relation',
  'delete_relation',
])

export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name)
}

/** 破坏性工具（需要用户确认） */
export const DESTRUCTIVE_TOOLS = new Set([
  'delete_character',
  'delete_world_setting',
  'delete_event',
  'delete_chapter',
  'reorder_chapters',
  'merge_chapters',
  'delete_relation',
])

export function isDestructiveTool(name: string): boolean {
  return DESTRUCTIVE_TOOLS.has(name)
}
