<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useChapterStore } from '@/stores/chapterStore'
import { useMaterialStore } from '@/stores/materialStore'
import type { AttachmentSelections } from '@/types'

const appStore = useAppStore()
const chapterStore = useChapterStore()
const materialStore = useMaterialStore()

const emit = defineEmits<{
  change: []
}>()

const attachments = appStore.defaultAttachments

const SELECTABLE_CATEGORIES = new Set(['characters', 'worldSettings', 'timeline'])

const options = [
  { key: 'characters', label: '人物设定' },
  { key: 'worldSettings', label: '世界观设定' },
  { key: 'storyOutline', label: '故事大纲' },
  { key: 'chapterOutline', label: '本章大纲' },
  { key: 'timeline', label: '时间线' },
  { key: 'contextChapters', label: '前文概要' },
  { key: 'chapterEndings', label: '前文结尾参考' },
] as const

function getItemsForCategory(key: string): Array<{ id: string; name: string }> {
  switch (key) {
    case 'characters':
      return materialStore.characters.map(c => ({ id: c.id, name: c.name }))
    case 'worldSettings':
      return materialStore.worldSettings.map(s => ({ id: s.id, name: s.name }))
    case 'timeline':
      return materialStore.timelineTracks.map(t => ({ id: t.id, name: t.name }))
    default:
      return []
  }
}

function getSelectedCount(key: string): number {
  if (!SELECTABLE_CATEGORIES.has(key)) return 0
  const sel = (appStore.attachmentSelections as Record<string, string[]>)[key]
  if (!sel || sel.length === 0) return getItemsForCategory(key).length
  return sel.length
}

function selectAll(key: string) {
  const items = getItemsForCategory(key)
  appStore.updateAttachmentSelections({ [key]: items.map(i => i.id) })
}

// Empty selections array = include all items (no filter).
// Popover checkboxes let users exclude specific items by unchecking them.
</script>

<template>
  <div class="attachment-bar">
    <div class="attachment-label">附带上下文：</div>
    <div class="attachment-checkboxes">
      <template v-for="opt in options" :key="opt.key">
        <!-- Selectable categories: show popover for item selection -->
        <el-popover
          v-if="SELECTABLE_CATEGORIES.has(opt.key)"
          placement="bottom"
          trigger="click"
          :disabled="!appStore.defaultAttachments[opt.key]"
          :width="280"
        >
          <template #reference>
            <el-checkbox
              v-model="appStore.defaultAttachments[opt.key]"
              size="small"
              @change="emit('change')"
            >
              {{ opt.label }}
              <span v-if="appStore.defaultAttachments[opt.key]" class="sel-count">
                ({{ getSelectedCount(opt.key) }}/{{ getItemsForCategory(opt.key).length }})
              </span>
            </el-checkbox>
          </template>
          <div class="item-select-popover">
            <div class="select-actions">
              <el-button size="small" text @click="selectAll(opt.key)">全选</el-button>
              <span class="select-hint">取消勾选以排除特定项</span>
            </div>
            <el-checkbox-group
              v-model="(appStore.attachmentSelections as Record<string, string[]>)[opt.key]"
              class="item-list"
            >
              <div v-if="getItemsForCategory(opt.key).length === 0" class="empty-hint">
                暂无数据
              </div>
              <el-checkbox
                v-for="item in getItemsForCategory(opt.key)"
                :key="item.id"
                :label="item.id"
                size="small"
                class="item-checkbox"
              >
                {{ item.name }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </el-popover>

        <!-- Non-selectable categories: simple checkbox -->
        <el-checkbox
          v-else
          v-model="appStore.defaultAttachments[opt.key]"
          size="small"
          @change="emit('change')"
        >
          {{ opt.label }}
        </el-checkbox>
      </template>
    </div>
  </div>
</template>

<style scoped>
.attachment-bar {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.attachment-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.attachment-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sel-count {
  font-size: 11px;
  color: var(--text-muted);
}

.item-select-popover {
  max-height: 300px;
  overflow-y: auto;
}

.select-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}

.select-hint {
  font-size: 11px;
  color: var(--text-placeholder);
  margin-left: auto;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-checkbox {
  margin-left: 0;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-placeholder);
  text-align: center;
  padding: 8px;
}
</style>
