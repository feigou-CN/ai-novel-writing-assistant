import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Character, WorldSetting, EventItem, StoryOutline, NovelMemory, TimelineTrack, TimelineEvent, CharacterRelation } from '@/types'
import { getAllByIndex, getAll, get, put, del } from '@/utils/db'
import { generateId, timestamp } from '@/utils/id'

export const useMaterialStore = defineStore('material', () => {
  const characters = ref<Character[]>([])
  const worldSettings = ref<WorldSetting[]>([])
  const events = ref<EventItem[]>([])   // legacy, kept for migration
  const timelineTracks = ref<TimelineTrack[]>([])
  const timelineEvents = ref<TimelineEvent[]>([])
  const characterRelations = ref<CharacterRelation[]>([])
  const storyOutline = ref<StoryOutline | null>(null)
  const novelMemory = ref<NovelMemory | null>(null)

  // === Characters ===
  async function fetchCharacters(novelId: string) {
    characters.value = await getAllByIndex<Character>('characters', 'novelId', novelId)
  }

  async function saveCharacter(data: Omit<Character, 'id' | 'novelId'> & { id?: string; novelId: string }) {
    const existing = data.id ? characters.value.find(c => c.id === data.id) : undefined
    const character: Character = {
      ...existing,
      id: data.id || generateId(),
      novelId: data.novelId,
      name: data.name,
      gender: data.gender || '',
      age: data.age || '',
      personality: data.personality || '',
      appearance: data.appearance || '',
      background: data.background || '',
      relationships: data.relationships || '',
      notes: data.notes || '',
      positionX: data.positionX ?? existing?.positionX,
      positionY: data.positionY ?? existing?.positionY,
    }
    await put('characters', character)
    const idx = characters.value.findIndex(c => c.id === character.id)
    if (idx !== -1) characters.value[idx] = character
    else characters.value.push(character)
    return character
  }

  async function deleteCharacter(id: string) {
    await del('characters', id)
    characters.value = characters.value.filter(c => c.id !== id)
  }

  // === World Settings ===
  async function fetchWorldSettings(novelId: string) {
    worldSettings.value = await getAllByIndex<WorldSetting>('worldSettings', 'novelId', novelId)
  }

  async function saveWorldSetting(data: { id?: string; novelId: string; name: string; content: string }) {
    const setting: WorldSetting = {
      id: data.id || generateId(),
      novelId: data.novelId,
      name: data.name,
      content: data.content,
    }
    await put('worldSettings', setting)
    const idx = worldSettings.value.findIndex(s => s.id === setting.id)
    if (idx !== -1) worldSettings.value[idx] = setting
    else worldSettings.value.push(setting)
    return setting
  }

  async function deleteWorldSetting(id: string) {
    await del('worldSettings', id)
    worldSettings.value = worldSettings.value.filter(s => s.id !== id)
  }

  // === Legacy Events (migration only) ===
  async function fetchEvents(novelId: string) {
    events.value = await getAllByIndex<EventItem>('events', 'novelId', novelId)
    events.value.sort((a, b) => a.order - b.order)
  }

  // === Timeline Tracks ===
  async function fetchTimelineTracks(novelId: string) {
    timelineTracks.value = await getAllByIndex<TimelineTrack>('timelineTracks', 'novelId', novelId)
    timelineTracks.value.sort((a, b) => a.order - b.order)
  }

  async function saveTimelineTrack(data: { id?: string; novelId: string; name: string; order: number }) {
    const now = timestamp()
    const existing = data.id ? timelineTracks.value.find(t => t.id === data.id) : undefined
    const track: TimelineTrack = {
      id: data.id || generateId(),
      novelId: data.novelId,
      name: data.name,
      order: data.order,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    await put('timelineTracks', track)
    const idx = timelineTracks.value.findIndex(t => t.id === track.id)
    if (idx !== -1) timelineTracks.value[idx] = track
    else timelineTracks.value.push(track)
    timelineTracks.value.sort((a, b) => a.order - b.order)
    return track
  }

  async function deleteTimelineTrack(id: string) {
    await del('timelineTracks', id)
    timelineTracks.value = timelineTracks.value.filter(t => t.id !== id)
    // Remove events belonging to this track
    timelineEvents.value = timelineEvents.value.filter(e => e.trackId !== id)
    await Promise.all(
      (await getAllByIndex<TimelineEvent>('timelineEvents', 'trackId', id))
        .map(e => del('timelineEvents', e.id))
    )
  }

  // === Timeline Events ===
  async function fetchTimelineEvents(novelId: string) {
    timelineEvents.value = await getAllByIndex<TimelineEvent>('timelineEvents', 'novelId', novelId)
    timelineEvents.value.sort((a, b) => a.order - b.order)
  }

  async function saveTimelineEvent(data: {
    id?: string
    novelId: string
    trackId: string
    name: string
    description: string
    order: number
    endOrder?: number
    important?: boolean
  }) {
    const now = timestamp()
    const existing = data.id ? timelineEvents.value.find(e => e.id === data.id) : undefined
    const event: TimelineEvent = {
      id: data.id || generateId(),
      novelId: data.novelId,
      trackId: data.trackId,
      name: data.name,
      description: data.description || '',
      order: data.order,
      endOrder: data.endOrder,
      important: data.important || undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    await put('timelineEvents', event)
    const idx = timelineEvents.value.findIndex(e => e.id === event.id)
    if (idx !== -1) timelineEvents.value[idx] = event
    else timelineEvents.value.push(event)
    timelineEvents.value.sort((a, b) => a.order - b.order)
    return event
  }

  async function deleteTimelineEvent(id: string) {
    await del('timelineEvents', id)
    timelineEvents.value = timelineEvents.value.filter(e => e.id !== id)
  }

  // === Character Relations ===
  async function fetchCharacterRelations(novelId: string) {
    characterRelations.value = await getAllByIndex<CharacterRelation>('characterRelations', 'novelId', novelId)
  }

  async function saveCharacterRelation(data: {
    id?: string
    novelId: string
    sourceId: string
    targetId: string
    label: string
    type: 'directed' | 'bidirectional'
  }) {
    const existing = data.id ? characterRelations.value.find(r => r.id === data.id) : undefined
    const relation: CharacterRelation = {
      id: data.id || generateId(),
      novelId: data.novelId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      label: data.label,
      type: data.type,
    }
    await put('characterRelations', relation)
    const idx = characterRelations.value.findIndex(r => r.id === relation.id)
    const current = characterRelations.value
    if (idx !== -1) {
      current[idx] = relation
    } else {
      current.push(relation)
    }
    // Force new array reference to guarantee reactivity triggers (e.g. computed edges in CharacterGraph)
    characterRelations.value = [...current]
    return relation
  }

  async function deleteCharacterRelation(id: string) {
    await del('characterRelations', id)
    characterRelations.value = characterRelations.value.filter(r => r.id !== id)
  }

  // === Migration from legacy events ===
  async function migrateEventsIfNeeded(novelId: string) {
    const hasOldEvents = events.value.length > 0
    const alreadyMigrated = timelineTracks.value.length > 0
    if (!hasOldEvents || alreadyMigrated) return

    // Create a default track for old events
    const defaultTrack = await saveTimelineTrack({
      novelId,
      name: '主线',
      order: 1,
    })

    // Migrate each event
    for (const ev of events.value) {
      await saveTimelineEvent({
        novelId,
        trackId: defaultTrack.id,
        name: ev.name,
        description: ev.description,
        order: ev.order,
      })
    }
  }

  // === Story Outline ===
  async function fetchOutline(novelId: string) {
    const outline = await get<StoryOutline>('outlines', novelId)
    storyOutline.value = outline || null
    return outline
  }

  async function saveOutline(novelId: string, content: string) {
    const outline: StoryOutline = { novelId, content }
    await put('outlines', outline)
    storyOutline.value = outline
    return outline
  }

  // === Novel Memory ===
  async function fetchMemory(novelId: string) {
    const memory = await get<NovelMemory>('novelMemory', novelId)
    novelMemory.value = memory || null
  }

  async function updateMemory(novelId: string, summary: string) {
    const memory: NovelMemory = { novelId, summary, lastUpdated: timestamp() }
    await put('novelMemory', memory)
    novelMemory.value = memory
  }

  async function loadAll(novelId: string) {
    await Promise.all([
      fetchCharacters(novelId),
      fetchWorldSettings(novelId),
      fetchEvents(novelId),
      fetchTimelineTracks(novelId),
      fetchTimelineEvents(novelId),
      fetchCharacterRelations(novelId),
      fetchOutline(novelId),
      fetchMemory(novelId),
    ])
    // Auto-migrate legacy events to timeline on first load
    await migrateEventsIfNeeded(novelId)
  }

  return {
    characters,
    worldSettings,
    events,
    characterRelations,
    timelineTracks,
    timelineEvents,
    storyOutline,
    novelMemory,
    fetchCharacters,
    saveCharacter,
    deleteCharacter,
    fetchWorldSettings,
    saveWorldSetting,
    deleteWorldSetting,
    fetchEvents,
    fetchTimelineTracks,
    saveTimelineTrack,
    deleteTimelineTrack,
    fetchTimelineEvents,
    saveTimelineEvent,
    deleteTimelineEvent,
    fetchCharacterRelations,
    saveCharacterRelation,
    deleteCharacterRelation,
    fetchOutline,
    saveOutline,
    fetchMemory,
    updateMemory,
    loadAll,
  }
})
