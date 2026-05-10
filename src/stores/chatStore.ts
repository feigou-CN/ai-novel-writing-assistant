import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, ChatStatus, ToolCall, Question, SolutionsData, QuestionAnswer, APISettings } from '@/types'
import { getAllByIndex, put, del } from '@/utils/db'
import { generateId, timestamp } from '@/utils/id'
import { sendChat, executeToolCall, isInteractionTool, isWriteTool, isDestructiveTool, toOpenAIMessages } from '@/utils/ai'
import { SYSTEM_PROMPT } from '@/config/prompts'

export const useChatStore = defineStore('chat', () => {
  // === State ===
  const messages = ref<ChatMessage[]>([])
  const status = ref<ChatStatus>('idle')
  const currentStreamText = ref('')
  const error = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)
  const novelId = ref('')

  // Interaction card state
  const pendingQuestions = ref<Question[] | null>(null)
  const pendingQuestionsTitle = ref('')
  const pendingSolutions = ref<SolutionsData | null>(null)

  // Pending destructive tool confirmation
  const pendingConfirmTools = ref<ToolCall[] | null>(null)
  const allowDestructiveWithoutAsking = ref(false)

  // === Computed ===
  const displayMessages = computed(() => {
    const result: ChatMessage[] = [...messages.value]
    // If streaming, append the in-progress assistant message
    if (status.value === 'streaming' && currentStreamText.value) {
      result.push({
        id: '__streaming__',
        novelId: novelId.value,
        role: 'assistant',
        content: currentStreamText.value,
        createdAt: timestamp(),
      })
    }
    return result
  })

  // === Actions ===

  async function loadMessages(nId: string) {
    novelId.value = nId
    messages.value = await getAllByIndex<ChatMessage>('chatMessages', 'novelId', nId)
    messages.value.sort((a, b) => a.createdAt - b.createdAt)
    status.value = 'idle'
    error.value = null
  }

  async function clearMessages(nId: string) {
    const msgs = await getAllByIndex<ChatMessage>('chatMessages', 'novelId', nId)
    await Promise.all(msgs.map(m => del('chatMessages', m.id)))
    messages.value = []
  }

  function saveMessage(msg: ChatMessage) {
    messages.value.push(msg)
    // Fire and forget save to IndexedDB
    put('chatMessages', msg).catch(console.error)
  }

  function updateMessage(id: string, data: Partial<ChatMessage>) {
    const msg = messages.value.find(m => m.id === id)
    if (msg) {
      Object.assign(msg, data)
      put('chatMessages', msg).catch(console.error)
    }
  }

  // === Core: sendMessage ===
  async function sendMessage(
    userText: string,
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],   // callback to get latest messages from store
    onDataChange?: (toolNames: string[]) => void,
  ) {
    if (!userText.trim() || status.value !== 'idle') return

    error.value = null
    pendingQuestions.value = null
    pendingQuestionsTitle.value = ''
    pendingSolutions.value = null

    // Save user message
    const userMessage: ChatMessage = {
      id: generateId(),
      novelId: novelId.value,
      role: 'user',
      content: userText,
      createdAt: timestamp(),
    }
    saveMessage(userMessage)

    await doSendLoop(systemPromptExtra, apiSettings, getContextMessages, onDataChange)
  }

  // === Core send loop (recursive for tool calls) ===
  async function doSendLoop(
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],
    onDataChange?: (toolNames: string[]) => void,
  ): Promise<void> {
    status.value = 'sending'

    // Build messages array
    const systemContent = systemPromptExtra
      ? `${SYSTEM_PROMPT}\n\n${systemPromptExtra}`
      : SYSTEM_PROMPT

    const systemMsg: ChatMessage = {
      id: '__system__',
      novelId: novelId.value,
      role: 'system',
      content: systemContent,
      createdAt: 0,
    }

    const history = getContextMessages()
    const allMessages = [systemMsg, ...history]
    const openAIMsgs = toOpenAIMessages(allMessages)

    // Create abort controller
    const controller = new AbortController()
    abortController.value = controller

    status.value = 'streaming'
    currentStreamText.value = ''

    try {
      const result = await sendChat(
        openAIMsgs,
        apiSettings,
        // onText
        (text) => {
          currentStreamText.value += text
        },
        // onToolCalls
        (_toolCalls) => {
          // Tool calls collected on finish
        },
        controller.signal,
      )

      // Save assistant message
      if (result.content || (result.toolCalls && result.toolCalls.length > 0)) {
        const assistantMsg: ChatMessage = {
          id: generateId(),
          novelId: novelId.value,
          role: 'assistant',
          content: result.content || '',
          toolCalls: result.toolCalls,
          reasoningContent: result.reasoningContent,
          createdAt: timestamp(),
        }
        saveMessage(assistantMsg)
      }

      currentStreamText.value = ''

      // Handle tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        status.value = 'tool_calling'
        await handleToolCalls(result.toolCalls, systemPromptExtra, apiSettings, getContextMessages, onDataChange)
      } else {
        status.value = 'idle'
      }
    } catch (err: unknown) {
      currentStreamText.value = ''
      if ((err as Error).name === 'AbortError') {
        status.value = 'idle'
        return
      }
      error.value = (err as Error).message
      status.value = 'idle'
    }
  }

  // === Internal: execute tools and save results ===
  async function executeTools(toolCalls: ToolCall[]): Promise<string[]> {
    const executedWriteTools: string[] = []

    for (const tc of toolCalls) {
      try {
        const result = await executeToolCall(tc)

        // Handle interaction tool results
        if (isInteractionTool(tc.function.name)) {
          try {
            const parsed = JSON.parse(result.content)
            if (parsed._type === 'ask_questions') {
              pendingQuestions.value = parsed.questions || []
              pendingQuestionsTitle.value = parsed.title || '需要了解更多信息'
            } else if (parsed._type === 'suggest_solutions') {
              pendingSolutions.value = {
                problem: parsed.problem || '',
                solutions: parsed.solutions || [],
              }
            }
          } catch { /* skip parse errors */ }
        }

        const toolMsg: ChatMessage = {
          id: generateId(),
          novelId: novelId.value,
          role: 'tool',
          content: result.content,
          toolCallId: result.tool_call_id,
          toolName: tc.function.name,
          createdAt: timestamp(),
        }
        saveMessage(toolMsg)

        if (isWriteTool(tc.function.name)) {
          executedWriteTools.push(tc.function.name)
        }
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: generateId(),
          novelId: novelId.value,
          role: 'tool',
          content: JSON.stringify({ error: (err as Error).message }),
          toolCallId: tc.id,
          toolName: tc.function.name,
          createdAt: timestamp(),
        }
        saveMessage(errorMsg)
      }
    }

    return executedWriteTools
  }

  // === Handle Tool Calls ===
  async function handleToolCalls(
    toolCalls: ToolCall[],
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],
    onDataChange?: (toolNames: string[]) => void,
  ): Promise<void> {
    const interactionCalls = toolCalls.filter(tc => isInteractionTool(tc.function.name))
    const destructiveCalls = toolCalls.filter(tc => isDestructiveTool(tc.function.name))
    const regularCalls = toolCalls.filter(tc => !isInteractionTool(tc.function.name) && !isDestructiveTool(tc.function.name))

    // If there are destructive tools and user hasn't allowed them, intercept
    if (destructiveCalls.length > 0 && !allowDestructiveWithoutAsking.value) {
      pendingConfirmTools.value = destructiveCalls
      status.value = 'waiting_confirmation'
      return
    }

    const allNonInteraction = [...regularCalls, ...destructiveCalls]
    status.value = 'executing_tools'

    // Execute non-interaction tools first
    const executedWriteTools = allNonInteraction.length > 0
      ? await executeTools(allNonInteraction)
      : []

    // Then interaction tools
    if (interactionCalls.length > 0) {
      await executeTools(interactionCalls)

      if (pendingQuestions.value || pendingSolutions.value) {
        if (executedWriteTools.length > 0) {
          await onDataChange?.(executedWriteTools)
        }
        status.value = 'waiting_user'
        return
      }
    }

    if (executedWriteTools.length > 0) {
      await onDataChange?.(executedWriteTools)
    }

    await doSendLoop(systemPromptExtra, apiSettings, getContextMessages, onDataChange)
  }

  // === Confirm pending destructive tools ===
  async function confirmPendingTools(
    allowWithoutAsking: boolean,
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],
    onDataChange?: (toolNames: string[]) => void,
  ) {
    const tools = pendingConfirmTools.value
    if (!tools || tools.length === 0) return
    pendingConfirmTools.value = null
    if (allowWithoutAsking) {
      allowDestructiveWithoutAsking.value = true
    }

    status.value = 'executing_tools'
    const executedWriteTools = await executeTools(tools)

    if (executedWriteTools.length > 0) {
      await onDataChange?.(executedWriteTools)
    }

    await doSendLoop(systemPromptExtra, apiSettings, getContextMessages, onDataChange)
  }

  // === Reject pending destructive tools ===
  async function rejectPendingTools(
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],
    onDataChange?: (toolNames: string[]) => void,
  ) {
    const tools = pendingConfirmTools.value
    if (!tools || tools.length === 0) return
    pendingConfirmTools.value = null

    // Save rejection messages as tool results so AI knows
    for (const tc of tools) {
      const toolMsg: ChatMessage = {
        id: generateId(),
        novelId: novelId.value,
        role: 'tool',
        content: JSON.stringify({ rejected: true, message: '用户已取消该操作', toolName: tc.function.name }),
        toolCallId: tc.id,
        toolName: tc.function.name,
        createdAt: timestamp(),
      }
      saveMessage(toolMsg)
    }

    // Continue the loop so AI can respond
    await doSendLoop(systemPromptExtra, apiSettings, getContextMessages, onDataChange)
  }

  // === User submits question answers ===
  async function submitAnswers(
    answers: QuestionAnswer[],
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],
    onDataChange?: (toolNames: string[]) => void,
  ) {
    const answerText = `用户回答了你的问题：\n${answers
      .map(a => {
        const q = pendingQuestions.value?.find(q => q.id === a.id)
        return `Q: ${q?.question || a.id}\nA: ${String(a.answer)}`
      })
      .join('\n\n')}`

    pendingQuestions.value = null
    pendingQuestionsTitle.value = ''

    const userMessage: ChatMessage = {
      id: generateId(),
      novelId: novelId.value,
      role: 'user',
      content: answerText,
      createdAt: timestamp(),
    }
    saveMessage(userMessage)

    await doSendLoop(systemPromptExtra, apiSettings, getContextMessages, onDataChange)
  }

  // === User skips questions ===
  async function skipWaiting(
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],
    onDataChange?: (toolNames: string[]) => void,
  ) {
    if (pendingQuestions.value) {
      const skipMsg: ChatMessage = {
        id: generateId(),
        novelId: novelId.value,
        role: 'user',
        content: '用户跳过了问题，请根据现有信息直接开始写作。',
        createdAt: timestamp(),
      }
      saveMessage(skipMsg)
      pendingQuestions.value = null
      pendingQuestionsTitle.value = ''
      await doSendLoop(systemPromptExtra, apiSettings, getContextMessages, onDataChange)
    } else if (pendingSolutions.value) {
      pendingSolutions.value = null
      status.value = 'idle'
    }
  }

  // === User selects a solution ===
  async function selectSolution(
    solution: { id: string; title: string; description: string } | string,
    systemPromptExtra: string,
    apiSettings: APISettings,
    getContextMessages: () => ChatMessage[],
    onDataChange?: (toolNames: string[]) => void,
  ) {
    const text = typeof solution === 'string'
      ? `我选择了以下方案：\n自定义方案：${solution}\n\n请根据这个方案修改。`
      : `我选择了以下方案：\n方案：${solution.title}\n内容：${solution.description}\n\n请根据这个方案修改。`

    pendingSolutions.value = null

    const userMessage: ChatMessage = {
      id: generateId(),
      novelId: novelId.value,
      role: 'user',
      content: text,
      createdAt: timestamp(),
    }
    saveMessage(userMessage)

    await doSendLoop(systemPromptExtra, apiSettings, getContextMessages, onDataChange)
  }

  // === Abort generation ===
  function abort() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }

    // Save partial content if any
    if (currentStreamText.value) {
      const partialMsg: ChatMessage = {
        id: generateId(),
        novelId: novelId.value,
        role: 'assistant',
        content: currentStreamText.value + '\n\n[生成已中止]',
        createdAt: timestamp(),
      }
      saveMessage(partialMsg)
      currentStreamText.value = ''
    }

    status.value = 'idle'
  }

  return {
    // State
    messages,
    status,
    currentStreamText,
    error,
    novelId,
    pendingQuestions,
    pendingQuestionsTitle,
    pendingSolutions,
    pendingConfirmTools,
    allowDestructiveWithoutAsking,
    // Computed
    displayMessages,
    // Actions
    loadMessages,
    clearMessages,
    sendMessage,
    submitAnswers,
    skipWaiting,
    selectSolution,
    abort,
    confirmPendingTools,
    rejectPendingTools,
  }
})
