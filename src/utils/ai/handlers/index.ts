import type { ToolCall } from '@/types'
import { handlers as chapterHandlers } from './chapter'
import { handlers as characterHandlers } from './character'
import { worldHandlers } from './world'
import { timelineHandlers } from './timeline'
import { relationHandlers } from './relation'
import { interactionHandlers } from './interaction'
import { memoryHandlers } from './memory'

export const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  ...chapterHandlers,
  ...characterHandlers,
  ...worldHandlers,
  ...timelineHandlers,
  ...relationHandlers,
  ...interactionHandlers,
  ...memoryHandlers,
}

/**
 * 执行一个 AI 工具调用，返回 tool role 的结果
 */
export async function executeToolCall(tc: ToolCall): Promise<{ role: 'tool'; tool_call_id: string; content: string }> {
  const handler = toolHandlers[tc.function.name]
  if (!handler) {
    return {
      role: 'tool',
      tool_call_id: tc.id,
      content: JSON.stringify({ error: `Unknown tool: ${tc.function.name}` }),
    }
  }

  let args: Record<string, unknown> = {}
  try {
    args = typeof tc.function.arguments === 'string'
      ? JSON.parse(tc.function.arguments)
      : tc.function.arguments as Record<string, unknown>
  } catch {
    args = {}
  }

  const result = await handler(args)
  return {
    role: 'tool',
    tool_call_id: tc.id,
    content: result,
  }
}
