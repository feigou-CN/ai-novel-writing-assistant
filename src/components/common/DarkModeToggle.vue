<script setup lang="ts">
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()
</script>

<template>
  <el-tooltip :content="appStore.isDarkMode ? '切换到白天模式' : '切换到黑夜模式'" placement="left">
    <el-button
      class="dark-toggle"
      :icon="appStore.isDarkMode ? Sunny : Moon"
      circle
      size="large"
      @click="appStore.toggleDarkMode()"
    />
  </el-tooltip>
</template>

<style scoped>
.dark-toggle {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 1000;
  font-size: 24px;
  width: 52px;
  height: 52px;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}

.dark-toggle:hover {
  transform: scale(1.1);
}
</style>
