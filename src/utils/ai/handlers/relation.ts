import * as db from '../../db'
import { generateId } from '../../id'

export const relationHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  create_relation: async (args) => {
    const fields = args as Record<string, string>
    if (!fields.novelId || !fields.sourceId || !fields.targetId) return JSON.stringify({ error: '缺少必要参数' })
    const relation = {
      id: generateId(),
      novelId: fields.novelId,
      sourceId: fields.sourceId,
      targetId: fields.targetId,
      label: fields.label || '未命名关系',
      type: (fields.type === 'bidirectional' ? 'bidirectional' : 'directed') as 'directed' | 'bidirectional',
    }
    await db.put('characterRelations', relation)
    return JSON.stringify({
      action: 'create_relation',
      entityId: relation.id,
      summary: `已创建人物关系：${relation.label}`,
    })
  },

  update_relation: async (args) => {
    const { id, ...fields } = args as Record<string, string>
    if (!id) return JSON.stringify({ error: '缺少关系ID' })
    const existing = await db.get('characterRelations', id)
    if (!existing) return JSON.stringify({ error: '关系不存在' })
    const updated = { ...existing, ...fields }
    if (fields.type && !['directed', 'bidirectional'].includes(fields.type)) {
      return JSON.stringify({ error: '无效的关系类型，必须是 directed 或 bidirectional' })
    }
    await db.put('characterRelations', updated)
    return JSON.stringify({
      action: 'update_relation',
      entityId: id,
      summary: `已更新人物关系。`,
    })
  },

  delete_relation: async (args) => {
    const { id } = args as Record<string, string>
    if (!id) return JSON.stringify({ error: '缺少关系ID' })
    const existing = await db.get('characterRelations', id)
    if (!existing) return JSON.stringify({ error: '关系不存在' })
    await db.del('characterRelations', id)
    const rel = existing as Record<string, unknown>
    return JSON.stringify({
      action: 'delete_relation',
      entityName: rel.label,
      summary: `已删除人物关系「${rel.label}」。`,
    })
  },
}
