<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useMaterialStore } from '@/stores/materialStore'
import { useNovelStore } from '@/stores/novelStore'

const materialStore = useMaterialStore()
const novelStore = useNovelStore()

const content = ref('')
const hasChanges = ref(false)

watch(() => materialStore.storyOutline, (outline) => {
  content.value = outline?.content || ''
}, { immediate: true })

watch(content, () => {
  hasChanges.value = true
})

async function save() {
  if (!novelStore.currentNovel) return
  await materialStore.saveOutline(novelStore.currentNovel.id, content.value)
  hasChanges.value = false
  ElMessage.success('大纲已保存')
}

const currentNovelId = ref(novelStore.currentNovel?.id)
watch(() => novelStore.currentNovel?.id, (id) => {
  currentNovelId.value = id
  if (id) {
    materialStore.fetchOutline(id)
  }
}, { immediate: true })
</script>

<template>
  <div class="outline-editor">
    <div class="editor-toolbar">
      <span class="section-title">故事大纲</span>
      <el-button
        size="small"
        type="primary"
        @click="save"
        :disabled="!hasChanges"
      >
        保存
      </el-button>
    </div>

    <p class="outline-hint">
      编写整个故事的完整大纲，包括主线剧情、重要转折点、结局方向等。
    </p>

    <el-input
      v-model="content"
      type="textarea"
      :rows="25"
      placeholder="在这里编写故事大纲..."
      class="outline-textarea"
    />
  </div>
</template>

<style scoped>
.outline-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  margin-bottom: 8px;
}

.outline-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.outline-textarea {
  flex: 1;
}

.outline-textarea :deep(textarea) {
  font-family: inherit;
  line-height: 1.8;
}
</style>
