<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content: string
}>()

function renderMarkdown(text: string): string {
  if (!text) return ''

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')

    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')

    // Line breaks
    .replace(/\n/g, '<br>')

  return html
}

const rendered = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="markdown-body" v-html="rendered" />
</template>

<style scoped>
.markdown-body {
  line-height: 1.7;
  word-wrap: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 0.5em 0;
  font-weight: 600;
}

.markdown-body :deep(h1) { font-size: 1.3em; }
.markdown-body :deep(h2) { font-size: 1.15em; }
.markdown-body :deep(h3) { font-size: 1.05em; }

.markdown-body :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-body :deep(br) {
  content: '';
  display: block;
  margin: 4px 0;
}
</style>
