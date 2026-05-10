<script setup lang="ts">
import { ref } from 'vue'
import type { Question, QuestionAnswer } from '@/types'

const props = defineProps<{
  questions: Question[]
  title: string
}>()

const emit = defineEmits<{
  submit: [answers: QuestionAnswer[]]
  skip: []
}>()

const textInputs = ref<Record<string, string>>({})
const boolAnswers = ref<Record<string, boolean>>({})
const multiSelectValues = ref<Record<string, string[]>>({})

// Initialize answers based on question types
for (const q of props.questions) {
  if (q.multiSelect) {
    multiSelectValues.value[q.id] = []
  } else if (q.type === 'confirm') {
    boolAnswers.value[q.id] = false
  } else if (q.type === 'select' && q.options && q.options.length > 0) {
    textInputs.value[q.id] = q.options[0] || ''
  } else {
    textInputs.value[q.id] = ''
  }
}

function getAnswer(q: Question): string | boolean {
  if (q.multiSelect) {
    const selected = multiSelectValues.value[q.id] || []
    return selected.join('、')
  }
  if (q.type === 'confirm') return boolAnswers.value[q.id] ?? false
  return textInputs.value[q.id] || ''
}

function handleSubmit() {
  const result: QuestionAnswer[] = props.questions.map(q => ({
    id: q.id,
    question: q.question,
    answer: getAnswer(q),
  }))
  emit('submit', result)
}

function allAnswered(): boolean {
  return props.questions.every(q => {
    if (q.multiSelect) return true // Multi-select can be empty
    if (q.type === 'text') return (textInputs.value[q.id] || '').trim().length > 0
    return true
  })
}
</script>

<template>
  <div class="question-cards">
    <div class="question-header">
      <el-icon size="20" color="#e6a23c"><Warning /></el-icon>
      <span>{{ title }}</span>
    </div>

    <div class="question-list">
      <div v-for="(q, idx) in questions" :key="q.id" class="question-card">
        <div class="q-number">{{ idx + 1 }}</div>
        <div class="q-body">
          <div class="q-text">{{ q.question }}</div>

          <!-- Text input -->
          <el-input
            v-if="q.type === 'text'"
            v-model="textInputs[q.id]"
            :placeholder="'请输入...'"
            class="q-input"
          />

          <!-- Select options (single) -->
          <el-radio-group
            v-else-if="q.type === 'select' && !q.multiSelect"
            :model-value="textInputs[q.id] || ''"
            @update:model-value="(v: any) => textInputs[q.id] = v"
            class="q-select"
          >
            <el-radio v-for="opt in q.options" :key="opt" :value="opt">
              {{ opt }}
            </el-radio>
          </el-radio-group>

          <!-- Select options (multi) -->
          <el-checkbox-group
            v-else-if="q.type === 'select' && q.multiSelect"
            :model-value="multiSelectValues[q.id] || []"
            @update:model-value="(v: any) => multiSelectValues[q.id] = v"
            class="q-select"
          >
            <el-checkbox v-for="opt in q.options" :key="opt" :value="opt">
              {{ opt }}
            </el-checkbox>
          </el-checkbox-group>

          <!-- Confirm toggle -->
          <el-switch
            v-else-if="q.type === 'confirm'"
            :model-value="boolAnswers[q.id] ?? false"
            @update:model-value="(v: any) => boolAnswers[q.id] = v"
            active-text="是"
            inactive-text="否"
            class="q-confirm"
          />
        </div>
      </div>
    </div>

    <div class="question-actions">
      <el-button @click="emit('skip')">跳过，AI直接写</el-button>
      <el-button type="primary" @click="handleSubmit" :disabled="!allAnswered()">
        提交回答
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.question-cards {
  background: var(--bg-question);
  border: 1px solid #f5d79e;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e6a23c;
  margin-bottom: 12px;
}

.question-card {
  display: flex;
  gap: 10px;
  background: var(--bg-card-inner);
  border-radius: 8px;
  padding: 12px;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}


.q-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e6a23c;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.q-body {
  flex: 1;
}

.q-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.q-input {
  margin-top: 4px;
}

.q-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.q-confirm {
  margin-top: 4px;
}

.question-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
