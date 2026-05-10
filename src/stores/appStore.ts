import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { APISettings, WritingPrefs, AttachmentsState, AttachmentSelections, APIPreset } from '@/types'
import { API_PRESETS } from '@/config/api'

const API_SETTINGS_KEY = 'novel-app-settings'
const WRITING_PREFS_KEY = 'novel-writing-prefs'
const ATTACHMENTS_KEY = 'novel-attachments'
const PRESET_KEY = 'novel-selected-preset'
const ATTACH_SEL_KEY = 'novel-attachment-selections'
const PANEL_WIDTH_KEY = 'novel-right-panel-width'
const DARK_MODE_KEY = 'novel-dark-mode'

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const useAppStore = defineStore('app', () => {
  // === API Settings ===
  const apiSettings = ref<APISettings>(
    loadJSON<APISettings>(API_SETTINGS_KEY, {
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
    })
  )

  watch(apiSettings, (val) => {
    localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(val))
  }, { deep: true })

  function updateAPISettings(settings: Partial<APISettings>) {
    Object.assign(apiSettings.value, settings)
  }

  // === Writing Preferences ===
  const writingPrefs = ref<WritingPrefs>(
    loadJSON<WritingPrefs>(WRITING_PREFS_KEY, {
      perspective: '第三人称',
      wordCount: 2000,
      focus: '',
    })
  )

  watch(writingPrefs, (val) => {
    localStorage.setItem(WRITING_PREFS_KEY, JSON.stringify(val))
  }, { deep: true })

  function updateWritingPrefs(prefs: Partial<WritingPrefs>) {
    Object.assign(writingPrefs.value, prefs)
  }

  // === Default Attachments ===
  const defaultAttachments = ref<AttachmentsState>(
    loadJSON<AttachmentsState>(ATTACHMENTS_KEY, {
      characters: false,
      worldSettings: false,
      storyOutline: false,
      chapterOutline: false,
      timeline: false,
      contextChapters: false,
      chapterEndings: false,
    })
  )

  watch(defaultAttachments, (val) => {
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(val))
  }, { deep: true })

  function updateDefaultAttachments(att: Partial<AttachmentsState>) {
    Object.assign(defaultAttachments.value, att)
  }

  // === API Presets ===
  const selectedPreset = ref<string | null>(loadJSON<string | null>(PRESET_KEY, null))

  watch(selectedPreset, (val) => {
    localStorage.setItem(PRESET_KEY, JSON.stringify(val))
  })

  function applyPreset(name: string) {
    const preset = API_PRESETS.find(p => p.name === name)
    if (!preset) return
    selectedPreset.value = name
    if (preset.baseURL) {
      apiSettings.value.baseURL = preset.baseURL
    }
    if (preset.model) {
      apiSettings.value.model = preset.model
    }
    fetchModels()
  }

  // === Attachment Selections ===
  const attachmentSelections = ref<AttachmentSelections>(
    loadJSON<AttachmentSelections>(ATTACH_SEL_KEY, {
      characters: [],
      worldSettings: [],
      timeline: [],
    })
  )

  watch(attachmentSelections, (val) => {
    localStorage.setItem(ATTACH_SEL_KEY, JSON.stringify(val))
  }, { deep: true })

  function updateAttachmentSelections(action: Partial<AttachmentSelections>) {
    Object.assign(attachmentSelections.value, action)
  }

  // === Available Models (fetched from API) ===
  const availableModels = ref<string[]>([])
  const modelsLoading = ref(false)

  async function fetchModels() {
    const { baseURL, apiKey } = apiSettings.value
    if (!baseURL) {
      availableModels.value = []
      return
    }
    modelsLoading.value = true
    try {
      const response = await fetch(`${baseURL.replace(/\/+$/, '')}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (response.ok) {
        const data = await response.json() as { data?: Array<{ id: string }> }
        availableModels.value = (data.data || []).map(m => m.id)
      }
    } catch {
      // Keep existing list on error
    } finally {
      modelsLoading.value = false
    }
  }

  // === Panel Width ===
  const rightPanelWidth = ref<number>(
    Number(loadJSON<number>(PANEL_WIDTH_KEY, 440))
  )

  watch(rightPanelWidth, (val) => {
    localStorage.setItem(PANEL_WIDTH_KEY, JSON.stringify(val))
  })

  // === Dark Mode ===
  const isDarkMode = ref<boolean>(loadJSON<boolean>(DARK_MODE_KEY, false))

  watch(isDarkMode, (val) => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(val))
  })

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
  }

  return {
    apiSettings,
    writingPrefs,
    defaultAttachments,
    selectedPreset,
    attachmentSelections,
    rightPanelWidth,
    availableModels,
    modelsLoading,
    isDarkMode,
    updateAPISettings,
    updateWritingPrefs,
    updateDefaultAttachments,
    applyPreset,
    updateAttachmentSelections,
    fetchModels,
    toggleDarkMode,
  }
})
