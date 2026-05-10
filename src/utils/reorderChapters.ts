import type { Chapter } from '@/types'
import { getAllByIndex, put } from '@/utils/db'

/**
 * 对指定小说的章节进行重排序（从 1 开始连续编号）
 * 用于删除或合并章节后保持顺序连续
 */
export async function reorderChapters(novelId: string): Promise<void> {
  const allChapters = await getAllByIndex<Chapter>('chapters', 'novelId', novelId)
  allChapters.sort((a, b) => a.order - b.order)
  for (let i = 0; i < allChapters.length; i++) {
    const ch = allChapters[i]
    if (!ch) continue
    if (ch.order !== i + 1) {
      ch.order = i + 1
      await put('chapters', ch)
    }
  }
}
