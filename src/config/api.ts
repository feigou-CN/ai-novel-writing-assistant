import type { APIPreset } from '@/types'

/**
 * API 预设配置
 */
export const API_PRESETS: APIPreset[] = [
  { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { name: 'DeepSeek', baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'DeepSeek Reasoner', baseURL: 'https://api.deepseek.com', model: 'deepseek-reasoner' },
  { name: 'Moonshot', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: 'Qwen', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: 'GLM', baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  { name: '自定义', baseURL: '', model: '' },
]
