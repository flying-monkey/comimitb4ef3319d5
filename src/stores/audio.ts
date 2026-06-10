import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type AudioSource =
  | { type: 'file'; file: File }
  | { type: 'url'; url: string }
  | null

export const useAudioStore = defineStore('audio', () => {
  const file = ref<File | null>(null)
  const fileName = ref('')
  const duration = ref(0)
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const playbackRate = ref(1)
  const volume = ref(0.8)
  const zoomLevel = ref(1)
  const region = ref<{ start: number; end: number } | null>(null)
  const audioBuffer = ref<AudioBuffer | null>(null)
  const clipHistory = ref<AudioBuffer[]>([])
  const exportFormat = ref<'wav' | 'mp3'>('wav')
  const isProcessing = ref(false)
  const pendingSource = ref<AudioSource>(null)
  const fadeInDuration = ref(0)
  const fadeOutDuration = ref(0)

  const hasFile = computed(() => !!file.value)
  const hasRegion = computed(() => !!region.value)
  const regionDuration = computed(() => {
    if (!region.value) return 0
    return region.value.end - region.value.start
  })
  const canUndo = computed(() => clipHistory.value.length > 0)
  const formattedCurrentTime = computed(() => formatTime(currentTime.value))
  const formattedDuration = computed(() => formatTime(duration.value))

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  function setFile(f: File) {
    file.value = f
    fileName.value = f.name.replace(/\.[^/.]+$/, '')
  }

  function setSourceFromFile(f: File) {
    setFile(f)
    region.value = null
    clipHistory.value = []
    pendingSource.value = { type: 'file', file: f }
  }

  function setSourceFromUrl(url: string) {
    region.value = null
    pendingSource.value = { type: 'url', url }
  }

  function consumeSource(): AudioSource {
    const src = pendingSource.value
    pendingSource.value = null
    return src
  }

  function setAudioBuffer(buf: AudioBuffer) {
    audioBuffer.value = buf
    duration.value = buf.duration
  }

  function pushHistory(buf: AudioBuffer) {
    clipHistory.value.push(buf)
  }

  function popHistory(): AudioBuffer | undefined {
    return clipHistory.value.pop()
  }

  function reset() {
    file.value = null
    fileName.value = ''
    duration.value = 0
    currentTime.value = 0
    isPlaying.value = false
    playbackRate.value = 1
    volume.value = 0.8
    zoomLevel.value = 1
    region.value = null
    audioBuffer.value = null
    clipHistory.value = []
    exportFormat.value = 'wav'
    isProcessing.value = false
    pendingSource.value = null
    fadeInDuration.value = 0
    fadeOutDuration.value = 0
  }

  return {
    file,
    fileName,
    duration,
    currentTime,
    isPlaying,
    playbackRate,
    volume,
    zoomLevel,
    region,
    audioBuffer,
    clipHistory,
    exportFormat,
    isProcessing,
    pendingSource,
    fadeInDuration,
    fadeOutDuration,
    hasFile,
    hasRegion,
    regionDuration,
    canUndo,
    formattedCurrentTime,
    formattedDuration,
    formatTime,
    setFile,
    setSourceFromFile,
    setSourceFromUrl,
    consumeSource,
    setAudioBuffer,
    pushHistory,
    popHistory,
    reset,
  }
})
