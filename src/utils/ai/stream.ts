import type { ToolCall, ToolDefinition, OpenAIMessage, APISettings } from '@/types'
import { toolDefinitions } from './definitions'

// ==================== Tool Call Accumulator ====================

interface ToolCallDelta {
  index: number
  id?: string
  type?: 'function'
  function?: {
    name?: string
    arguments?: string
  }
}

interface AccumulatedToolCall {
  index: number
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

class ToolCallAccumulator {
  private calls: Map<number, AccumulatedToolCall> = new Map()

  addDelta(delta: { tool_calls?: ToolCallDelta[] }): void {
    if (!delta.tool_calls) return

    for (const tc of delta.tool_calls) {
      let call = this.calls.get(tc.index)
      if (!call) {
        call = { index: tc.index, id: '', type: 'function', function: { name: '', arguments: '' } }
        this.calls.set(tc.index, call)
      }
      if (tc.id) call.id += tc.id
      if (tc.function?.name) call.function.name += tc.function.name
      if (tc.function?.arguments) call.function.arguments += tc.function.arguments
    }
  }

  finalize(): AccumulatedToolCall[] {
    const results = Array.from(this.calls.values())
    for (const call of results) {
      try {
        call.function.arguments = JSON.parse(call.function.arguments)
      } catch {
        // Keep as string
      }
    }
    return results
  }

  reset(): void {
    this.calls.clear()
  }

  get hasCalls(): boolean {
    return this.calls.size > 0
  }
}

// ==================== SSE Parser ====================

async function* parseSSEStream(
  response: Response,
): AsyncGenerator<{ text: string; reasoningContent?: string; toolCalls?: ToolCall[]; done: boolean }> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  const accumulator = new ToolCallAccumulator()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        const toolCalls = accumulator.finalize()
        if (toolCalls.length > 0) {
          yield { text: '', toolCalls: toolCalls as ToolCall[], done: true }
        } else {
          yield { text: '', done: true }
        }
        return
      }

      try {
        const parsed = JSON.parse(data)
        const choice = parsed.choices?.[0]
        if (!choice) continue

        const delta = choice.delta
        if (delta?.content || delta?.reasoning_content) {
          yield { text: delta.content || '', reasoningContent: delta.reasoning_content, done: false }
        }
        if (delta?.tool_calls) {
          accumulator.addDelta(delta)
        }
        if (choice.finish_reason === 'tool_calls') {
          const toolCalls = accumulator.finalize()
          yield { text: '', toolCalls: toolCalls as ToolCall[], done: true }
          return
        }
        if (choice.finish_reason === 'stop') {
          yield { text: '', done: true }
          return
        }
      } catch {
        // Skip unparseable chunks
      }
    }
  }

  // End of stream without explicit finish
  yield { text: '', done: true }
}

// ==================== Send Chat ====================

/**
 * 发送 SSE 流式聊天请求
 */
export async function sendChat(
  messages: OpenAIMessage[],
  settings: APISettings,
  onText: (text: string) => void,
  onToolCalls: (toolCalls: ToolCall[]) => void,
  signal?: AbortSignal,
): Promise<{ content: string; reasoningContent?: string; toolCalls?: ToolCall[] }> {
  const url = `${settings.baseURL.replace(/\/+$/, '')}/chat/completions`

  const body = JSON.stringify({
    model: settings.model,
    messages,
    tools: toolDefinitions,
    tool_choice: 'auto' as const,
    stream: true,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body,
    signal,
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const err = await response.json()
      errorMsg = err.error?.message || errorMsg
    } catch {
      // Keep default message
    }
    if (response.status === 401) {
      throw new Error('API Key 无效，请在设置中检查')
    }
    if (response.status === 429) {
      throw new Error('请求过于频繁，请稍后重试')
    }
    throw new Error(`API 请求失败: ${errorMsg}`)
  }

  let fullContent = ''
  let fullReasoningContent = ''
  let finalToolCalls: ToolCall[] | undefined

  for await (const chunk of parseSSEStream(response)) {
    if (chunk.text) {
      fullContent += chunk.text
      onText(chunk.text)
    }
    if (chunk.reasoningContent) {
      fullReasoningContent += chunk.reasoningContent
    }
    if (chunk.toolCalls) {
      finalToolCalls = chunk.toolCalls
      onToolCalls(chunk.toolCalls)
    }
    if (chunk.done) {
      break
    }
  }

  return { content: fullContent, reasoningContent: fullReasoningContent || undefined, toolCalls: finalToolCalls }
}
