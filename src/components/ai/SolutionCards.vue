<script setup lang="ts">
import { ref } from 'vue'
import type { SolutionsData } from '@/types'

const props = defineProps<{
  data: SolutionsData
}>()

const emit = defineEmits<{
  select: [solution: { id: string; title: string; description: string } | string]
  skip: []
}>()

const customSolution = ref('')

function handleSelect(s: { id: string; title: string; description: string }) {
  emit('select', s)
}

function handleCustom() {
  if (customSolution.value.trim()) {
    emit('select', customSolution.value)
  }
}
</script>

<template>
  <div class="solution-cards">
    <div class="solution-header">
      <el-icon size="20" color="#e6a23c"><Warning /></el-icon>
      <span>发现问题</span>
    </div>

    <div class="problem-description">
      {{ data.problem }}
    </div>

    <div class="solution-list">
      <div
        v-for="s in data.solutions"
        :key="s.id"
        class="solution-card"
      >
        <div class="solution-title">{{ s.title }}</div>
        <div class="solution-desc">{{ s.description }}</div>
        <el-button size="small" type="primary" @click="handleSelect(s)" class="solution-btn">
          选择此方案
        </el-button>
      </div>
    </div>

    <div class="custom-solution">
      <div class="custom-label">自定义方案</div>
      <el-input
        v-model="customSolution"
        type="textarea"
        :rows="2"
        placeholder="输入你的解决方案..."
      />
      <el-button
        size="small"
        type="primary"
        @click="handleCustom"
        :disabled="!customSolution.trim()"
        style="margin-top: 8px"
      >
        提交自定义方案
      </el-button>
    </div>

    <div class="solution-actions">
      <el-button text @click="emit('skip')">先跳过</el-button>
    </div>
  </div>
</template>

<style scoped>
.solution-cards {
  background: var(--bg-solution);
  border: 1px solid #fbc4c4;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
}

.solution-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #f56c6c;
  margin-bottom: 8px;
}

.problem-description {
  background: var(--bg-card-inner);
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.solution-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.solution-card {
  background: var(--bg-card-inner);
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid var(--primary);
}

.solution-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.solution-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.solution-btn {
  float: right;
}

.custom-solution {
  background: var(--bg-card-inner);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.custom-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.solution-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
