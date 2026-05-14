import type { Chapter } from '@/types'
import * as db from '../../db'
import { generateId, timestamp } from '../../id'
import { reorderChapters } from '../../reorderChapters'

export const handlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  get_chapter_outline: async ({ chapterId }) => {
    const chapter = await db.get<{ outline: string }>('chapters', chapterId as string)
    return chapter?.outline || '暂无章节大纲'
  },

  get_chapter_content: async ({ chapterId }) => {
    const chapter = await db.get<{ content: string }>('chapters', chapterId as string)
    return chapter?.content || '暂无章节内容'
  },

  get_chapter_descriptions: async ({ novelId }) => {
    const chapters = await db.getAllByIndex<Chapter>('chapters', 'novelId', novelId as string)
    chapters.sort((a, b) => a.order - b.order)
    return JSON.stringify(chapters.map(chapter => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      description: chapter.outline || '',
      descriptionStatus: chapter.outlineStatus || (chapter.content ? 'stale' : 'planned'),
      hasContent: Boolean(chapter.content?.trim()),
      contentLength: chapter.content?.length || 0,
    })))
  },

  get_chapters_range: async (args) => {
    const { novelId, fromOrder, count } = args as Record<string, string | number>
    const allChapters = await db.getAllByIndex<Chapter>('chapters', 'novelId', novelId as string)
    const sorted = allChapters.sort((a, b) => a.order - b.order)
    const start = typeof fromOrder === 'number' ? Math.max(0, fromOrder - 1) : 0
    const end = typeof count === 'number' ? start + count : sorted.length
    const range = sorted.slice(start, end)
    return JSON.stringify(range.map(c => ({
      id: c.id,
      order: c.order,
      title: c.title,
      outline: c.outline || '',
      contentSummary: c.content ? c.content.slice(0, 200) : '',
      contentLength: c.content?.length || 0,
    })))
  },

  get_recent_chapter_endings: async ({ novelId, count }) => {
    const chapters = await db.getAllByIndex<{ title: string; content: string; order: number }>('chapters', 'novelId', novelId as string)
    const sorted = chapters.sort((a, b) => b.order - a.order).slice(0, count as number)
    return JSON.stringify(sorted.map(c => ({
      title: c.title,
      ending: c.content.slice(-300),
    })))
  },

  write_chapter_content: async (args) => {
    const { novelId, chapterId, content } = args as Record<string, string>
    if (!chapterId) return JSON.stringify({ error: '缺少章节ID' })
    const chapter = await db.get<{ id: string; novelId: string; title: string; content: string; updatedAt: number }>('chapters', chapterId)
    if (!chapter) return JSON.stringify({ error: '章节不存在' })
    const updated = { ...chapter, content: content as string, outlineStatus: 'stale' as const, updatedAt: timestamp() }
    await db.put('chapters', updated)
    const wc = (content || '').length
    return JSON.stringify({
      action: 'write_chapter_content',
      chapterTitle: chapter.title,
      wordCount: wc,
      summary: `已将内容写入章节《${chapter.title}》，共${wc}字。`,
    })
  },

  create_chapter: async (args) => {
    const { novelId, title, outline, order } = args as Record<string, string | number>
    if (!novelId) return JSON.stringify({ error: 'Missing novelId' })
    if (!title || !String(title).trim()) return JSON.stringify({ error: 'Missing chapter title' })

    const existing = await db.getAllByIndex<Chapter>('chapters', 'novelId', novelId as string)
    const maxOrder = existing.reduce((max, chapter) => Math.max(max, chapter.order), 0)
    const chapterOrder = typeof order === 'number' && Number.isFinite(order) ? order : maxOrder + 1
    const now = timestamp()

    const chapter: Chapter = {
      id: generateId(),
      novelId: novelId as string,
      title: String(title).trim(),
      order: chapterOrder,
      content: '',
      outline: typeof outline === 'string' ? outline : '',
      createdAt: now,
      updatedAt: now,
    }

    await db.put('chapters', chapter)

    return JSON.stringify({
      action: 'create_chapter',
      entityId: chapter.id,
      entityName: chapter.title,
      order: chapter.order,
      summary: `已创建第${chapter.order}章「${chapter.title}」。`,
    })
  },

  batch_create_chapters: async (args) => {
    const { novelId, chapters } = args as {
      novelId?: string
      chapters?: Array<{ title?: string; outline?: string; order?: number }>
    }

    if (!novelId) return JSON.stringify({ error: 'Missing novelId' })
    if (!chapters || chapters.length === 0) return JSON.stringify({ error: 'No chapters provided' })

    const existing = await db.getAllByIndex<Chapter>('chapters', 'novelId', novelId)
    let nextOrder = existing.reduce((max, chapter) => Math.max(max, chapter.order), 0) + 1
    const now = timestamp()

    const normalized = chapters
      .filter(chapter => chapter.title && chapter.title.trim())
      .map(chapter => {
          const chapterOrder = typeof chapter.order === 'number' && Number.isFinite(chapter.order)
          ? chapter.order
          : nextOrder++

        const outlineStr = chapter.outline || ''

        return {
          id: generateId(),
          novelId,
          title: chapter.title!.trim(),
          order: chapterOrder,
          content: '',
          outline: outlineStr,
          outlineStatus: outlineStr ? 'planned' : undefined,
          createdAt: now,
          updatedAt: now,
        } satisfies Chapter
      })
      .sort((a, b) => a.order - b.order)

    for (const chapter of normalized) {
      await db.put('chapters', chapter)
    }

    return JSON.stringify({
      action: 'batch_create_chapters',
      count: normalized.length,
      chapters: normalized.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
      })),
      summary: `已批量创建 ${normalized.length} 个章节。`,
    })
  },

  update_chapter_outline: async (args) => {
    const { chapterId, outline, title, status } = args as Record<string, string>
    if (!chapterId) return JSON.stringify({ error: 'Missing chapterId' })

    const chapter = await db.get<Chapter>('chapters', chapterId)
    if (!chapter) return JSON.stringify({ error: 'Chapter not found' })

    const updated: Chapter = {
      ...chapter,
      title: typeof title === 'string' && title.trim() ? title.trim() : chapter.title,
      outline: outline || '',
      outlineStatus: (status === 'planned' || status === 'summarized') ? status : chapter.outlineStatus,
      updatedAt: timestamp(),
    }

    await db.put('chapters', updated)

    return JSON.stringify({
      action: 'update_chapter_outline',
      entityId: updated.id,
      entityName: updated.title,
      summary: `已更新章节「${updated.title}」的简述。`,
    })
  },

  generate_chapter_description: async (args) => {
    const { chapterId, description } = args as Record<string, string>
    if (!chapterId) return JSON.stringify({ error: '缺少章节ID' })
    const chapter = await db.get<Chapter>('chapters', chapterId)
    if (!chapter) return JSON.stringify({ error: '章节不存在' })
    chapter.outline = description || ''
    chapter.outlineStatus = 'summarized'
    chapter.updatedAt = timestamp()
    await db.put('chapters', chapter)
    return JSON.stringify({
      action: 'generate_chapter_description',
      chapterId,
      chapterTitle: chapter.title,
      summary: `已生成章节「${chapter.title}」的摘要描述。`,
    })
  },

  replace_chapter_text: async (args) => {
    const { chapterId, oldText, newText } = args as Record<string, string>
    if (!chapterId || !oldText || newText === undefined) return JSON.stringify({ error: '缺少参数' })
    const chapter = await db.get<{ id: string; novelId: string; title: string; content: string; updatedAt: number }>('chapters', chapterId)
    if (!chapter) return JSON.stringify({ error: '章节不存在' })
    if (!chapter.content || !chapter.content.includes(oldText)) return JSON.stringify({ error: '未找到匹配文本，请确认内容一致后重试' })
    chapter.content = chapter.content.replace(oldText, newText)
    chapter.updatedAt = timestamp()
    await db.put('chapters', chapter)
    return JSON.stringify({
      action: 'replace_chapter_text',
      chapterTitle: chapter.title,
      summary: `已在章节「${chapter.title}」中替换指定文本。`,
    })
  },

  insert_chapter_text: async (args) => {
    const { chapterId, anchorText, text, position } = args as Record<string, string>
    if (!chapterId || !anchorText || text === undefined) return JSON.stringify({ error: '缺少参数' })
    const chapter = await db.get<{ id: string; novelId: string; title: string; content: string; updatedAt: number }>('chapters', chapterId)
    if (!chapter) return JSON.stringify({ error: '章节不存在' })
    if (!chapter.content) return JSON.stringify({ error: '章节内容为空' })
    const idx = chapter.content.indexOf(anchorText)
    if (idx === -1) return JSON.stringify({ error: '未找到锚点文本，请确认内容一致后重试' })
    if (position === 'before') {
      chapter.content = chapter.content.slice(0, idx) + text + chapter.content.slice(idx)
    } else {
      chapter.content = chapter.content.slice(0, idx + anchorText.length) + text + chapter.content.slice(idx + anchorText.length)
    }
    chapter.updatedAt = timestamp()
    await db.put('chapters', chapter)
    return JSON.stringify({
      action: 'insert_chapter_text',
      chapterTitle: chapter.title,
      summary: `已在章节「${chapter.title}」中插入文本。`,
    })
  },

  merge_chapters: async (args) => {
    const { targetChapterId, sourceChapterId, mergedContent, mergedOutline } = args as Record<string, string>
    if (!targetChapterId || !sourceChapterId) return JSON.stringify({ error: '缺少章节ID' })
    const target = await db.get<Chapter>('chapters', targetChapterId)
    const source = await db.get<Chapter>('chapters', sourceChapterId)
    if (!target) return JSON.stringify({ error: '目标章节不存在' })
    if (!source) return JSON.stringify({ error: '源章节不存在' })
    target.content = typeof mergedContent === 'string' ? mergedContent : (target.content || '') + '\n\n' + (source.content || '')
    target.outline = typeof mergedOutline === 'string' ? mergedOutline : (target.outline || '')
    target.updatedAt = timestamp()
    await db.put('chapters', target)
    await db.del('chapters', sourceChapterId)
    await reorderChapters(target.novelId)
    return JSON.stringify({
      action: 'merge_chapters',
      chapterTitle: target.title,
      summary: `已将章节「${source.title}」合并至「${target.title}」并删除源章节。`,
    })
  },

  delete_chapter: async (args) => {
    const { chapterId } = args as Record<string, string>
    if (!chapterId) return JSON.stringify({ error: '缺少章节ID' })
    const chapter = await db.get<Chapter>('chapters', chapterId)
    if (!chapter) return JSON.stringify({ error: '章节不存在' })
    await db.del('chapters', chapterId)
    await reorderChapters(chapter.novelId)
    return JSON.stringify({
      action: 'delete_chapter',
      entityName: chapter.title,
      summary: `已删除章节「${chapter.title}」并重排剩余章节序号。`,
    })
  },

  reorder_chapters: async (args) => {
    const { novelId, orderedChapterIds } = args as Record<string, string | string[]>
    if (!orderedChapterIds || !Array.isArray(orderedChapterIds)) return JSON.stringify({ error: '缺少章节排序' })
    for (let i = 0; i < orderedChapterIds.length; i++) {
      const id = orderedChapterIds[i]
      if (!id) continue
      const ch = await db.get<Chapter>('chapters', id)
      if (ch) {
        ch.order = i + 1
        ch.updatedAt = timestamp()
        await db.put('chapters', ch)
      }
    }
    return JSON.stringify({
      action: 'reorder_chapters',
      summary: '已重新排序章节。',
    })
  },
}
