<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Upload } from '@element-plus/icons-vue'
import { useNovelStore } from '@/stores/novelStore'
import { useChapterStore } from '@/stores/chapterStore'
import { useMaterialStore } from '@/stores/materialStore'
import { useAppStore } from '@/stores/appStore'
import { put as dbPut } from '@/utils/db'
import { generateId, timestamp } from '@/utils/id'

const emit = defineEmits<{ imported: [] }>()

const novelStore = useNovelStore()
const chapterStore = useChapterStore()
const materialStore = useMaterialStore()
const appStore = useAppStore()

const dialogVisible = defineModel<boolean>('visible', { default: false })
const importFileInput = ref<HTMLInputElement | null>(null)

// === Format helpers ===

function formatTime(): string {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// === Markdown exports ===

function exportCharacters() {
  const chars = materialStore.characters
  if (!chars.length) { ElMessage.warning('暂无人物设定'); return }
  const novel = novelStore.currentNovel!
  const lines = [`# 人物设定 — ${novel.title}`, `导出时间：${formatTime()}\n---\n`]
  for (const c of chars) {
    lines.push(`## ${c.name}`)
    if (c.gender) lines.push(`- **性别**：${c.gender}`)
    if (c.age) lines.push(`- **年龄**：${c.age}`)
    if (c.personality) lines.push(`- **性格**：${c.personality}`)
    if (c.appearance) lines.push(`- **外貌**：${c.appearance}`)
    if (c.background) lines.push(`- **背景**：${c.background}`)
    if (c.relationships) lines.push(`- **关系**：${c.relationships}`)
    if (c.notes) lines.push(`- **备注**：${c.notes}`)
    lines.push('')
  }
  downloadFile(lines.join('\n'), `${novel.title}-人物设定.md`, 'text/markdown')
  ElMessage.success('人物设定已导出')
}

function exportWorldSettings() {
  const settings = materialStore.worldSettings
  if (!settings.length) { ElMessage.warning('暂无世界观设定'); return }
  const novel = novelStore.currentNovel!
  const lines = [`# 世界观设定 — ${novel.title}`, `导出时间：${formatTime()}\n---\n`]
  for (const s of settings) {
    lines.push(`## ${s.name}`)
    lines.push(s.content || '暂无内容')
    lines.push('')
  }
  downloadFile(lines.join('\n'), `${novel.title}-世界观设定.md`, 'text/markdown')
  ElMessage.success('世界观设定已导出')
}

function exportTimeline() {
  const tracks = materialStore.timelineTracks
  const events = materialStore.timelineEvents
  if (!tracks.length) { ElMessage.warning('暂无时间线'); return }
  const novel = novelStore.currentNovel!
  const lines = [`# 时间线 — ${novel.title}`, `导出时间：${formatTime()}\n---\n`]
  for (const track of tracks) {
    lines.push(`## ${track.name}`)
    const trackEvents = events.filter(e => e.trackId === track.id).sort((a, b) => a.order - b.order)
    for (const e of trackEvents) {
      const prefix = e.important ? '⭐ ' : ''
      const span = e.endOrder && e.endOrder > e.order ? `（第${e.order}→${e.endOrder}）` : ''
      lines.push(`${prefix}${e.order}. ${e.name}${span}`)
      if (e.description) lines.push(`   ${e.description}`)
    }
    lines.push('')
  }
  downloadFile(lines.join('\n'), `${novel.title}-时间线.md`, 'text/markdown')
  ElMessage.success('时间线已导出')
}

function exportChapters() {
  const chapters = chapterStore.sortedChapters
  if (!chapters.length) { ElMessage.warning('暂无章节'); return }
  const novel = novelStore.currentNovel!
  const lines = [`# ${novel.title}`, `类型：${novel.type}`, `导出时间：${formatTime()}\n---\n`]
  for (const ch of chapters) {
    lines.push(`## 第${ch.order}章 ${ch.title}`)
    if (ch.outline) lines.push(`> 简述：${ch.outline}\n`)
    lines.push(ch.content || '（暂无内容）')
    lines.push('\n---\n')
  }
  downloadFile(lines.join('\n'), `${novel.title}-正文.md`, 'text/markdown')
  ElMessage.success('章节正文已导出')
}

function exportStoryOutline() {
  const outline = materialStore.storyOutline
  if (!outline?.content?.trim()) { ElMessage.warning('暂无故事大纲'); return }
  const novel = novelStore.currentNovel!
  const lines = [`# 故事大纲 — ${novel.title}`, `导出时间：${formatTime()}\n---\n`, outline.content]
  downloadFile(lines.join('\n'), `${novel.title}-故事大纲.md`, 'text/markdown')
  ElMessage.success('故事大纲已导出')
}

// === Bundle export (JSON, importable) ===

function exportBundle() {
  const novel = novelStore.currentNovel!
  const bundle = {
    version: 1,
    exportedAt: Date.now(),
    novel: {
      title: novel.title,
      type: novel.type,
      description: novel.description,
    },
    chapters: chapterStore.sortedChapters.map(ch => ({
      title: ch.title,
      order: ch.order,
      outline: ch.outline,
      content: ch.content,
    })),
    characters: materialStore.characters.map(c => ({
      name: c.name,
      gender: c.gender,
      age: c.age,
      personality: c.personality,
      appearance: c.appearance,
      background: c.background,
      relationships: c.relationships,
      notes: c.notes,
      positionX: c.positionX,
      positionY: c.positionY,
    })),
    worldSettings: materialStore.worldSettings.map(s => ({
      name: s.name,
      content: s.content,
    })),
    timelineTracks: materialStore.timelineTracks.map(t => ({
      name: t.name,
      order: t.order,
    })),
    timelineEvents: materialStore.timelineEvents.map(e => ({
      trackId: '',  // resolved after import
      name: e.name,
      description: e.description,
      order: e.order,
      endOrder: e.endOrder,
      important: e.important,
    })),
    characterRelations: materialStore.characterRelations.map(r => {
      const src = materialStore.characters.find(c => c.id === r.sourceId)
      const tgt = materialStore.characters.find(c => c.id === r.targetId)
      return {
        sourceName: src?.name || '',
        targetName: tgt?.name || '',
        label: r.label,
        type: r.type,
      }
    }),
    storyOutline: materialStore.storyOutline?.content || '',
  }
  downloadFile(JSON.stringify(bundle, null, 2), `${novel.title}-完整备份.json`, 'application/json')
  ElMessage.success('完整备份已导出')
}

// === Bundle import ===

function triggerImport() {
  importFileInput.value?.click()
}

async function handleFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // Validate bundle format
    if (!data.version || !data.novel) {
      ElMessage.error('无效的备份文件格式')
      return
    }

    const info = [
      `小说：${data.novel.title || '未命名'}`,
      `章节：${(data.chapters || []).length} 个`,
      `人物：${(data.characters || []).length} 个`,
      `人物关系：${(data.characterRelations || []).length} 条`,
      `世界观：${(data.worldSettings || []).length} 条`,
      `时间线：${(data.timelineTracks || []).length} 条`,
      `时间线事件：${(data.timelineEvents || []).length} 个`,
      data.storyOutline ? '故事大纲：有' : '故事大纲：无',
    ].join('\n')

    await ElMessageBox.confirm(
      `即将导入以下内容为新小说：\n\n${info}\n\n确认导入？`,
      '导入确认',
      { confirmButtonText: '导入', cancelButtonText: '取消', type: 'info' },
    )

    await doImport(data)
  } catch (err: unknown) {
    if ((err as Error).name !== 'CanceledError') {
      ElMessage.error(`导入失败：${(err as Error).message}`)
    }
  } finally {
    input.value = ''
  }
}

