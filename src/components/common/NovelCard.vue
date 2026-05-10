<script setup lang="ts">
import type { Novel } from '@/types'

const props = defineProps<{
  novel: Novel
}>()

const emit = defineEmits<{
  click: []
  edit: []
  delete: []
}>()
</script>

<template>
  <div class="novel-card" @click="emit('click')">
    <div class="novel-card-header">
      <h3 class="novel-title">{{ novel.title }}</h3>
      <el-tag size="small" type="info" effect="plain">{{ novel.type || '未分类' }}</el-tag>
    </div>
    <p class="novel-desc">{{ novel.description || '暂无简介' }}</p>
    <div class="novel-card-footer">
      <span class="novel-time">{{ new Date(novel.updatedAt).toLocaleDateString('zh-CN') }}</span>
      <div class="novel-actions">
        <el-button text size="small" @click.stop="emit('edit')">编辑</el-button>
        <el-button text size="small" type="danger" @click.stop="emit('delete')">删除</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.novel-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.novel-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.novel-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.novel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.novel-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
  min-height: 2.4em;
}

.novel-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.novel-time {
  font-size: 12px;
  color: var(--text-placeholder);
}

.novel-actions {
  display: flex;
  gap: 4px;
}
</style>
