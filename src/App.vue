<script setup lang="ts">
import { watch } from 'vue'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()

watch(() => appStore.isDarkMode, (val) => {
  document.documentElement.classList.toggle('dark', val)
}, { immediate: true })
</script>

<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-page);
}
</style>
