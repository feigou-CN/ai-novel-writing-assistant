import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chatStore'
import { useAppStore } from '@/stores/appStore'
import { useNovelStore } from '@/stores/novelStore'
import { useChapterStore } from '@/stores/chapterStore'
import { useMaterialStore } from '@/stores/materialStore'
import { buildPrompt } from '@/utils/prompt'
import type { ChatMessage, QuestionAnswer } from '@/types'

/**
 * 聊天发送组合式函数
 *
 * 封装了 ChatPanel 中与 AI 对话的核心逻辑：
 * 上下文构建、消息发送、数据处理
 */
export function useChatSend() {
  const chatStore = useChatStore()
  const appStore = useAppStore()
  const novelStore = useNovelStore()
  const chapterStore = useChapterStore()
  const materialStore = useMaterialStore()

  /**
   * 构建系统提示词中的额外上下文
   */
  function buildSystemPromptExtra(): string {
    const novel = novelStore.currentNovel
    if (!novel) return ''

    const parts: string[] = [
      `当前小说ID：${novel.id}`,
      `当前小说：${novel.title}`,
      `小说类型：${novel.type}`,
    ]

    if (chapterStore.currentChapter) {
      parts.push(`当前章节：${chapterStore.currentChapter.title}`)
    }

    const workspaceStatus = {
      worldSettings: materialStore.worldSettings.length,
      characters: materialStore.characters.length,
      characterRelations: materialStore.characterRelations.length,
      timeline: materialStore.timelineEvents.length,
      hasStoryOutline: Boolean(materialStore.storyOutline?.content?.trim()),
      chapters: chapterStore.chapters.length,
      chaptersWithOutline: chapterStore.chapters.filter(ch => ch.outline.trim()).length,
    }

    parts.push(
      '当前工作区状态：' +
      `世界观 ${workspaceStatus.worldSettings} 条，` +
      `人物 ${workspaceStatus.characters} 个，` +
      `人物关系 ${workspaceStatus.characterRelations} 条，` +
      `时间线 ${workspaceStatus.timeline} 个事件，` +
      `总大纲 ${workspaceStatus.hasStoryOutline ? '已存在' : '缺失'}，` +
      `章节 ${workspaceStatus.chapters} 个，` +
      `有简述的章节 ${workspaceStatus.chaptersWithOutline} 个`,
    )

    const isEmptyStory = !workspaceStatus.worldSettings
      && !workspaceStatus.characters
      && !workspaceStatus.timeline
      && !workspaceStatus.hasStoryOutline
      && workspaceStatus.chapters === 0

    if (isEmptyStory) {
      parts.push(
        '这是一个全新的故事工作区。',
        '如果用户在描述新故事，请优先按以下流程推进：补充关键信息 -> 世界观 -> 人物 -> 时间线 -> 总大纲 -> 章节拆分与章节简述。',
        '在用户没有明确要求直接写正文之前，优先创建章节和章节简述，不要直接长篇写第一章。',
      )
    } else if (workspaceStatus.hasStoryOutline && workspaceStatus.chapters === 0) {
      parts.push(
        '当前已有总大纲但还没有章节。',
        '若用户要求继续推进，优先创建章节标题和章节简述，可优先使用 batch_create_chapters。',
      )
    } else if (workspaceStatus.chapters > 0 && workspaceStatus.chaptersWithOutline < workspaceStatus.chapters) {
      parts.push(
        '当前存在尚未补全简述的章节。',
        '如果用户在做规划，请优先补齐章节简述，再进入正文写作。',
      )
    }

    if (materialStore.novelMemory?.summary) {
      parts.push('=== 小说记忆摘要（跨越对话持久保存） ===', materialStore.novelMemory.summary, '')
    }

    return parts.join('\n')
  }

  function getContextMessages(): ChatMessage[] {
    return chatStore.messages.filter(m => m.role !== 'system')
  }

  /**
   * AI 工具调用后刷新数据显示
   */
  async function handleDataChange(toolNames: string[]) {
    const novelId = novelStore.currentNovel?.id
    if (!novelId) return

    try {
      if (toolNames.some(n => ['write_chapter_content', 'create_chapter', 'batch_create_chapters', 'update_chapter_outline'].includes(n))) {
        await chapterStore.fetchChapters(novelId)
        if (chapterStore.currentChapter) {
          await chapterStore.getChapterById(chapterStore.currentChapter.id)
        }
      }

      if (toolNames.some(n => [
        'create_character',
        'update_character',
        'create_relation',
        'update_relation',
        'delete_relation',
        'create_world_setting',
        'update_world_setting',
        'create_event',
        'update_event',
        'delete_event',
        'create_timeline_track',
        'update_story_outline',
        'update_novel_memory',
      ].includes(n))) {
        await materialStore.loadAll(novelId)
      }
    } catch (e) {
      console.error('Failed to refresh data after tool calls:', e)
    }
  }

  /**
   * 发送用户消息给 AI
   */
  async function sendUserMessage(userText: string) {
    const novel = novelStore.currentNovel
    if (!novel) return

    if (!appStore.apiSettings.apiKey) {
      ElMessage.warning('请先在设置中配置 API Key')
      return
    }

    const attachments = { ...appStore.defaultAttachments }
    const selections = appStore.attachmentSelections

    let selectedCharacters = materialStore.characters
    if (attachments.characters && selections.characters.length > 0) {
      selectedCharacters = materialStore.characters.filter(c => selections.characters.includes(c.id))
    }

    let selectedWorldSettings = materialStore.worldSettings
    if (attachments.worldSettings && selections.worldSettings.length > 0) {
      selectedWorldSettings = materialStore.worldSettings.filter(s => selections.worldSettings.includes(s.id))
    }

    let selectedTimelineTracks = materialStore.timelineTracks
    if (attachments.timeline && selections.timeline.length > 0) {
      selectedTimelineTracks = materialStore.timelineTracks.filter(t => selections.timeline.includes(t.id))
    }

    let contextChapters: typeof chapterStore.sortedChapters = []
    let chapterEndings: typeof chapterStore.sortedChapters = []

    if (attachments.contextChapters && chapterStore.chapters.length > 0) {
      contextChapters = chapterStore.sortedChapters.filter(
        c => c.id !== chapterStore.currentChapter?.id,
      ).slice(-5)
    }

    if (attachments.chapterEndings && chapterStore.chapters.length > 0) {
      chapterEndings = chapterStore.sortedChapters.filter(
        c => c.id !== chapterStore.currentChapter?.id,
      ).slice(-3)
    }

    const selectedCharIds = new Set(selectedCharacters.map(c => c.id))
    let selectedRelations = materialStore.characterRelations
    if (attachments.characters && selectedCharIds.size > 0) {
      selectedRelations = selectedRelations.filter(
        r => selectedCharIds.has(r.sourceId) || selectedCharIds.has(r.targetId),
      )
    }

    const prompt = buildPrompt({
      novelId: novel.id,
      novelTitle: novel.title,
      novelType: novel.type,
      novelDescription: novel.description,
      chapterTitle: chapterStore.currentChapter?.title,
      userInput: userText,
      attachments,
      prefs: appStore.writingPrefs,
      characters: attachments.characters ? selectedCharacters : undefined,
      characterRelations: attachments.characters ? selectedRelations : undefined,
      worldSettings: attachments.worldSettings ? selectedWorldSettings : undefined,
      storyOutline: attachments.storyOutline ? materialStore.storyOutline : undefined,
      chapterOutline: attachments.chapterOutline ? chapterStore.currentChapter?.outline : undefined,
      timelineTracks: attachments.timeline ? selectedTimelineTracks : undefined,
      timelineEvents: attachments.timeline ? materialStore.timelineEvents : undefined,
      contextChapters: attachments.contextChapters ? contextChapters : undefined,
      chapterEndings: attachments.chapterEndings ? chapterEndings : undefined,
    })

    chatStore.sendMessage(
      userText,
      buildSystemPromptExtra() + '\n\n=== 上下文素材 ===\n' + prompt,
      appStore.apiSettings,
      getContextMessages,
      handleDataChange,
    )
  }

  /**
   * 提交问题卡片答案
   */
  function submitQuestionAnswers(answers: QuestionAnswer[]) {
    chatStore.submitAnswers(
      answers,
      buildSystemPromptExtra(),
      appStore.apiSettings,
      getContextMessages,
      handleDataChange,
    )
  }

  /**
   * 选择方案
   */
  function selectSolution(solution: { id: string; title: string; description: string } | string) {
    chatStore.selectSolution(
      solution,
      buildSystemPromptExtra(),
      appStore.apiSettings,
      getContextMessages,
      handleDataChange,
    )
  }

  /**
   * 跳过等待
   */
  function skipWaiting() {
    chatStore.skipWaiting(
      buildSystemPromptExtra(),
      appStore.apiSettings,
      getContextMessages,
      handleDataChange,
    )
  }

  /**
   * 确认待处理工具
   */
  function confirmPendingOperations(allowWithoutAsking: boolean) {
    chatStore.confirmPendingTools(
      allowWithoutAsking,
      buildSystemPromptExtra(),
      appStore.apiSettings,
      getContextMessages,
      handleDataChange,
    )
  }

  /**
   * 拒绝待处理工具
   */
  function rejectPendingOperations() {
    chatStore.rejectPendingTools(
      buildSystemPromptExtra(),
      appStore.apiSettings,
      getContextMessages,
      handleDataChange,
    )
  }

  return {
    sendUserMessage,
    submitQuestionAnswers,
    selectSolution,
    skipWaiting,
    confirmPendingOperations,
    rejectPendingOperations,
    handleDataChange,
  }
}
