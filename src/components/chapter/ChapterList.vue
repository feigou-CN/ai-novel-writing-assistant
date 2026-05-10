<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { useChapterStore } from '@/stores/chapterStore'

const props = defineProps<{
  novelId: string
}>()

const chapterStore = useChapterStore()

const emit = defineEmits<{
  select: [id: string]
  create: []
}>()

function addChapter() {
  if (!props.novelId) return
  emit('create')
}

function selectChapter(id: string) {
  emit('select', id)
}

async function deleteChapter(id: string) {
  const chapter = chapterStore.chapters.find(c => c.id === id)
  if (!chapter) return
  try {
    await ElMessageBox.confirm(`确定删除章节「${chapter.title}」吗？`, '确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await chapterStore.deleteChapter(id)
    ElMessage.success('已删除')
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="chapter-list">
    <div v-if="chapterStore.sortedChapters.length === 0" class="empty-hint">
      暂无章节，点击上方按钮新建
    </div>

    <div v-else class="chapter-items">
      <div
        v-for="chapter in chapterStore.sortedChapters"
        :key="chapter.id"
        class="chapter-item"
        :class="{ active: chapterStore.currentChapter?.id === chapter.id }"
        @click="selectChapter(chapter.id)"
      >
        <span class="chapter-order">{{ chapter.order }}.</span>
        <span class="chapter-name">{{ chapter.title }}</span>
        <el-button
          text
          size="small"
          type="danger"
          class="delete-btn"
          @click.stop="deleteChapter(chapter.id)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chapter-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-hint {
  padding: 24px 0;
}

.chapter-items {
  flex: 1;
  overflow-y: auto;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 4px;
  gap: 8px;
}

.chapter-item:hover {
  background: var(--bg-secondary);
}

.chapter-item.active {
  background: var(--bg-active);
  color: var(--primary);
}

.chapter-order {
  color: var(--text-muted);
  font-size: 13px;
  flex-shrink: 0;
}

.chapter-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.delete-btn {
  opacity: 0;
  flex-shrink: 0;
}

.chapter-item:hover .delete-btn {
  opacity: 1;
}
</style>
