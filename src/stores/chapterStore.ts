import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Chapter } from '@/types'
import { getAllByIndex, get, put, del } from '@/utils/db'
import { generateId, timestamp } from '@/utils/id'

export const useChapterStore = defineStore('chapter', () => {
  const chapters = ref<Chapter[]>([])
  const currentChapter = ref<Chapter | null>(null)
  const loading = ref(false)

  const sortedChapters = computed(() =>
    [...chapters.value].sort((a, b) => a.order - b.order)
  )

  async function fetchChapters(novelId: string) {
    loading.value = true
    try {
      chapters.value = await getAllByIndex<Chapter>('chapters', 'novelId', novelId)
    } finally {
      loading.value = false
    }
  }

  async function getChapterById(id: string) {
    const chapter = await get<Chapter>('chapters', id)
    if (chapter) {
      if (currentChapter.value && currentChapter.value.id === id) {
        // Update in-place to preserve reactive bindings (v-model etc.)
        Object.assign(currentChapter.value, chapter)
      } else {
        currentChapter.value = chapter
      }
    }
    return chapter
  }

  async function createChapter(novelId: string, title: string, outline = ''): Promise<Chapter> {
    const now = timestamp()
    const maxOrder = chapters.value.reduce((max, ch) => Math.max(max, ch.order), 0)
    const chapter: Chapter = {
      id: generateId(),
      novelId,
      title,
      order: maxOrder + 1,
      content: '',
      outline,
      outlineStatus: outline ? 'planned' : undefined,
      createdAt: now,
      updatedAt: now,
    }
    await put('chapters', chapter)
    chapters.value.push(chapter)
    currentChapter.value = chapter
    return chapter
  }

  async function updateChapter(id: string, data: Partial<Chapter>) {
    const chapter = await get<Chapter>('chapters', id)
    if (!chapter) return
    const nextData = { ...data }
    if ('content' in data && data.content !== chapter.content && !('outlineStatus' in data)) {
      nextData.outlineStatus = data.content ? 'stale' : chapter.outlineStatus
    }
    Object.assign(chapter, nextData, { updatedAt: timestamp() })
    await put('chapters', chapter)
    const idx = chapters.value.findIndex(ch => ch.id === id)
    if (idx !== -1) chapters.value[idx] = chapter
    if (currentChapter.value?.id === id) {
      currentChapter.value = chapter
    }
  }

  async function deleteChapter(id: string) {
    await del('chapters', id)
    chapters.value = chapters.value.filter(ch => ch.id !== id)
    if (currentChapter.value?.id === id) {
      // Set to next available or null
      const remaining = sortedChapters.value
      currentChapter.value = remaining.length > 0 ? (remaining[0] ?? null) : null
    }
  }

  function setCurrentChapter(chapter: Chapter | null) {
    currentChapter.value = chapter
  }

  return {
    chapters,
    currentChapter,
    loading,
    sortedChapters,
    fetchChapters,
    getChapterById,
    createChapter,
    updateChapter,
    deleteChapter,
    setCurrentChapter,
  }
})
