import type { NovelMemory } from '@/types'
import * as db from '../../db'
import { timestamp } from '../../id'

export const memoryHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  get_novel_memory: async ({ novelId }) => {
    const memory = await db.get<NovelMemory>('novelMemory', novelId as string)
    if (!memory) {
      return '暂无小说记忆摘要。可输入"初始化小说记忆"或点击"刷新记忆"让AI阅读全部素材后生成。'
    }
    return JSON.stringify({
      summary: memory.summary,
      lastUpdated: memory.lastUpdated,
    })
  },

  update_novel_memory: async (args) => {
    const { novelId, summary } = args as Record<string, string>
    if (!novelId) return JSON.stringify({ error: '缺少小说ID' })
    const memory: NovelMemory = {
      novelId,
      summary: summary || '',
      lastUpdated: timestamp(),
    }
    await db.put('novelMemory', memory)
    return JSON.stringify({
      action: 'update_novel_memory',
      summary: '已更新小说记忆摘要。',
    })
  },
}
