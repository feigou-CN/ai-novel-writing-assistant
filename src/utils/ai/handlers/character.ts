import type { Character, ToolCall } from '@/types'
import * as db from '../../db'
import { generateId } from '../../id'

export const handlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  get_characters: async ({ novelId }) => {
    const characters = await db.getAllByIndex<{ id: string; name: string; personality: string; background: string; gender: string; age: string; appearance: string; relationships: string; notes: string }>('characters', 'novelId', novelId as string)
    return JSON.stringify(characters.map(c => ({
      id: c.id,
      name: c.name,
      personality: c.personality,
      background: c.background,
      gender: c.gender,
      age: c.age,
      appearance: c.appearance,
      relationships: c.relationships,
      notes: c.notes,
    })))
  },

  get_character: async ({ id }) => {
    const character = await db.get('characters', id as string)
    return JSON.stringify(character)
  },

  create_character: async (args) => {
    const fields = args as Record<string, string>
    const character: Character = {
      id: generateId(),
      novelId: fields.novelId || '',
      name: fields.name || '未命名',
      gender: fields.gender || '',
      age: fields.age || '',
      personality: fields.personality || '',
      appearance: fields.appearance || '',
      background: fields.background || '',
      relationships: fields.relationships || '',
      notes: fields.notes || '',
    }
    await db.put('characters', character)
    return JSON.stringify({
      action: 'create_character',
      entityId: character.id,
      entityName: character.name,
      summary: `已创建新角色「${character.name}」。`,
    })
  },

  update_character: async (args) => {
    const { id, ...fields } = args as Record<string, string>
    if (!id) return JSON.stringify({ error: '缺少角色ID' })
    const existing = await db.get<Character>('characters', id)
    if (!existing) return JSON.stringify({ error: '角色不存在' })
    const updated = { ...existing, ...fields }
    await db.put('characters', updated)
    return JSON.stringify({
      action: 'update_character',
      entityId: id,
      entityName: existing.name,
      summary: `已更新角色「${existing.name}」的信息。`,
    })
  },

  delete_character: async (args) => {
    const { id } = args as Record<string, string>
    if (!id) return JSON.stringify({ error: '缺少角色ID' })
    const existing = await db.get<Character>('characters', id)
    if (!existing) return JSON.stringify({ error: '角色不存在' })
    // Clean up associated relations
    const allRels = await db.getAllByIndex('characterRelations', 'novelId', existing.novelId)
    for (const rel of (allRels as Array<{ id: string; sourceId: string; targetId: string }>)) {
      if (rel.sourceId === id || rel.targetId === id) {
        await db.del('characterRelations', rel.id)
      }
    }
    await db.del('characters', id)
    return JSON.stringify({
      action: 'delete_character',
      entityName: existing.name,
      summary: `已删除角色「${existing.name}」及关联关系。`,
    })
  },
}
