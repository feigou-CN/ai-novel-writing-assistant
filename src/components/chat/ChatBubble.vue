<script setup lang="ts">
import type { ChatMessage } from '@/types'
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue'

defineProps<{
  message: ChatMessage
}>()

function getRoleLabel(role: string): string {
  switch (role) {
    case 'user': return '你'
    case 'assistant': return 'AI'
    case 'tool': return '系统'
    default: return role
  }
}

function isUser(role: string): boolean {
  return role === 'user'
}
</script>

<template>
  <div class="chat-bubble" :class="{ 'is-user': isUser(message.role), 'is-tool': message.role === 'tool' }">
    <div class="bubble-avatar">
      <el-avatar :size="32" :icon="isUser(message.role) ? 'User' : 'MagicStick'" :style="{
        background: isUser(message.role) ? '#409eff' : message.role === 'tool' ? '#909399' : '#19c37d'
      }" />
    </div>
    <div class="bubble-content">
      <div class="bubble-name">{{ getRoleLabel(message.role) }}</div>
      <div class="bubble-text" v-if="message.content">
        <MarkdownRenderer :content="message.content" />
      </div>
      <div class="bubble-tool-calls" v-if="message.toolCalls && message.toolCalls.length > 0">
        <div class="tool-call-chip" v-for="tc in message.toolCalls" :key="tc.id">
          <el-tag size="small" type="warning" effect="light">
            调用工具: {{ tc.function.name }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-bubble {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  max-width: 100%;
}

.chat-bubble.is-user {
  flex-direction: row-reverse;
}

.bubble-avatar {
  flex-shrink: 0;
}

.bubble-content {
  max-width: 85%;
}

.is-user .bubble-content {
  text-align: right;
}

.bubble-name {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.is-user .bubble-name {
  text-align: right;
}

.bubble-text {
  background: var(--chat-ai-bg);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  display: inline-block;
  text-align: left;
  max-width: 100%;
}

.is-user .bubble-text {
  background: #409eff;
  color: #fff;
}

.is-user .bubble-text :deep(code) {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.is-tool .bubble-text {
  background: var(--chat-tool-bg);
  color: var(--chat-tool-text);
  font-size: 12px;
}

.bubble-tool-calls {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tool-call-chip {
  display: inline-block;
}
</style>
