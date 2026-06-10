<script setup lang="ts">
import { ref, computed } from 'vue'
import { Download, FileAudio } from 'lucide-vue-next'
import { useAudioStore } from '@/stores/audio'
import { useAudioClipper } from '@/composables/useAudioClipper'
import { ElMessage } from 'element-plus'

const store = useAudioStore()
const clipper = useAudioClipper()

const customFileName = ref('')
const exportOptions = [
  { label: 'WAV (无损)', value: 'wav' },
  { label: 'WAV (16bit)', value: 'wav16' },
]

const selectedFormat = ref('wav')

const outputFileName = computed(() => {
  const base = customFileName.value || store.fileName || 'audio_clip'
  return `${base}.wav`
})

function handleExport() {
  if (!store.audioBuffer) {
    ElMessage.warning('没有可导出的音频')
    return
  }

  store.isProcessing = true
  try {
    const blob = clipper.exportAudio()
    if (blob) {
      clipper.downloadBlob(blob, outputFileName.value)
      ElMessage.success('导出成功！')
    }
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    store.isProcessing = false
  }
}

function handleExportSelection() {
  if (!store.audioBuffer || !store.hasRegion) {
    ElMessage.warning('请先选择音频区域')
    return
  }

  store.isProcessing = true
  try {
    const blob = clipper.exportSelection()
    if (blob) {
      const base = customFileName.value || store.fileName || 'audio_clip'
      clipper.downloadBlob(blob, `${base}_selected.wav`)
      ElMessage.success('选区导出成功！')
    }
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    store.isProcessing = false
  }
}
</script>

<template>
  <div class="export-panel bg-bg-card/60 rounded-xl border border-border-custom/50 p-4 backdrop-blur-sm">
    <div class="flex items-center gap-2 mb-4">
      <FileAudio class="w-5 h-5 text-accent" />
      <h3 class="text-sm font-medium text-text-primary">导出音频</h3>
    </div>

    <div class="flex items-end gap-4 flex-wrap">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs text-text-muted mb-1.5">文件名</label>
        <el-input
          v-model="customFileName"
          :placeholder="store.fileName || '输入文件名'"
          size="default"
        />
      </div>

      <div class="w-36">
        <label class="block text-xs text-text-muted mb-1.5">格式</label>
        <el-select v-model="selectedFormat" size="default" class="!w-full">
          <el-option
            v-for="opt in exportOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:shadow-glow transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!store.hasFile || store.isProcessing"
          @click="handleExport"
        >
          <Download class="w-4 h-4" />
          导出全部
        </button>

        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-secondary/10 border border-accent-secondary/30 text-accent-secondary text-sm font-medium hover:bg-accent-secondary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!store.hasRegion || store.isProcessing"
          @click="handleExportSelection"
        >
          <Download class="w-4 h-4" />
          导出选区
        </button>
      </div>
    </div>

    <div v-if="store.hasFile" class="mt-3 flex items-center gap-4 text-xs text-text-muted font-mono">
      <span>时长: {{ store.formattedDuration }}</span>
      <span>采样率: {{ store.audioBuffer?.sampleRate }}Hz</span>
      <span>声道: {{ store.audioBuffer?.numberOfChannels === 1 ? '单声道' : '立体声' }}</span>
    </div>
  </div>
</template>
