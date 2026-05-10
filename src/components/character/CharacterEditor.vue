<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useMaterialStore } from '@/stores/materialStore'
import { useNovelStore } from '@/stores/novelStore'
import type { Character } from '@/types'

const materialStore = useMaterialStore()
const novelStore = useNovelStore()

const dialogVisible = ref(false)
const editingChar = ref<Partial<Character>>({})

function openCreate() {
  editingChar.value = { name: '', gender: '', age: '', personality: '', appearance: '', background: '', relationships: '', notes: '' }
  dialogVisible.value = true
}

function openEdit(char: Character) {
  editingChar.value = { ...char }
  dialogVisible.value = true
}

async function save() {
  if (!editingChar.value.name?.trim()) return
  const novelId = novelStore.currentNovel?.id
  if (!novelId) return
  await materialStore.saveCharacter({
    ...editingChar.value as Omit<Character, 'id' | 'novelId'>,
    id: editingChar.value.id,
    novelId,
  })
  dialogVisible.value = false
  ElMessage.success('已保存')
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该人物吗？', '确认', { type: 'warning' })
    await materialStore.deleteCharacter(id)
    ElMessage.success('已删除')
  } catch { /* cancel */ }
}
</script>

<template>
  <div class="character-editor">
    <div class="editor-toolbar">
      <span class="section-title">人物设定（{{ materialStore.characters.length }}）</span>
      <el-button size="small" type="primary" :icon="Plus" @click="openCreate">
        添加人物
      </el-button>
    </div>

    <div v-if="materialStore.characters.length === 0" class="empty-hint">
      还没有人物设定
    </div>

    <div class="char-grid">
      <el-card
        v-for="char in materialStore.characters"
        :key="char.id"
        shadow="hover"
        class="char-card"
        @click="openEdit(char)"
      >
        <div class="char-name">{{ char.name }}</div>
        <div class="char-meta">
          <span v-if="char.gender">{{ char.gender }}</span>
          <span v-if="char.age">· {{ char.age }}</span>
        </div>
        <div class="char-personality" v-if="char.personality">
          性格：{{ char.personality }}
        </div>
        <el-button
          text
          size="small"
          type="danger"
          class="delete-btn"
          @click.stop="remove(char.id)"
        >
          删除
        </el-button>
      </el-card>
    </div>

    <el-dialog
      :model-value="dialogVisible"
      title="人物设定"
      width="600px"
      @close="dialogVisible = false"
    >
      <el-form :model="editingChar" label-width="80px" label-position="top">
        <el-form-item label="姓名" required>
          <el-input v-model="editingChar.name" placeholder="人物姓名" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="性别">
              <el-input v-model="editingChar.gender" placeholder="男/女/其他" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年龄">
              <el-input v-model="editingChar.age" placeholder="如：25岁" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="性格特点">
          <el-input v-model="editingChar.personality" type="textarea" :rows="2" placeholder="描述性格特点" />
        </el-form-item>
        <el-form-item label="外貌描述">
          <el-input v-model="editingChar.appearance" type="textarea" :rows="2" placeholder="外貌特征" />
        </el-form-item>
        <el-form-item label="背景故事">
          <el-input v-model="editingChar.background" type="textarea" :rows="3" placeholder="背景经历" />
        </el-form-item>
        <el-form-item label="人际关系">
          <el-input v-model="editingChar.relationships" type="textarea" :rows="2" placeholder="与其他角色的关系" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editingChar.notes" type="textarea" :rows="2" placeholder="其他补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save" :disabled="!editingChar.name?.trim()">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.character-editor {
  height: 100%;
  overflow-y: auto;
}

.editor-toolbar {
  margin-bottom: 12px;
}

.char-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.char-card {
  cursor: pointer;
  position: relative;
}

.char-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.char-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.char-personality {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
}

.char-card:hover .delete-btn {
  opacity: 1;
}
</style>
