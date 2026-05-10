<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useMaterialStore } from '@/stores/materialStore'
import { useNovelStore } from '@/stores/novelStore'

const materialStore = useMaterialStore()
const novelStore = useNovelStore()

const editingName = ref('')
const editingContent = ref('')
const editingId = ref<string | undefined>()
const dialogVisible = ref(false)

function openCreate() {
  editingId.value = undefined
  editingName.value = ''
  editingContent.value = ''
  dialogVisible.value = true
}

function openEdit(item: { id: string; name: string; content: string }) {
  editingId.value = item.id
  editingName.value = item.name
  editingContent.value = item.content
  dialogVisible.value = true
}

async function save() {
  if (!editingName.value.trim()) return
  const novelId = novelStore.currentNovel?.id
  if (!novelId) return
  await materialStore.saveWorldSetting({
    id: editingId.value,
    novelId,
    name: editingName.value,
    content: editingContent.value,
  })
  dialogVisible.value = false
  ElMessage.success('已保存')
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该设定吗？', '确认', { type: 'warning' })
    await materialStore.deleteWorldSetting(id)
    ElMessage.success('已删除')
  } catch { /* cancel */ }
}
</script>

<template>
  <div class="world-setting-editor">
    <div class="editor-toolbar">
      <span class="section-title">世界观设定（{{ materialStore.worldSettings.length }}）</span>
      <el-button size="small" type="primary" :icon="Plus" @click="openCreate">
        添加设定
      </el-button>
    </div>

    <div v-if="materialStore.worldSettings.length === 0" class="empty-hint">
      还没有世界观设定
    </div>

    <div class="setting-list">
      <el-card
        v-for="item in materialStore.worldSettings"
        :key="item.id"
        shadow="hover"
        class="setting-card"
        @click="openEdit(item)"
      >
        <div class="setting-header">
          <span class="setting-name">{{ item.name }}</span>
          <el-button text size="small" type="danger" @click.stop="remove(item.id)">删除</el-button>
        </div>
        <div class="setting-content">{{ item.content }}</div>
      </el-card>
    </div>

    <el-dialog
      :model-value="dialogVisible"
      title="世界观设定"
      width="560px"
      @close="dialogVisible = false"
    >
      <el-form label-width="60px" label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="editingName" placeholder="如：魔法体系、政治格局" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="editingContent"
            type="textarea"
            :rows="8"
            placeholder="详细描述这个设定..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save" :disabled="!editingName.trim()">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.world-setting-editor {
  height: 100%;
  overflow-y: auto;
}

.editor-toolbar {
  margin-bottom: 12px;
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-card {
  cursor: pointer;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.setting-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-content {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
