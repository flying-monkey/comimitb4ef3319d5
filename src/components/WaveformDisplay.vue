<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useWaveSurfer } from '@/composables/useWaveSurfer'
import { useAudioStore } from '@/stores/audio'

const store = useAudioStore()
const waveformContainer = ref<HTMLElement | null>(null)
const isMounted = ref(false)
const {
  isReady,
  init,
  loadFile,
  loadUrl,
  playPause,
  stop,
  playRegion,
  setVolume,
  setPlaybackRate,
  setZoom,
  skip,
  clearRegion,
  seekTo,
} = useWaveSurfer(waveformContainer)

const zoomValue = ref(1)

defineExpose({
  loadFile,
  loadUrl,
  playPause,
  stop,
  playRegion,
  setVolume,
  setPlaybackRate,
  setZoom,
  skip,
  clearRegion,
  seekTo,
  isReady,
})

watch(() => store.volume, (val) => {
  setVolume(val)
})

watch(() => store.playbackRate, (val) => {
  setPlaybackRate(val)
})

watch(zoomValue, (val) => {
  setZoom(val)
})

function processPendingSource() {
  if (!store.pendingSource) return
  const source = store.consumeSource()
  if (!source) return
  nextTick(() => {
    if (source.type === 'file') {
      loadFile(source.file)
    } else if (source.type === 'url') {
      loadUrl(source.url)
    }
  })
}

watch(() => store.pendingSource, () => {
  if (!isMounted.value) return
  processPendingSource()
})

onMounted(async () => {
  await nextTick()
  init()
  isMounted.value = true
  await nextTick()
  processPendingSource()
})
</script>

<template>
  <div class="waveform-display relative">
    <div class="bg-bg-card/60 rounded-xl border border-border-custom/50 p-4 backdrop-blur-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
          <span class="text-sm font-mono text-text-secondary">
            {{ store.hasFile ? store.fileName : '等待加载音频...' }}
          </span>
        </div>
        <div class="flex items-center gap-4 text-xs font-mono text-text-muted">
          <span v-if="store.hasFile">
            {{ store.formattedCurrentTime }} / {{ store.formattedDuration }}
          </span>
          <span v-if="store.hasRegion" class="text-accent-warm">
            选区: {{ store.formatTime(store.region!.start) }} - {{ store.formatTime(store.region!.end) }}
            ({{ store.formatTime(store.regionDuration) }})
          </span>
        </div>
      </div>

      <div
        ref="waveformContainer"
        class="waveform-container rounded-lg overflow-hidden bg-bg-primary/50"
        :class="{ 'opacity-50': !isReady && store.hasFile }"
      />

      <div class="flex items-center gap-4 mt-3">
        <span class="text-xs text-text-muted font-mono">缩放</span>
        <el-slider
          v-model="zoomValue"
          :min="1"
          :max="500"
          :step="1"
          :show-tooltip="false"
          class="flex-1"
          :disabled="!isReady"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.waveform-container {
  min-height: 160px;
}

.waveform-display :deep(.wavesurfer) {
  overflow: hidden !important;
}

.waveform-display :deep(.wavesurfer canvas) {
  border-radius: 8px;
}
</style>
