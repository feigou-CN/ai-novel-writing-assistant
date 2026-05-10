// === Novel ===
export interface Novel {
  id: string
  title: string
  type: string
  description: string
  createdAt: number
  updatedAt: number
}

// === Chapter ===
export interface Chapter {
  id: string
  novelId: string
  title: string
  order: number
  content: string
  outline: string
  outlineStatus?: 'planned' | 'summarized' | 'stale'
  createdAt: number
  updatedAt: number
}

// === Character ===
export interface Character {
  id: string
  novelId: string
  name: string
  gender: string
  age: string
  personality: string
  appearance: string
  background: string
  relationships: string
  notes: string
  positionX?: number
  positionY?: number
}

export interface CharacterRelation {
  id: string
  novelId: string
  sourceId: string
  targetId: string
  label: string
  type: 'directed' | 'bidirectional'
}

// === World Setting ===
export interface WorldSetting {
  id: string
  novelId: string
  name: string
  content: string
}

// === Legacy Event (migration only) ===
export interface EventItem {
  id: string
  novelId: string
  name: string
  description: string
  order: number
}

// === Timeline ===
export interface TimelineTrack {
  id: string
  novelId: string
  name: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface TimelineEvent {
  id: string
  novelId: string
  trackId: string
  name: string
  description: string
  order: number
  endOrder?: number
  important?: boolean
  createdAt: number
  updatedAt: number
}

// === Story Outline ===
export interface StoryOutline {
  novelId: string
  content: string
}

// === Chat ===
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ChatMessage {
  id: string
  novelId: string
  role: MessageRole
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string  // for tool role messages
  toolName?: string    // for tool role messages
  reasoningContent?: string  // DeepSeek Reasoner thinking content
  createdAt: number
}

export interface PendingToolApproval {
  id: string
  toolCalls: ToolCall[]
  allowWithoutAsking: boolean
}

// === Attachment ===
export interface AttachmentInfo {
  type: 'characters' | 'worldSettings' | 'storyOutline' | 'chapterOutline' | 'events' | 'contextChapters' | 'chapterEndings'
  label: string
  ids?: string[]  // specific item IDs, empty = all
}

export interface AttachmentsState {
  characters: boolean
  worldSettings: boolean
  storyOutline: boolean
  chapterOutline: boolean
  timeline: boolean
  contextChapters: boolean
  chapterEndings: boolean
}

// 附件单项选择（空数组 = 全部选中）
export interface AttachmentSelections {
  characters: string[]
  worldSettings: string[]
  timeline: string[]
}

// === Question Cards ===
export interface Question {
  id: string
  question: string
  type: 'text' | 'select' | 'confirm'
  options?: string[]
  multiSelect?: boolean
}

export interface QuestionAnswer {
  id: string
  question: string
  answer: string | boolean
}

// === Solution Cards ===
export interface Solution {
  id: string
  title: string
  description: string
}

export interface SolutionsData {
  problem: string
  solutions: Solution[]
}

// === Writing Preferences ===
export interface WritingPrefs {
  perspective: string
  wordCount: number
  focus: string
}

// === API Settings ===
export interface APISettings {
  baseURL: string
  apiKey: string
  model: string
}

export interface APIPreset {
  name: string
  baseURL: string
  model: string
}

// === Chat Status ===
export type ChatStatus = 'idle' | 'sending' | 'streaming' | 'tool_calling' | 'executing_tools' | 'waiting_user' | 'waiting_confirmation'

// === Tool Definitions (for OpenAI API) ===
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

// === OpenAI API types ===
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  reasoning_content?: string  // DeepSeek Reasoner thinking content
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  tool_call_id?: string
  name?: string
}

export interface StreamCallbacks {
  onText: (text: string) => void
  onToolCalls: (toolCalls: ToolCall[]) => void
  onDone: () => void
  onError: (error: Error) => void
}

// === DB types ===
export type StoreName = 'novels' | 'chapters' | 'characters' | 'worldSettings' | 'events' | 'outlines' | 'chatMessages' | 'novelMemory' | 'timelineTracks' | 'timelineEvents' | 'characterRelations'

// === Novel Memory ===
export interface NovelMemory {
  novelId: string
  summary: string
  lastUpdated: number
}
