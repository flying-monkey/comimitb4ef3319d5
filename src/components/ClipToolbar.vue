<script setup lang="ts">
import { Scissors, Trash2, Undo2, RotateCcw, Play, X } from 'lucide-vue-next'
import { useAudioStore } from '@/stores/audio'
import { useAudioClipper } from '@/composables/useAudioClipper'
import { ElMessage } from 'element-plus'

const store = useAudioStore()
const clipper = useAudioClipper()

const emit = defineEmits<{
  (e: 'audio-updated'): void
  (e: 'play-region'): void
}>()

function handleExtract() {
  if (!store.hasRegion) {
    ElMessage.warning('请先在波形上选择一个区域')
    return
  }
  store.isProcessing = true
  try {
    const newBuffer = clipper.extractSelection()
    if (newBuffer) {
      emit('audio-updated')
      ElMessage.success('已提取选中区域')
    }
  } finally {
    store.isProcessing = false
  }
}

function handleRemove() {
  if (!store.hasRegion) {
    ElMessage.warning('请先在波形上选择一个区域')
    return
  }
  store.isProcessing = true
  try {
    const newBuffer = clipper.removeSelection()
    if (newBuffer) {
      emit('audio-updated')
      ElMessage.success('已删除选中区域')
    }
  } finally {
    store.isProcessing = false
  }
}

function handleUndo() {
  const prevBuffer = clipper.undo()
  if (prevBuffer) {
    emit('audio-updated')
    ElMessage.info('已撤销操作')
  } else {
    ElMessage.warning('没有可撤销的操作')
  }
}

function handlePlayRegion() {
  emit('play-region')
}

function handleClearRegion() {
  store.region = null
  ElMessage.info('已清除选区')
}

function handleReset() {
  store.reset()
  ElMessage.info('已重置')
}
</script>

<template>
  <div class="clip-toolbar bg-bg-card/60 rounded-xl border border-border-custom/50 p-4 backdrop-blur-sm">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 hover:border-accent/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!store.hasRegion || store.isProcessing"
          @click="handleExtract"
        >
          <Scissors class="w-4 h-4" />
          提取选区
        </button>

        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-warm/10 border border-accent-warm/30 text-accent-warm text-sm font-medium hover:bg-accent-warm/20 hover:border-accent-warm/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!store.hasRegion || store.isProcessing"
          @click="handleRemove"
        >
          <Trash2 class="w-4 h-4" />
          删除选区
        </button>

        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-hover/50 border border-border-custom/50 text-text-secondary text-sm hover:text-text-primary hover:border-border-light transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!store.canUndo || store.isProcessing"
          @click="handleUndo"
        >
          <Undo2 class="w-4 h-4" />
          撤销
        </button>

        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-hover/50 border border-border-custom/50 text-text-secondary text-sm hover:text-accent hover:border-accent/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!store.hasRegion"
          @click="handlePlayRegion"
        >
          <Play class="w-4 h-4" />
          播放选区
        </button>

        <button
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg-hover/50 border border-border-custom/50 text-text-secondary text-sm hover:text-accent-warm hover:border-accent-warm/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!store.hasRegion"
          @click="handleClearRegion"
        >
          <X class="w-4 h-4" />
          清除
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div v-if="store.hasRegion" class="px-3 py-1.5 rounded-lg bg-accent-warm/10 border border-accent-warm/20 font-mono text-xs text-accent-warm">
          {{ store.formatTime(store.region!.start) }} → {{ store.formatTime(store.region!.end) }}
          <span class="ml-1 text-text-muted">({{ store.formatTime(store.regionDuration) }})</span>
        </div>

        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-hover/50 border border-border-custom/50 text-text-muted text-xs hover:text-accent-warm hover:border-accent-warm/30 transition-all"
          @click="handleReset"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          重置
        </button>
      </div>
    </div>

    <div v-if="!store.hasFile" class="mt-3 text-center text-xs text-text-muted">
      请先上传音频文件，然后在波形上拖拽选择区域进行剪辑
    </div>
  </div>
</template>
