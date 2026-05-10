<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/appStore'
import { API_PRESETS } from '@/config/api'

const appStore = useAppStore()

const perspectiveOptions = ['第三人称', '第一人称', '全知视角']
const wordCountOptions = [500, 1000, 2000, 3000, 5000, 10000]

function handlePresetChange(name: string) {
  appStore.applyPreset(name)
}
</script>

<template>
  <el-popover placement="bottom-end" :width="320" trigger="click">
    <template #reference>
      <el-button size="small" :icon="Setting">写作设置</el-button>
    </template>

    <div class="settings-panel">
      <h4 class="settings-title">写作设置</h4>

      <el-form label-width="80px" label-position="top" size="small">
        <el-form-item label="写作视角">
          <el-select v-model="appStore.writingPrefs.perspective" style="width: 100%">
            <el-option
              v-for="opt in perspectiveOptions"
              :key="opt"
              :label="opt"
              :value="opt"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="目标字数">
          <el-select v-model="appStore.writingPrefs.wordCount" style="width: 100%">
            <el-option
              v-for="count in wordCountOptions"
              :key="count"
              :label="`${count} 字`"
              :value="count"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="重点突出">
          <el-input
            v-model="appStore.writingPrefs.focus"
            placeholder="如：环境描写、心理活动..."
          />
        </el-form-item>
      </el-form>

      <el-divider />

      <h4 class="settings-title">API 设置</h4>

      <el-form label-width="80px" label-position="top" size="small">
        <el-form-item label="API 预设">
          <el-select v-model="appStore.selectedPreset" style="width: 100%" @change="handlePresetChange">
            <el-option
              v-for="p in API_PRESETS"
              :key="p.name"
              :label="p.name"
              :value="p.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="API 地址">
          <el-input v-model="appStore.apiSettings.baseURL" placeholder="https://api.openai.com/v1" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="appStore.apiSettings.apiKey"
            type="password"
            placeholder="sk-..."
            show-password
          />
        </el-form-item>
        <el-form-item label="模型">
          <el-select
            v-model="appStore.apiSettings.model"
            filterable
            allow-create
            placeholder="选择或输入模型"
            style="width: 100%"
            :loading="appStore.modelsLoading"
            @visible-change="(v: boolean) => v && appStore.fetchModels()"
          >
            <el-option
              v-for="m in appStore.availableModels"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <div style="text-align: right; margin-top: 8px;">
        <el-tag size="small" type="info" v-if="!appStore.apiSettings.apiKey">
          请配置 API Key
        </el-tag>
        <el-tag size="small" type="success" v-else>
          API 已配置
        </el-tag>
      </div>
    </div>
  </el-popover>
</template>

<style scoped>
.settings-panel {
  padding: 4px 0;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
</style>