async function doImport(data: {
  novel: Record<string, string>
  chapters?: Array<Record<string, unknown>>
  characters?: Array<Record<string, unknown>>
  characterRelations?: Array<Record<string, unknown>>
  worldSettings?: Array<Record<string, unknown>>
  timelineTracks?: Array<Record<string, unknown>>
  timelineEvents?: Array<Record<string, unknown>>
  storyOutline?: string
}) {
  const now = timestamp()
  const novelId = generateId()

  // Create novel
  const novel = {
    id: novelId,
    title: data.novel.title || '导入的小说',
    type: data.novel.type || '',
    description: data.novel.description || '',
    createdAt: now,
    updatedAt: now,
  }
  await dbPut('novels', novel)

  // Import chapters
  for (const ch of data.chapters || []) {
    await dbPut('chapters', {
      id: generateId(),
      novelId,
      title: ch.title || '',
      order: ch.order || 0,
      content: ch.content || '',
      outline: ch.outline || '',
      createdAt: now,
      updatedAt: now,
    })
  }

  // Import characters (build name→id map for relation resolution)
  const charNameMap: Record<string, string> = {}
  for (const c of data.characters || []) {
    const id = generateId()
    const name = (c.name as string) || ''
    charNameMap[name] = id
    await dbPut('characters', {
      id,
      novelId,
      name: name,
      gender: c.gender || '',
      age: c.age || '',
      personality: c.personality || '',
      appearance: c.appearance || '',
      background: c.background || '',
      relationships: c.relationships || '',
      notes: c.notes || '',
      positionX: c.positionX as number | undefined,
      positionY: c.positionY as number | undefined,
    })
  }

  // Import character relations
  for (const r of data.characterRelations || []) {
    const sourceName = r.sourceName as string
    const targetName = r.targetName as string
    const sourceId = charNameMap[sourceName]
    const targetId = charNameMap[targetName]
    if (!sourceId || !targetId) continue  // skip if character not found
    await dbPut('characterRelations', {
      id: generateId(),
      novelId,
      sourceId,
      targetId,
      label: r.label || '',
      type: r.type || 'directed',
    })
  }

  // Import world settings
  for (const s of data.worldSettings || []) {
    await dbPut('worldSettings', {
      id: generateId(),
      novelId,
      name: s.name || '',
      content: s.content || '',
    })
  }

  // Import timeline tracks
  const trackIdMap: Record<string, string> = {}
  for (const t of data.timelineTracks || []) {
    const newId = generateId()
    trackIdMap[t.name as string] = newId
    await dbPut('timelineTracks', {
      id: newId,
      novelId,
      name: t.name || '',
      order: t.order || 0,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Import timeline events
  for (const e of data.timelineEvents || []) {
    await dbPut('timelineEvents', {
      id: generateId(),
      novelId,
      trackId: e.trackId as string || '',
      name: e.name || '',
      description: e.description || '',
      order: e.order || 0,
      endOrder: e.endOrder as number | undefined,
      important: e.important as boolean | undefined,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Import story outline
  if (data.storyOutline) {
    await dbPut('outlines', {
      novelId,
      content: data.storyOutline,
    })
  }

  ElMessage.success(`小说《${novel.title}》导入成功！${novelId === novelStore.currentNovel?.id ? '' : '请返回首页查看。'}`)
  dialogVisible.value = false
  emit('imported')
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="导出 / 导入"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="export-section">
      <h4 class="section-title">
        <el-icon><Download /></el-icon> 导出为可读文档（Markdown）
      </h4>
      <p class="section-desc">将素材导出为 .md 文件，方便阅读和分享。</p>
      <div class="btn-group">
        <el-button size="small" @click="exportCharacters">人物设定</el-button>
        <el-button size="small" @click="exportWorldSettings">世界观设定</el-button>
        <el-button size="small" @click="exportTimeline">时间线</el-button>
        <el-button size="small" @click="exportChapters">章节正文</el-button>
        <el-button size="small" @click="exportStoryOutline">故事大纲</el-button>
      </div>
    </div>

    <el-divider />

    <div class="export-section">
      <h4 class="section-title">
        <el-icon><Download /></el-icon> 导出完整备份（JSON）
      </h4>
      <p class="section-desc">包含小说全部设定和内容，可用于重新导入。</p>
      <el-button type="primary" @click="exportBundle">导出完整备份</el-button>
    </div>

    <el-divider />

    <div class="export-section">
      <h4 class="section-title">
        <el-icon><Upload /></el-icon> 导入备份
      </h4>
      <p class="section-desc">选择一个之前导出的完整备份（.json）文件，将导入为一篇新小说。</p>
      <el-button type="success" @click="triggerImport">选择文件导入</el-button>
    </div>

    <input
      ref="importFileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileSelected"
    />
  </el-dialog>
</template>

<style scoped>
.export-section {
  margin-bottom: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
