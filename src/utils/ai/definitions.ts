import type { ToolDefinition } from '@/types'

/**
 * AI 工具定义 — 声明 AI 可调用的所有 function calling
 */
export const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_characters',
      description: 'Get all character profiles for the current novel',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
        },
        required: ['novelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_character',
      description: 'Get full details for a specific character',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Character ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_world_settings',
      description: 'Get world building settings for the current novel',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
        },
        required: ['novelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_story_outline',
      description: 'Get the story outline for the current novel',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
        },
        required: ['novelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_chapter_outline',
      description: 'Get the outline for a specific chapter',
      parameters: {
        type: 'object',
        properties: {
          chapterId: { type: 'string', description: 'Chapter ID' },
        },
        required: ['chapterId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_chapter_content',
      description: 'Get full content for a specific chapter',
      parameters: {
        type: 'object',
        properties: {
          chapterId: { type: 'string', description: 'Chapter ID' },
        },
        required: ['chapterId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_timeline',
      description: 'Get the timeline for the current novel, with events grouped by track. Returns an array of { trackId, trackName, events }. Use the trackId (real ID, not name) as the "trackId" parameter when calling create_event.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
        },
        required: ['novelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_chapter_endings',
      description: 'Get the last 300 characters of recent chapters for style reference',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          count: { type: 'number', description: 'Number of chapters' },
        },
        required: ['novelId', 'count'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_questions',
      description: 'Ask the user 1-5 specific questions when their request lacks sufficient detail',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title for this set of questions' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string', description: 'Question text' },
                type: {
                  type: 'string',
                  enum: ['text', 'select', 'confirm'],
                  description: 'text=input, select=choice, confirm=yes/no',
                },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Options for select type',
                },
                multiSelect: {
                  type: 'boolean',
                  description: 'When true and type=select, user can pick multiple options. Default false.',
                },
              },
              required: ['id', 'question', 'type'],
            },
          },
        },
        required: ['questions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_solutions',
      description: 'Suggest multiple solutions when writing problems are detected',
      parameters: {
        type: 'object',
        properties: {
          problem: { type: 'string', description: 'Problem description and analysis' },
          solutions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string', description: 'Solution title' },
                description: { type: 'string', description: 'Detailed description of changes and expected effects' },
              },
              required: ['id', 'title', 'description'],
            },
          },
        },
        required: ['problem', 'solutions'],
      },
    },
  },
  // === Write tools ===
  {
    type: 'function',
    function: {
      name: 'write_chapter_content',
      description: 'Write generated chapter content directly to a chapter. Recommended to call get_chapter_content first to check existing content.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          chapterId: { type: 'string', description: 'Chapter ID' },
          content: { type: 'string', description: 'Full chapter content' },
        },
        required: ['novelId', 'chapterId', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_character',
      description: 'Create a new character profile',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          name: { type: 'string', description: 'Character name' },
          gender: { type: 'string', description: 'Gender' },
          age: { type: 'string', description: 'Age' },
          personality: { type: 'string', description: 'Personality traits' },
          appearance: { type: 'string', description: 'Appearance' },
          background: { type: 'string', description: 'Background' },
          relationships: { type: 'string', description: 'Relationships' },
          notes: { type: 'string', description: 'Notes' },
        },
        required: ['novelId', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_character',
      description: 'Update an existing character profile',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Character ID' },
          name: { type: 'string', description: 'Character name' },
          gender: { type: 'string', description: 'Gender' },
          age: { type: 'string', description: 'Age' },
          personality: { type: 'string', description: 'Personality traits' },
          appearance: { type: 'string', description: 'Appearance' },
          background: { type: 'string', description: 'Background' },
          relationships: { type: 'string', description: 'Relationships' },
          notes: { type: 'string', description: 'Notes' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_world_setting',
      description: 'Create a new world building setting',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          name: { type: 'string', description: 'Setting name' },
          content: { type: 'string', description: 'Content' },
        },
        required: ['novelId', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_world_setting',
      description: 'Update an existing world building setting',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'World setting ID' },
          name: { type: 'string', description: 'Setting name' },
          content: { type: 'string', description: 'Content' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Create a new event on a timeline track (IMPORTANT: trackId must be the real ID string returned by create_timeline_track or get_timeline, NOT the track name like "主线"). Must create the track first, get its ID, then create events.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          trackId: { type: 'string', description: 'The REAL timeline track ID (a UUID string like "abc123..."). Do NOT use the track name here. Get the real ID from create_timeline_track response field "entityId" or from get_timeline field "trackId".' },
          name: { type: 'string', description: 'Event name' },
          description: { type: 'string', description: 'Event description' },
          order: { type: 'number', description: 'Sort order (optional, appends to end by default)' },
          endOrder: { type: 'number', description: 'End order for spanning events (optional)' },
          important: { type: 'boolean', description: 'Mark this event as important/key plot point (optional)' },
        },
        required: ['novelId', 'trackId', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_timeline_track',
      description: 'Create a new timeline track (e.g., main plot, romance subplot). The response field "entityId" is the real track ID — save it and use it as "trackId" when calling create_event. Do NOT use the track name ("主线") as trackId.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          name: { type: 'string', description: 'Track name, e.g. 主线, 感情线, 支线' },
          order: { type: 'number', description: 'Display order (optional, appends to end by default)' },
        },
        required: ['novelId', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_event',
      description: 'Update an existing timeline event',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Event ID' },
          name: { type: 'string', description: 'Event name' },
          description: { type: 'string', description: 'Event description' },
          order: { type: 'number', description: 'Sort order' },
          endOrder: { type: 'number', description: 'End order for spanning events (optional)' },
          trackId: { type: 'string', description: 'Timeline track ID' },
          important: { type: 'boolean', description: 'Mark this event as important (optional)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_story_outline',
      description: 'Update the story outline',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          content: { type: 'string', description: 'Outline content' },
        },
        required: ['novelId', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_chapter',
      description: 'Create a new chapter with title, optional outline, and optional order.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          title: { type: 'string', description: 'Chapter title' },
          outline: { type: 'string', description: 'Chapter summary or outline' },
          order: { type: 'number', description: 'Chapter order. If omitted, append to the end.' },
        },
        required: ['novelId', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'batch_create_chapters',
      description: 'Create multiple chapters in one operation, each with title, optional outline, and optional order.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          chapters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Chapter title' },
                outline: { type: 'string', description: 'Chapter summary or outline' },
                order: { type: 'number', description: 'Preferred chapter order' },
              },
              required: ['title'],
            },
          },
        },
        required: ['novelId', 'chapters'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_chapter_outline',
      description: 'Update the chapter description. Before chapter content exists it is a writing plan; after content exists it is the compact summary.',
      parameters: {
        type: 'object',
        properties: {
          chapterId: { type: 'string', description: 'Chapter ID' },
          outline: { type: 'string', description: 'Updated chapter description' },
          title: { type: 'string', description: 'Optional updated title' },
          status: {
            type: 'string',
            enum: ['planned', 'summarized'],
            description: 'Use planned before writing content, summarized after content exists.',
          },
        },
        required: ['chapterId', 'outline'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_chapter_descriptions',
      description: 'Get compact chapter descriptions for a novel without returning full chapter content.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
        },
        required: ['novelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_chapter_description',
      description: 'Save a compact chapter description generated by the AI from existing chapter content.',
      parameters: {
        type: 'object',
        properties: {
          chapterId: { type: 'string', description: 'Chapter ID' },
          description: { type: 'string', description: 'Compact summary of what actually happened in the chapter' },
        },
        required: ['chapterId', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_chapter_text',
      description: 'Replace one exact text fragment inside a chapter without rewriting the whole chapter.',
      parameters: {
        type: 'object',
        properties: {
          chapterId: { type: 'string', description: 'Chapter ID' },
          oldText: { type: 'string', description: 'Exact text to replace' },
          newText: { type: 'string', description: 'Replacement text' },
        },
        required: ['chapterId', 'oldText', 'newText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'insert_chapter_text',
      description: 'Insert text before or after an exact anchor inside a chapter.',
      parameters: {
        type: 'object',
        properties: {
          chapterId: { type: 'string', description: 'Chapter ID' },
          anchorText: { type: 'string', description: 'Exact anchor text' },
          text: { type: 'string', description: 'Text to insert' },
          position: { type: 'string', enum: ['before', 'after'], description: 'Insert position relative to anchorText' },
        },
        required: ['chapterId', 'anchorText', 'text', 'position'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'merge_chapters',
      description: 'Merge a source chapter into a target chapter, update target content/description, then delete the source chapter.',
      parameters: {
        type: 'object',
        properties: {
          targetChapterId: { type: 'string', description: 'Chapter that will remain after merge' },
          sourceChapterId: { type: 'string', description: 'Chapter that will be deleted after merge' },
          mergedContent: { type: 'string', description: 'Optional final merged target content. If omitted, contents are concatenated.' },
          mergedOutline: { type: 'string', description: 'Optional final compact description for the merged chapter' },
        },
        required: ['targetChapterId', 'sourceChapterId'],
      },
    },
  },
  // === Delete tools ===
  {
    type: 'function',
    function: {
      name: 'delete_character',
      description: 'Delete a character profile (requires user confirmation)',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Character ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_world_setting',
      description: 'Delete a world building setting (requires user confirmation)',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'World setting ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Delete an event timeline entry (requires user confirmation)',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Event ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_chapter',
      description: 'Delete a chapter and reorder remaining chapters (requires user confirmation)',
      parameters: {
        type: 'object',
        properties: {
          chapterId: { type: 'string', description: 'Chapter ID' },
        },
        required: ['chapterId'],
      },
    },
  },
  // === Chapter orchestration ===
  {
    type: 'function',
    function: {
      name: 'reorder_chapters',
      description: 'Reorder chapters in a desired sequence (requires user confirmation)',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          orderedChapterIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of chapter IDs in desired order',
          },
        },
        required: ['novelId', 'orderedChapterIds'],
      },
    },
  },
  // === Batch chapter query ===
  {
    type: 'function',
    function: {
      name: 'get_chapters_range',
      description: 'Get compact summaries for a range of chapters (order, title, outline, first 200 chars, content length) for quick reference without full content.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          fromOrder: { type: 'number', description: 'Starting chapter order (1-based). Defaults to 1 if omitted.' },
          count: { type: 'number', description: 'Number of chapters to fetch. Defaults to all remaining if omitted.' },
        },
        required: ['novelId'],
      },
    },
  },
  // === Novel Memory ===
  {
    type: 'function',
    function: {
      name: 'get_novel_memory',
      description: 'Get the persistent novel memory summary. Generated by AI after reading all materials, persists across chat clears. Contains overview, plot progress, writing style, etc. Returns a hint if not yet generated.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
        },
        required: ['novelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_novel_memory',
      description: 'Update the persistent novel memory summary after reading all materials (characters, world settings, events, outline, chapters). Ensures AI can understand the novel even without chat history.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          summary: { type: 'string', description: 'Full novel memory summary: basic setup (genre, world, main characters), plot progress, writing style (perspective, style notes), recent developments (recent chapter summaries), pending items (foreshadowing, open plot threads)' },
        },
        required: ['novelId', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_relation',
      description: 'Create a relationship between two characters. Use get_characters to find character IDs first.',
      parameters: {
        type: 'object',
        properties: {
          novelId: { type: 'string', description: 'Novel ID' },
          sourceId: { type: 'string', description: 'Source character ID' },
          targetId: { type: 'string', description: 'Target character ID' },
          label: { type: 'string', description: 'Relationship description, e.g. 父子, 仇敌, 暗恋' },
          type: { type: 'string', enum: ['directed', 'bidirectional'], description: 'directed = one-way (A→B), bidirectional = mutual (A↔B)' },
        },
        required: ['novelId', 'sourceId', 'targetId', 'label', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_relation',
      description: 'Update an existing character relationship label or type',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Relationship ID' },
          label: { type: 'string', description: 'Relationship description' },
          type: { type: 'string', enum: ['directed', 'bidirectional'], description: 'Relationship direction type' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_relation',
      description: 'Delete a character relationship (requires user confirmation)',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Relationship ID' },
        },
        required: ['id'],
      },
    },
  },
]
