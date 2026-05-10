/**
 * AI 模块 — 统一导出入口
 *
 * 原来单文件 utils/ai.ts 拆分为：
 *   - definitions.ts    → 工具定义（function calling schema）
 *   - handlers.ts       → 工具处理函数 + executeToolCall
 *   - stream.ts         → SSE 流式请求 + sendChat
 *   - categories.ts     → 工具分类常量
 *   - index.ts          → 统一导出 + 消息处理工具函数
 */
export { toolDefinitions } from './definitions'
export { toolHandlers, executeToolCall } from './handlers'
export { sendChat } from './stream'
export { isInteractionTool, isWriteTool, isDestructiveTool } from './categories'

// ==================== 消息处理工具 ====================

import type { ChatMessage, OpenAIMessage } from '@/types'

/**
 * 移除孤立 tool_call 消息（没有对应的 tool 响应），
 * 防止 API 报 "insufficient tool messages" 错误
 */
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  const toolCallIds = new Set<string>()
  for (const m of messages) {
    if (m.role === 'tool' && m.toolCallId) {
      toolCallIds.add(m.toolCallId)
    }
  }
  return messages.filter(m => {
    if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
      const allHaveResponses = m.toolCalls.every(tc => toolCallIds.has(tc.id))
      return allHaveResponses
    }
    return true
  })
}

/**
 * 将内部 ChatMessage 格式转换为 OpenAI API 消息格式
 */
export function toOpenAIMessages(messages: ChatMessage[]): OpenAIMessage[] {
  const sanitized = sanitizeMessages(messages)
  return sanitized.map(m => {
    const base: OpenAIMessage = {
      role: m.role as 'system' | 'user' | 'assistant' | 'tool',
      content: m.content ?? '',
    }
    if (m.reasoningContent) {
      base.reasoning_content = m.reasoningContent
    }
    if (m.toolCalls && m.toolCalls.length > 0) {
      base.tool_calls = m.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: typeof tc.function.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
        },
      }))
    }
    if (m.toolCallId) {
      base.tool_call_id = m.toolCallId
    }
    if (m.toolName) {
      base.name = m.toolName
    }
    return base
  })
}
