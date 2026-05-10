<script setup lang="ts">
import { ref } from 'vue'
import { Promotion } from '@element-plus/icons-vue'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const inputText = ref('')

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="chat-input">
    <el-input
      v-model="inputText"
      type="textarea"
      :rows="3"
      :disabled="disabled"
      placeholder="输入你的写作需求... (Enter 发送, Shift+Enter 换行)"
      @keydown="handleKeydown"
      class="input-area"
    />
    <div class="input-actions">
      <span class="input-hint">Enter 发送 · Shift+Enter 换行</span>
      <el-button
        type="primary"
        :icon="Promotion"
        :disabled="disabled || !inputText.trim()"
        @click="handleSend"
        round
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-card);
}

.input-area {
  width: 100%;
}

.input-area :deep(textarea) {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.input-hint {
  font-size: 12px;
  color: var(--text-placeholder);
}
</style>
