<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  title: string
  initialData?: { title: string; type: string; description: string }
}>()

const emit = defineEmits<{
  close: []
  confirm: [data: { title: string; type: string; description: string }]
}>()

const form = ref({ title: '', type: '', description: '' })

watch(() => props.visible, (val) => {
  if (val) {
    form.value = {
      title: props.initialData?.title || '',
      type: props.initialData?.type || '',
      description: props.initialData?.description || '',
    }
  }
})

function handleConfirm() {
  if (!form.value.title.trim()) return
  emit('confirm', { ...form.value })
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="480px"
    @close="emit('close')"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="小说名称" required>
        <el-input v-model="form.title" placeholder="请输入小说名称" />
      </el-form-item>
      <el-form-item label="小说类型">
        <el-input v-model="form.type" placeholder="如：玄幻、言情、科幻..." />
      </el-form-item>
      <el-form-item label="小说简介">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="简单介绍一下你的小说..."
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :disabled="!form.title.trim()">
        确认
      </el-button>
    </template>
  </el-dialog>
</template>
