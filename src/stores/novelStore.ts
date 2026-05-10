import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Novel } from '@/types'
import { getAll, get, put, del, deleteByIndex } from '@/utils/db'
import { generateId, timestamp } from '@/utils/id'

export const useNovelStore = defineStore('novel', () => {
  const novels = ref<Novel[]>([])
  const currentNovel = ref<Novel | null>(null)
  const loading = ref(false)

  async function fetchNovels() {
    loading.value = true
    try {
      novels.value = await getAll<Novel>('novels')
      novels.value.sort((a, b) => b.updatedAt - a.updatedAt)
    } finally {
      loading.value = false
    }
  }

  async function getNovelById(id: string) {
    const novel = await get<Novel>('novels', id)
    if (novel) {
      currentNovel.value = novel
    }
    return novel
  }

  async function createNovel(data: { title: string; type: string; description: string }): Promise<Novel> {
    const now = timestamp()
    const novel: Novel = {
      id: generateId(),
      title: data.title,
      type: data.type,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    }
    await put('novels', novel)
    novels.value.unshift(novel)
    return novel
  }

  async function updateNovel(id: string, data: Partial<Novel>) {
    const novel = await get<Novel>('novels', id)
    if (!novel) return
    Object.assign(novel, data, { updatedAt: timestamp() })
    await put('novels', novel)
    if (currentNovel.value?.id === id) {
      currentNovel.value = novel
    }
    const idx = novels.value.findIndex(n => n.id === id)
    if (idx !== -1) novels.value[idx] = novel
  }

  async function deleteNovel(id: string) {
    await del('novels', id)
    // cascade delete related data
    await Promise.all([
      deleteByIndex('chapters', 'novelId', id),
      deleteByIndex('characters', 'novelId', id),
      deleteByIndex('worldSettings', 'novelId', id),
      deleteByIndex('events', 'novelId', id),
      deleteByIndex('chatMessages', 'novelId', id),
      deleteByIndex('timelineTracks', 'novelId', id),
      deleteByIndex('timelineEvents', 'novelId', id),
    ])
    // outlines keyed by novelId, novelMemory keyed by novelId
    await del('outlines', id)
    await del('novelMemory', id)
    novels.value = novels.value.filter(n => n.id !== id)
    if (currentNovel.value?.id === id) {
      currentNovel.value = null
    }
  }

  return {
    novels,
    currentNovel,
    loading,
    fetchNovels,
    getNovelById,
    createNovel,
    updateNovel,
    deleteNovel,
  }
})
