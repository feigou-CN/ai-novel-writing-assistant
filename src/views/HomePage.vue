<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Setting } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '@/stores/novelStore'
import { useAppStore } from '@/stores/appStore'
import { API_PRESETS } from '@/config/api'
import NovelCard from '@/components/common/NovelCard.vue'
import NovelDialog from '@/components/common/NovelDialog.vue'
import DarkModeToggle from '@/components/common/DarkModeToggle.vue'
import type { Novel } from '@/types'

const router = useRouter()
const novelStore = useNovelStore()
const appStore = useAppStore()

const dialogVisible = ref(false)
const editingNovel = ref<Novel | null>(null)

function handlePresetChange(name: string) {
  appStore.applyPreset(name)
}

onMounted(() => {
  novelStore.fetchNovels()
})

function openCreate() {
  editingNovel.value = null
  dialogVisible.value = true
}

function openEdit(novel: Novel) {
  editingNovel.value = novel
  dialogVisible.value = true
}

async function handleConfirm(data: { title: string; type: string; description: string }) {
  if (editingNovel.value) {
    await novelStore.updateNovel(editingNovel.value.id, data)
  } else {
    const novel = await novelStore.createNovel(data)
    router.push(`/novel/${novel.id}`)
  }
  dialogVisible.value = false
}

async function handleDelete(novel: Novel) {
  try {
    await ElMessageBox.confirm(`确定删除小说《${novel.title}》吗？所有章节和素材将一并删除。`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await novelStore.deleteNovel(novel.id)
    ElMessage.success('删除成功')
  } catch {
    // cancelled
  }
}

function goToNovel(novel: Novel) {
  router.push(`/novel/${novel.id}`)
}
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <h1>AI 小说写作助手</h1>
      <div class="header-actions">
        <el-popover placement="bottom-end" :width="320" trigger="click">
          <template #reference>
            <el-button size="default" :icon="Setting">
              API 设置
            </el-button>
          </template>
          <div class="api-settings-popover">
            <h4 class="settings-title">API 设置</h4>
            <el-form label-position="top" size="small">
              <el-form-item label="API 预设">
                <el-select v-model="appStore.selectedPreset" style="width: 100%" @change="handlePresetChange">
                  <el-option v-for="p in API_PRESETS" :key="p.name" :label="p.name" :value="p.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="API 地址">
                <el-input v-model="appStore.apiSettings.baseURL" placeholder="https://api.openai.com/v1" />
              </el-form-item>
              <el-form-item label="API Key">
                <el-input v-model="appStore.apiSettings.apiKey" type="password" placeholder="sk-..." show-password />
              </el-form-item>
              <el-form-item label="模型">
                <el-select
                  v-model="appStore.apiSettings.model"
                  filterable
                  allow-create
                  placeholder="选择或输入模型"
                  style="width: 100%"
                  :loading="appStore.modelsLoading"
                  @visible-change="(v: boolean) => v && appStore.fetchModels()"
                >
                  <el-option
                    v-for="m in appStore.availableModels"
                    :key="m"
                    :label="m"
                    :value="m"
                  />
                </el-select>
              </el-form-item>
            </el-form>
            <div style="text-align: right; margin-top: 8px;">
              <el-tag v-if="!appStore.apiSettings.apiKey" size="small" type="info">请配置 API Key</el-tag>
              <el-tag v-else size="small" type="success">API 已配置</el-tag>
            </div>
          </div>
        </el-popover>
        <el-button type="primary" @click="openCreate" :icon="Plus">新建小说</el-button>
      </div>
    </header>

    <div v-if="novelStore.loading" class="loading">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="novelStore.novels.length === 0" class="empty">
      <el-empty description="还没有小说，点击上方按钮新建" />
    </div>

    <div v-else class="novel-grid">
      <NovelCard
        v-for="novel in novelStore.novels"
        :key="novel.id"
        :novel="novel"
        @click="goToNovel(novel)"
        @edit="openEdit(novel)"
        @delete="handleDelete(novel)"
      />
    </div>

    <NovelDialog
      :visible="dialogVisible"
      :title="editingNovel ? '编辑小说' : '新建小说'"
      :initial-data="editingNovel ? {
        title: editingNovel.title,
        type: editingNovel.type,
        description: editingNovel.description,
      } : undefined"
      @close="dialogVisible = false"
      @confirm="handleConfirm"
    />
    <DarkModeToggle />
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.home-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-settings-popover {
  padding: 4px 0;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.loading {
  padding: 48px;
}

.empty {
  padding: 80px 0;
}

.novel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
</style>
