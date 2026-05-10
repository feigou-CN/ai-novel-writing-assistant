<script setup lang="ts">
import { onMounted, ref, watch, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Edit, Delete, Download } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useNovelStore } from '@/stores/novelStore'
import { useChapterStore } from '@/stores/chapterStore'
import { useMaterialStore } from '@/stores/materialStore'
import { useChatStore } from '@/stores/chatStore'
import { useAppStore } from '@/stores/appStore'
import ChapterList from '@/components/chapter/ChapterList.vue'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import CharacterGraph from '@/components/character/CharacterGraph.vue'
import WorldSettingEditor from '@/components/world/WorldSettingEditor.vue'
import StoryOutlineEditor from '@/components/world/StoryOutlineEditor.vue'
import TimelineEditor from '@/components/world/TimelineEditor.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import ExportImportDialog from '@/components/dialogs/ExportImportDialog.vue'

const route = useRoute()
const router = useRouter()
const novelStore = useNovelStore()
const chapterStore = useChapterStore()
const materialStore = useMaterialStore()
const chatStore = useChatStore()
const appStore = useAppStore()

const activeTab = ref('chapters')
const loading = ref(true)
const isDragging = ref(false)
const MIN_PANEL_WIDTH = 320
const MAX_PANEL_WIDTH = 800

// Chapter list/detail navigation
const chapterView = ref<'list' | 'detail'>('list')
const createDialogVisible = ref(false)
const newChapterTitle = ref('')
const newChapterOutline = ref('')

// Novel edit dialog
const editDialogVisible = ref(false)
const editTitle = ref('')
const editType = ref('')
const editDescription = ref('')
const exportDialogVisible = ref(false)

function handleImportDone() {
  goBack()
}

function openEditDialog() {
  const novel = novelStore.currentNovel
  if (!novel) return
  editTitle.value = novel.title
  editType.value = novel.type
  editDescription.value = novel.description
  editDialogVisible.value = true
}

async function handleEditNovel() {
  const novel = novelStore.currentNovel
  if (!novel) return
  const title = editTitle.value.trim()
  if (!title) { ElMessage.warning('请输入小说名称'); return }
  await novelStore.updateNovel(novel.id, { title, type: editType.value.trim(), description: editDescription.value.trim() })
  editDialogVisible.value = false
  ElMessage.success('已更新小说信息')
}

async function handleDeleteNovel() {
  const novel = novelStore.currentNovel
  if (!novel) return
  try {
    await ElMessageBox.confirm(`确定要删除《${novel.title}》吗？所有章节、人物设定、世界观等数据将一并删除。`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await novelStore.deleteNovel(novel.id)
    ElMessage.success('已删除')
    router.push('/')
  } catch {
    // cancelled
  }
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const bodyEl = document.querySelector('.detail-body')
  if (!bodyEl) return
  const rect = bodyEl.getBoundingClientRect()
  let newWidth = rect.right - e.clientX
  newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth))
  appStore.rightPanelWidth = newWidth
}

function onMouseUp() {
  isDragging.value = false
}

