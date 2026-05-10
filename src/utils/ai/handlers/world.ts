import type { WorldSetting } from '@/types'
import * as db from '../../db'
import { generateId } from '../../id'

export const worldHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  get_world_settings: async ({ novelId }) => {
    const settings = await db.getAllByIndex<{ name: string; content: string }>('worldSettings', 'novelId', novelId as string)
    return JSON.stringify(settings)
  },

  get_story_outline: async ({ novelId }) => {
    const outline = await db.get<{ novelId: string; content: string }>('outlines', novelId as string)
    return JSON.stringify(outline)
  },

  create_world_setting: async (args) => {
    const fields = args as Record<string, string>
    const setting: WorldSetting = {
      id: generateId(),
      novelId: fields.novelId || '',
      name: fields.name || '未命名',
      content: fields.content || '',
    }
    await db.put('worldSettings', setting)
    return JSON.stringify({
      action: 'create_world_setting',
      entityId: setting.id,
      entityName: setting.name,
      summary: `已创建世界观设定「${setting.name}」。`,
    })
  },

  update_world_setting: async (args) => {
    const { id, ...fields } = args as Record<string, string>
    if (!id) return JSON.stringify({ error: '缺少设定ID' })
    const existing = await db.get<WorldSetting>('worldSettings', id)
    if (!existing) return JSON.stringify({ error: '设定不存在' })
    const updated = { ...existing, ...fields }
    await db.put('worldSettings', updated)
    return JSON.stringify({
      action: 'update_world_setting',
      entityId: id,
      entityName: existing.name,
      summary: `已更新世界观设定「${existing.name}」。`,
    })
  },

  delete_world_setting: async (args) => {
    const { id } = args as Record<string, string>
    if (!id) return JSON.stringify({ error: '缺少设定ID' })
    const existing = await db.get<WorldSetting>('worldSettings', id)
    if (!existing) return JSON.stringify({ error: '设定不存在' })
    await db.del('worldSettings', id)
    return JSON.stringify({
      action: 'delete_world_setting',
      entityName: existing.name,
      summary: `已删除世界观设定「${existing.name}」。`,
    })
  },

  update_story_outline: async ({ novelId, content }) => {
    const outline = { novelId: novelId as string, content: content as string }
    await db.put('outlines', outline)
    return JSON.stringify({
      action: 'update_story_outline',
      summary: '已更新故事大纲。',
    })
  },
}
