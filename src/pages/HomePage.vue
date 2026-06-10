<script setup lang="ts">
import { ref } from 'vue'
import { Headphones } from 'lucide-vue-next'
import { useAudioStore } from '@/stores/audio'
import { useAudioClipper } from '@/composables/useAudioClipper'
import AudioUploader from '@/components/AudioUploader.vue'
import WaveformDisplay from '@/components/WaveformDisplay.vue'
import PlaybackControls from '@/components/PlaybackControls.vue'
import ClipToolbar from '@/components/ClipToolbar.vue'
import ExportPanel from '@/components/ExportPanel.vue'

const store = useAudioStore()
const clipper = useAudioClipper()
const waveformRef = ref<InstanceType<typeof WaveformDisplay> | null>(null)
let lastObjectUrl: string | null = null

function handleFileSelected(file: File) {
  store.setSourceFromFile(file)
}

function handleAudioUpdated() {
  const blob = clipper.exportAudio()
  if (blob) {
    if (lastObjectUrl) {
      URL.revokeObjectURL(lastObjectUrl)
    }
    lastObjectUrl = URL.createObjectURL(blob)
    store.setSourceFromUrl(lastObjectUrl)
  }
}

function handlePlayPause() {
  waveformRef.value?.playPause()
}

function handleStop() {
  waveformRef.value?.stop()
}

function handleSkip(seconds: number) {
  waveformRef.value?.skip(seconds)
}

function handleSeek(time: number) {
  waveformRef.value?.seekTo(time)
}

function handleVolumeChange(val: number) {
  store.volume = val
}

function handlePlaybackRateChange(val: number) {
  store.playbackRate = val
}

function handlePlayRegion() {
  waveformRef.value?.playRegion()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
    <header class="border-b border-border-custom/30 backdrop-blur-md bg-bg-primary/60 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Headphones class="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 class="text-lg font-mono font-semibold text-text-primary tracking-tight">Audio Clipper</h1>
              <p class="text-[10px] text-text-muted font-mono tracking-widest uppercase">音频剪辑器</p>
            </div>
          </div>
          <div class="flex items-center gap-2 text-xs font-mono text-text-muted">
            <div class="w-2 h-2 rounded-full" :class="store.hasFile ? 'bg-green-400 animate-pulse' : 'bg-text-muted'" />
            <span>{{ store.hasFile ? '已加载' : '待上传' }}</span>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <transition name="fade" mode="out-in">
        <AudioUploader
          v-if="!store.hasFile"
          @file-selected="handleFileSelected"
        />
        <div v-else class="space-y-5">
          <WaveformDisplay ref="waveformRef" />

          <PlaybackControls
            @play-pause="handlePlayPause"
            @stop="handleStop"
            @skip="handleSkip"
            @seek="handleSeek"
            @update:volume="handleVolumeChange"
            @update:playback-rate="handlePlaybackRateChange"
          />

          <ClipToolbar
            @audio-updated="handleAudioUpdated"
            @play-region="handlePlayRegion"
          />

          <ExportPanel />
        </div>
      </transition>

      <div v-if="!store.hasFile" class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-bg-card/40 rounded-xl border border-border-custom/30 p-5">
          <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
            <span class="text-xl">🎵</span>
          </div>
          <h3 class="text-sm font-medium text-text-primary mb-1">上传音频</h3>
          <p class="text-xs text-text-muted leading-relaxed">支持 MP3、WAV、OGG、FLAC 等常见格式，拖拽或点击上传</p>
        </div>
        <div class="bg-bg-card/40 rounded-xl border border-border-custom/30 p-5">
          <div class="w-10 h-10 rounded-lg bg-accent-secondary/10 flex items-center justify-center mb-3">
            <span class="text-xl">✂️</span>
          </div>
          <h3 class="text-sm font-medium text-text-primary mb-1">精确剪辑</h3>
          <p class="text-xs text-text-muted leading-relaxed">波形可视化，拖拽选择区域，一键提取或删除片段</p>
        </div>
        <div class="bg-bg-card/40 rounded-xl border border-border-custom/30 p-5">
          <div class="w-10 h-10 rounded-lg bg-accent-warm/10 flex items-center justify-center mb-3">
            <span class="text-xl">💾</span>
          </div>
          <h3 class="text-sm font-medium text-text-primary mb-1">导出下载</h3>
          <p class="text-xs text-text-muted leading-relaxed">编辑完成后导出为 WAV 格式，自定义文件名一键下载</p>
        </div>
      </div>
    </main>

    <footer class="border-t border-border-custom/20 mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-text-muted font-mono">
        Audio Clipper · 纯浏览器端音频剪辑 · 所有处理均在本地完成
      </div>
    </footer>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