watch(isDragging, (dragging) => {
  if (dragging) {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  } else {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})

onMounted(async () => {
  const novelId = route.params.id as string
  if (!novelId) {
    router.push('/')
    return
  }

  const novel = await novelStore.getNovelById(novelId)
  if (!novel) {
    ElMessage.error('小说不存在')
    router.push('/')
    return
  }

  // Load all data
  await Promise.all([
    chapterStore.fetchChapters(novelId),
    materialStore.loadAll(novelId),
    chatStore.loadMessages(novelId),
  ])

  // Auto-select first chapter if none selected
  if (!chapterStore.currentChapter && chapterStore.chapters.length > 0) {
    const first = chapterStore.sortedChapters[0]
    if (first) chapterStore.setCurrentChapter(first)
  }

  loading.value = false
})

// Chapter list/detail navigation
function handleChapterSelect(chapterId: string) {
  chapterStore.getChapterById(chapterId).then(ch => {
    if (ch) {
      chapterView.value = 'detail'
    }
  })
}

function backToChapterList() {
  chapterView.value = 'list'
}

function openCreateDialog() {
  newChapterTitle.value = ''
  newChapterOutline.value = ''
  createDialogVisible.value = true
}

async function handleCreateChapter() {
  const novelId = novelStore.currentNovel?.id
  if (!novelId) return
  const title = newChapterTitle.value.trim()
  if (!title) {
    ElMessage.warning('请输入章节名称')
    return
  }
  const chapter = await chapterStore.createChapter(novelId, title, newChapterOutline.value.trim())
  createDialogVisible.value = false
  chapterView.value = 'detail'
}

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="novel-detail" v-loading="loading">
    <!-- Top header -->
    <header class="detail-header">
      <div class="header-left">
        <el-button text :icon="ArrowLeft" @click="goBack" size="small">
          返回
        </el-button>
        <h2 class="novel-title">{{ novelStore.currentNovel?.title || '加载中...' }}</h2>
        <el-tag v-if="novelStore.currentNovel?.type" size="small" effect="plain">
          {{ novelStore.currentNovel.type }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-button text size="small" :icon="Download" @click="exportDialogVisible = true">导出/导入</el-button>
        <el-button text size="small" :icon="Edit" @click="openEditDialog">编辑</el-button>
        <el-button text size="small" :icon="Delete" type="danger" @click="handleDeleteNovel">删除</el-button>
      </div>
    </header>

    <!-- Main content: left panel + right chat -->
    <div class="detail-body" :class="{ 'is-dragging': isDragging }">
      <!-- Left Panel -->
      <div class="left-panel">
        <el-tabs v-model="activeTab" class="left-tabs" tab-position="top" type="border-card">
          <el-tab-pane label="章节" name="chapters">
            <div class="tab-content">
              <!-- Chapter list view -->
              <template v-if="chapterView === 'list'">
                <div class="chapter-list-header">
                  <span class="section-title">章节列表</span>
                  <el-button size="small" type="primary" :icon="Plus" @click="openCreateDialog">
                    新建章节
                  </el-button>
                </div>
                <ChapterList
                  :novel-id="novelStore.currentNovel?.id || ''"
                  @select="handleChapterSelect"
                />
              </template>

              <!-- Chapter detail view -->
              <ChapterEditor
                v-else
                @back="backToChapterList"
              />
            </div>
          </el-tab-pane>

          <el-tab-pane label="人物" name="characters">
            <div class="tab-content">
              <CharacterGraph />
            </div>
          </el-tab-pane>

          <el-tab-pane label="世界观" name="world">
            <div class="tab-content">
              <WorldSettingEditor />
            </div>
          </el-tab-pane>

          <el-tab-pane label="时间线" name="timeline">
            <div class="tab-content">
              <TimelineEditor />
            </div>
          </el-tab-pane>

          <el-tab-pane label="故事大纲" name="outline">
            <div class="tab-content">
              <StoryOutlineEditor />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- Resize Handle -->
      <div
        class="resize-handle"
        @mousedown="onMouseDown"
      />

      <!-- Right Chat Panel -->
      <div
        class="right-panel"
        :style="{ flexBasis: appStore.rightPanelWidth + 'px' }"
      >
        <ChatPanel />
      </div>
    </div>
  </div>

  <!-- Create chapter dialog -->
  <el-dialog
    v-model="createDialogVisible"
    title="新建章节"
    width="420px"
    :close-on-click-modal="false"
  >
    <el-form label-position="top">
      <el-form-item label="章节名称" required>
        <el-input
          v-model="newChapterTitle"
          placeholder="请输入章节名称"
          maxlength="100"
        />
      </el-form-item>
      <el-form-item label="章节简述（可选）">
        <el-input
          v-model="newChapterOutline"
          type="textarea"
          :rows="3"
          placeholder="简要描述本章的内容方向，方便 AI 理解上下文"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleCreateChapter">创建</el-button>
    </template>
  </el-dialog>

  <ExportImportDialog
    v-model:visible="exportDialogVisible"
    @imported="handleImportDone"
  />

  <!-- Edit novel dialog -->
  <el-dialog
    v-model="editDialogVisible"
    title="编辑小说信息"
    width="420px"
    :close-on-click-modal="false"
  >
    <el-form label-position="top">
      <el-form-item label="小说名称" required>
        <el-input v-model="editTitle" placeholder="请输入小说名称" maxlength="100" />
      </el-form-item>
      <el-form-item label="小说类型">
        <el-input v-model="editType" placeholder="如：玄幻、言情、悬疑..." />
      </el-form-item>
      <el-form-item label="小说简介">
        <el-input v-model="editDescription" type="textarea" :rows="4" placeholder="简要介绍故事背景..." />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleEditNovel">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.novel-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.novel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  margin: 8px;
  margin-right: 0;
  border-radius: 8px;
  overflow: hidden;
}

.left-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.left-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.left-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  padding: 8px 12px;
}

.chapter-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.resize-handle {
  width: 6px;
  cursor: col-resize;
  flex-shrink: 0;
  background: transparent;
  position: relative;
  z-index: 5;
  margin: 8px 0;
  border-radius: 3px;
  transition: background 0.15s;
}

.resize-handle:hover,
.is-dragging .resize-handle {
  background: var(--resize-handle-hover);
}

.is-dragging {
  user-select: none;
  cursor: col-resize;
}

.right-panel {
  flex-shrink: 0;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  margin: 8px;
  margin-left: 0;
  border-radius: 8px;
  overflow: hidden;
}
</style>
