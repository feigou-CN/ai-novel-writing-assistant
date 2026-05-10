<script setup lang="ts">
import { watch, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useChapterStore } from '@/stores/chapterStore'

const chapterStore = useChapterStore()

const emit = defineEmits<{
  back: []
}>()

const editingOutline = ref(false)
const outlineText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const gutterRef = ref<HTMLElement | null>(null)

watch(() => chapterStore.currentChapter, (ch) => {
  if (ch) {
    outlineText.value = ch.outline || ''
  }
}, { immediate: true })

const lineCount = computed(() => {
  const content = chapterStore.currentChapter?.content || ''
  return Math.max(content.split('\n').length, 1)
})

function syncScroll() {
  if (textareaRef.value && gutterRef.value) {
    gutterRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

async function saveOutline() {
  if (!chapterStore.currentChapter) return
  await chapterStore.updateChapter(chapterStore.currentChapter.id, {
    outline: outlineText.value,
  })
  editingOutline.value = false
  ElMessage.success('章节大纲已保存')
}

async function saveContent() {
  if (!chapterStore.currentChapter) return
  await chapterStore.updateChapter(chapterStore.currentChapter.id, {
    content: chapterStore.currentChapter.content,
  })
  ElMessage.success('章节内容已保存')
}
</script>

<template>
  <div class="chapter-editor" v-if="chapterStore.currentChapter">
    <div class="editor-header">
      <el-button text size="small" :icon="ArrowLeft" @click="emit('back')">
        返回
      </el-button>
      <h3>{{ chapterStore.currentChapter.title }}</h3>
    </div>

    <div class="editor-section">
      <div class="section-header">
        <span class="section-title">章节大纲</span>
        <el-button
          size="small"
          text
          @click="editingOutline = !editingOutline"
        >
          {{ editingOutline ? '取消' : '编辑' }}
        </el-button>
      </div>
      <div v-if="editingOutline">
        <el-input
          v-model="outlineText"
          type="textarea"
          :rows="4"
          placeholder="描述本章的大纲..."
        />
        <el-button size="small" type="primary" @click="saveOutline" style="margin-top: 8px">
          保存大纲
        </el-button>
      </div>
      <div v-else class="outline-display">
        {{ chapterStore.currentChapter.outline || '暂无大纲' }}
      </div>
    </div>

    <div class="editor-section editor-content">
      <div class="section-header">
        <span class="section-title">章节内容</span>
        <el-button size="small" text @click="saveContent">
          保存内容
        </el-button>
      </div>
      <div class="editor-with-lines">
        <div class="line-gutter" ref="gutterRef">
          <div v-for="i in lineCount" :key="i" class="line-num">{{ i }}</div>
        </div>
        <textarea
          ref="textareaRef"
          v-model="chapterStore.currentChapter.content"
          class="content-textarea"
          placeholder="在这里编写或粘贴章节内容..."
          @scroll="syncScroll"
        ></textarea>
      </div>
    </div>
  </div>

  <div v-else class="no-selection">
    <el-empty description="请选择或新建一个章节" />
  </div>
</template>

<style scoped>
.chapter-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.editor-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.editor-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.outline-display {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  padding: 8px 12px;
  background: var(--bg-outline);
  border-radius: 4px;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-with-lines {
  display: flex;
  flex: 1;
  border: 1px solid var(--border-base);
  border-radius: 4px;
  overflow: hidden;
}

.line-gutter {
  flex-shrink: 0;
  width: 48px;
  padding: 10px 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-dark);
  overflow: hidden;
  text-align: center;
  user-select: none;
}

.line-num {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-placeholder);
  font-family: inherit;
  min-height: 1.8em;
}

.content-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  padding: 10px 14px;
  color: var(--text-primary);
  background: var(--bg-card);
  min-height: 300px;
}

.content-textarea::placeholder {
  color: var(--text-placeholder);
}

.no-selection {
  padding: 60px 0;
}
</style>
