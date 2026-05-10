<script setup lang="ts">
import { ref } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import type { ToolCall } from '@/types'

const props = defineProps<{
  tools: ToolCall[]
}>()

const emit = defineEmits<{
  confirm: [allowWithoutAsking: boolean]
  cancel: []
}>()

const allowWithoutAsking = ref(false)

function describeTool(tc: ToolCall): { icon: string; label: string; detail: string } {
  const name = tc.function.name
  let args: Record<string, unknown> = {}
  try {
    args = typeof tc.function.arguments === 'string'
      ? JSON.parse(tc.function.arguments)
      : tc.function.arguments as Record<string, unknown>
  } catch { /* ignore */ }

  switch (name) {
    case 'delete_character':
      return { icon: '🗑️', label: '删除角色', detail: `ID: ${args.id || '?'}` }
    case 'delete_world_setting':
      return { icon: '🗑️', label: '删除世界观设定', detail: `ID: ${args.id || '?'}` }
    case 'delete_event':
      return { icon: '🗑️', label: '删除事件', detail: `ID: ${args.id || '?'}` }
    case 'delete_chapter':
      return { icon: '🗑️', label: '删除章节', detail: `ID: ${args.chapterId || '?'}` }
    case 'reorder_chapters': {
      const ids = Array.isArray(args.orderedChapterIds) ? args.orderedChapterIds : []
      return { icon: '🔀', label: '重新排序章节', detail: `${ids.length} 个章节` }
    }
    case 'merge_chapters':
      return { icon: '🔗', label: '合并章节', detail: `目标: ${args.targetChapterId || '?'}, 源: ${args.sourceChapterId || '?'}` }
    default:
      return { icon: '⚙️', label: name, detail: JSON.stringify(args) }
  }
}
</script>

<template>
  <div class="confirm-cards">
    <div class="confirm-header">
      <el-icon :size="18" color="#e6a23c"><WarningFilled /></el-icon>
      <span class="confirm-title">确认操作</span>
    </div>
    <p class="confirm-desc">AI 请求执行以下操作：</p>

    <div class="operation-list">
      <div
        v-for="(tc, idx) in tools"
        :key="idx"
        class="operation-item"
      >
        <span class="op-icon">{{ describeTool(tc).icon }}</span>
        <span class="op-label">{{ describeTool(tc).label }}</span>
        <span class="op-detail">{{ describeTool(tc).detail }}</span>
      </div>
    </div>

    <el-checkbox v-model="allowWithoutAsking" class="noask-checkbox">
      本次会话不再询问，直接执行
    </el-checkbox>

    <div class="confirm-actions">
      <el-button @click="emit('cancel')" size="small">取消</el-button>
      <el-button type="primary" @click="emit('confirm', allowWithoutAsking)" size="small">
        确认执行
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.confirm-cards {
  padding: 12px 16px;
  background: var(--bg-confirm);
  border: 1px solid #ffe58f;
  border-radius: 8px;
  margin: 8px 16px;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.confirm-title {
  font-size: 14px;
  font-weight: 600;
  color: #d48806;
}

.confirm-desc {
  font-size: 12px;
  color: #8c6e00;
  margin: 4px 0 10px;
}

.operation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--bg-card-inner);
  border-radius: 4px;
  border: 1px solid var(--border-operation);
}

.op-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  flex-shrink: 0;
}

.op-detail {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.op-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.noask-checkbox {
  display: flex;
  margin-bottom: 10px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
