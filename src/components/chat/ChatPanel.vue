<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { ChatMessage, QuestionAnswer, ChatStatus } from '@/types'
import { useChatStore } from '@/stores/chatStore'
import { useNovelStore } from '@/stores/novelStore'
import { useAppStore } from '@/stores/appStore'
import { useChatSend } from '@/composables/useChatSend'
import ChatBubble from './ChatBubble.vue'
import ChatInput from './ChatInput.vue'
import AttachmentBar from './AttachmentBar.vue'
import QuestionCards from '@/components/ai/QuestionCards.vue'
import SolutionCards from '@/components/ai/SolutionCards.vue'
import OperationConfirmCards from '@/components/ai/OperationConfirmCards.vue'
import WritingSettingsPopover from '@/components/ai/WritingSettingsPopover.vue'

const chatStore = useChatStore()
const novelStore = useNovelStore()
const appStore = useAppStore()

const {
  sendUserMessage,
  submitQuestionAnswers,
  selectSolution,
  skipWaiting,
  confirmPendingOperations,
  rejectPendingOperations,
} = useChatSend()

function isActive(status: ChatStatus): boolean {
  return status !== 'idle'
}

const messagesContainer = ref<HTMLElement | null>(null)

watch(
  () => [chatStore.displayMessages.length, chatStore.currentStreamText],
  () => scrollToBottom(),
)

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      const el = messagesContainer.value
      const threshold = 100
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  })
}

function handleSend(userText: string) {
  sendUserMessage(userText)
}

function handleQuestionSubmit(answers: QuestionAnswer[]) {
  submitQuestionAnswers(answers)
}

function handleSolutionSelect(solution: { id: string; title: string; description: string } | string) {
  selectSolution(solution)
}

function handleSkip() {
  skipWaiting()
}

function handleAbort() {
  chatStore.abort()
}

function handleClear() {
  if (!novelStore.currentNovel) return
  chatStore.clearMessages(novelStore.currentNovel.id)
}

function handleInitMemory() {
  sendUserMessage(
    '【初始化小说记忆】请按以下步骤操作：\n\n'
    + '1. 调用各项查询工具（get_characters、get_world_settings、get_timeline、get_story_outline、get_chapter_descriptions），阅读当前小说的全部素材。\n'
    + '2. 如有章节内容，调用 get_chapters_range 或 get_chapter_content 了解已写内容。\n'
    + '3. 对整部小说形成完整理解后，调用 update_novel_memory 工具保存一份结构化的完整小说记忆摘要。\n'
    + '4. 摘要应涵盖以下内容：\n'
    + '   - 基本设定概览（类型、世界观、主要人物）\n'
    + '   - 剧情进展（当前写到哪了、已覆盖的情节段落）\n'
    + '   - 写作风格（叙事视角、文风特点）\n'
    + '   - 最新发展（最近几章的内容概要）\n'
    + '   - 待解决问题（伏笔、未闭合的剧情线）\n\n'
    + '摘要会持久保存，即便清空聊天记录也不会丢失，后续对话中AI会自动加载以理解小说全貌。',
  )
}

function handleConfirmOperations(allowWithoutAsking: boolean) {
  confirmPendingOperations(allowWithoutAsking)
}

function handleRejectOperations() {
  rejectPendingOperations()
}
</script>

<template>
  <div class="chat-panel">
    <div class="chat-header">
      <div class="chat-header-left">
        <span class="chat-title">AI 写作助手</span>
        <el-select
          v-model="appStore.apiSettings.model"
          size="small"
          filterable
          allow-create
          placeholder="模型"
          style="width: 160px"
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
        <el-tag
          v-if="isActive(chatStore.status)"
          size="small"
          type="warning"
          effect="plain"
        >
          {{ chatStore.status }}
        </el-tag>
      </div>

      <div class="chat-header-actions">
        <el-button text size="small" :disabled="isActive(chatStore.status)" @click="handleInitMemory">
          刷新记忆
        </el-button>
        <el-button text size="small" :disabled="chatStore.messages.length === 0" @click="handleClear">
          清空对话
        </el-button>
        <WritingSettingsPopover />
      </div>
    </div>

    <div ref="messagesContainer" class="messages-container">
      <div v-if="chatStore.messages.length === 0 && chatStore.status === 'idle'" class="messages-empty">
        <el-empty description="输入你的故事需求，AI 会先规划，再补设定，再拆章节。" :image-size="80" />
      </div>

      <template v-for="msg in chatStore.displayMessages" :key="msg.id">
        <ChatBubble
          v-if="msg.role !== 'tool' || (msg.toolName && !msg.toolName.startsWith('get_') && !msg.content?.includes('_type'))"
          :message="msg"
        />

        <QuestionCards
          v-else-if="msg.content?.includes('ask_questions') && chatStore.pendingQuestions"
          :questions="chatStore.pendingQuestions"
          :title="chatStore.pendingQuestionsTitle"
          @submit="handleQuestionSubmit"
          @skip="handleSkip"
        />

        <SolutionCards
          v-else-if="msg.content?.includes('suggest_solutions') && chatStore.pendingSolutions"
          :data="chatStore.pendingSolutions"
          @select="handleSolutionSelect"
          @skip="handleSkip"
        />
      </template>

      <el-alert
        v-if="chatStore.error"
        :title="chatStore.error"
        type="error"
        show-icon
        closable
        class="error-alert"
        @close="chatStore.error = null"
      />

      <div v-if="chatStore.status === 'streaming' || chatStore.status === 'executing_tools'" class="abort-container">
        <el-button size="small" round @click="handleAbort">
          停止生成
        </el-button>
      </div>
    </div>

    <OperationConfirmCards
      v-if="chatStore.status === 'waiting_confirmation' && chatStore.pendingConfirmTools"
      :tools="chatStore.pendingConfirmTools"
      @confirm="handleConfirmOperations"
      @cancel="handleRejectOperations"
    />

    <AttachmentBar />

    <ChatInput
      :disabled="isActive(chatStore.status)"
      @send="handleSend"
    />
  </div>
</template>

<style scoped>
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-left: 1px solid var(--border-color);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-header-actions {
  display: flex;
  gap: 4px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.messages-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.error-alert {
  margin: 8px 16px;
}

.abort-container {
  display: flex;
  justify-content: center;
  padding: 12px;
}
</style>
