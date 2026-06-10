<script setup lang="ts">
import { ref } from 'vue'
import { Upload, Music } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'file-selected', file: File): void
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const ACCEPTED_FORMATS = '.mp3,.wav,.ogg,.flac,.aac,.m4a,.webm'

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    validateAndEmit(files[0])
  }
}

function handleClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    validateAndEmit(files[0])
  }
  target.value = ''
}

function validateAndEmit(file: File) {
  const validTypes = [
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
    'audio/aac', 'audio/mp4', 'audio/webm', 'audio/x-m4a',
    'audio/x-wav', 'audio/wave',
  ]
  const validExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.webm']
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (validTypes.includes(file.type) || validExtensions.includes(ext)) {
    emit('file-selected', file)
  } else {
    ElMessage.error('不支持的音频格式，请上传 MP3、WAV、OGG、FLAC 等常见格式')
  }
}

import { ElMessage } from 'element-plus'
</script>

<template>
  <div
    class="relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group"
    :class="isDragging
      ? 'border-accent bg-accent/10 shadow-glow'
      : 'border-border-light bg-bg-card/50 hover:border-accent/50 hover:bg-bg-card/80'"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <div class="absolute inset-0 bg-gradient-to-br from-accent/5 to-accent-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div class="relative flex flex-col items-center justify-center py-16 px-8">
      <div class="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
        <Upload class="w-8 h-8 text-accent" />
      </div>
      <p class="text-lg font-medium text-text-primary mb-2">
        {{ isDragging ? '释放以上传音频文件' : '拖拽音频文件到此处' }}
      </p>
      <p class="text-sm text-text-secondary mb-4">或点击选择文件</p>
      <div class="flex items-center gap-2 text-xs text-text-muted">
        <Music class="w-3.5 h-3.5" />
        <span>支持 MP3 / WAV / OGG / FLAC / AAC / M4A / WEBM</span>
      </div>
    </div>
    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPTED_FORMATS"
      class="hidden"
      @change="handleFileChange"
    />
  </div>
</template>
