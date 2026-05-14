import * as db from '../../db'
import { generateId, timestamp } from '../../id'

export const timelineHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  get_timeline: async ({ novelId }) => {
    const tracks = await db.getAllByIndex<{ id: string; name: string; order: number }>('timelineTracks', 'novelId', novelId as string)
    const events = await db.getAllByIndex<{ trackId: string; name: string; description: string; order: number; endOrder?: number; important?: boolean }>('timelineEvents', 'novelId', novelId as string)
    tracks.sort((a, b) => a.order - b.order)
    const byTrack: Record<string, typeof events> = {}
    for (const e of events) {
      (byTrack[e.trackId] ??= []).push(e)
    }
    const timeline: Array<{ trackId: string; trackName: string; events: Array<{ name: string; description: string; order: number; endOrder?: number; important?: boolean }> }> = []
    for (const track of tracks) {
      const trackEvents = (byTrack[track.id] || []).sort((a, b) => a.order - b.order)
      timeline.push({
        trackId: track.id,
        trackName: track.name,
        events: trackEvents.map(e => ({
          id: (e as any).id,
          name: e.name,
          description: e.description,
          order: e.order,
          endOrder: e.endOrder,
          important: e.important,
        })),
      })
    }
    return JSON.stringify({ timeline })
  },

  create_timeline_track: async (args) => {
    const fields = args as Record<string, string | number>
    const novelId = fields.novelId as string
    if (!novelId) return JSON.stringify({ error: '缺少小说ID' })
    const name = (fields.name as string) || '未命名'
    const existing = await db.getAllByIndex<{ order: number }>('timelineTracks', 'novelId', novelId)
    const maxOrder = existing.reduce((max, t) => Math.max(max, t.order), 0)
    const now = timestamp()
    const track = {
      id: generateId(),
      novelId,
      name,
      order: typeof fields.order === 'number' ? fields.order : maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }
    await db.put('timelineTracks', track)
    return JSON.stringify({
      action: 'create_timeline_track',
      entityId: track.id,
      entityName: track.name,
      summary: `已创建时间线轨道「${name}」（ID: ${track.id}），现在可以用 create_event 往这个轨道添加事件了。`,
    })
  },

  create_event: async (args) => {
    const fields = args as Record<string, string | number | boolean>
    const novelId = fields.novelId as string
    const trackId = fields.trackId as string
    if (!trackId) return JSON.stringify({ error: '缺少时间线ID（trackId），请先调用 get_timeline 查看可用时间线' })
    if (!novelId) return JSON.stringify({ error: '缺少小说ID' })
    const trackExists = await db.get('timelineTracks', trackId)
    if (!trackExists) {
      return JSON.stringify({ error: `trackId "${trackId}" 无效，不是已创建的时间线ID。请先调用 get_timeline 获取真实的时间线ID（注意：这是ID不是名称），然后再用真实的 trackId 创建事件。` })
    }
    const existing = await db.getAllByIndex<{ order: number }>('timelineEvents', 'novelId', novelId)
    const maxOrder = existing.reduce((max, e) => Math.max(max, e.order), 0)
    const now = timestamp()
    const event = {
      id: generateId(),
      novelId,
      trackId,
      name: (fields.name as string) || '未命名',
      description: (fields.description as string) || '',
      order: typeof fields.order === 'number' ? fields.order : maxOrder + 1,
      endOrder: typeof fields.endOrder === 'number' ? fields.endOrder : undefined,
      important: fields.important === true || fields.important === 'true' ? true : undefined,
      createdAt: now,
      updatedAt: now,
    }
    await db.put('timelineEvents', event)
    return JSON.stringify({
      action: 'create_event',
      entityId: event.id,
      entityName: event.name,
      summary: `已在时间线创建事件「${event.name}」。`,
    })
  },

  update_event: async (args) => {
    const { id, ...fields } = args as Record<string, string | number>
    const existing = await db.get('timelineEvents', id as string)
    if (!existing) return JSON.stringify({ error: '事件不存在' })
    const updated = { ...existing, ...fields, updatedAt: timestamp() }
    await db.put('timelineEvents', updated)
    return JSON.stringify({
      action: 'update_event',
      entityId: id,
      entityName: (existing as Record<string, unknown>).name,
      summary: `已更新事件。`,
    })
  },

  delete_event: async (args) => {
    const { id } = args as Record<string, string>
    if (!id) return JSON.stringify({ error: '缺少事件ID' })
    const existing = await db.get('timelineEvents', id)
    if (!existing) return JSON.stringify({ error: '事件不存在' })
    await db.del('timelineEvents', id)
    return JSON.stringify({
      action: 'delete_event',
      entityName: (existing as Record<string, unknown>).name,
      summary: `已删除事件。`,
    })
  },
}
