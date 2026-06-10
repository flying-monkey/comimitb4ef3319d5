import { ref, onUnmounted, type Ref } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { useAudioStore } from '@/stores/audio'

export function useWaveSurfer(containerRef: Ref<HTMLElement | null>) {
  const store = useAudioStore()
  let wavesurfer: WaveSurfer | null = null
  let regionsPlugin: RegionsPlugin | null = null
  let activeRegion: ReturnType<RegionsPlugin['addRegion']> | null = null
  const isReady = ref(false)

  function init() {
    if (!containerRef.value) return

    regionsPlugin = RegionsPlugin.create()

    wavesurfer = WaveSurfer.create({
      container: containerRef.value,
      waveColor: 'rgba(0, 212, 255, 0.4)',
      progressColor: 'rgba(123, 47, 247, 0.6)',
      cursorColor: '#00d4ff',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 160,
      normalize: true,
      backend: 'WebAudio',
      plugins: [regionsPlugin],
    })

    wavesurfer.on('ready', () => {
      isReady.value = true
      const buffer = wavesurfer!.getDecodedData()
      if (buffer) {
        store.setAudioBuffer(buffer)
      }
      wavesurfer!.setVolume(store.volume)
    })

    wavesurfer.on('timeupdate', (time) => {
      store.currentTime = time
    })

    wavesurfer.on('play', () => {
      store.isPlaying = true
    })

    wavesurfer.on('pause', () => {
      store.isPlaying = false
    })

    wavesurfer.on('interaction', (newTime) => {
      if (activeRegion && store.region) {
        const { start, end } = store.region
        if (newTime >= start && newTime <= end) {
          wavesurfer!.setTime(start)
          wavesurfer!.play()
          return
        }
      }
    })

    enableRegionCreation()
  }

  function enableRegionCreation() {
    if (!regionsPlugin) return

    regionsPlugin.enableDragSelection({
      color: 'rgba(255, 107, 53, 0.2)',
    })

    regionsPlugin.on('region-created', (region) => {
      if (activeRegion) {
        activeRegion.remove()
      }
      activeRegion = region
      store.region = { start: region.start, end: region.end }
    })

    regionsPlugin.on('region-updated', (region) => {
      activeRegion = region
      store.region = { start: region.start, end: region.end }
    })

    regionsPlugin.on('region-clicked', (region, e) => {
      e.stopPropagation()
      const { start, end } = region
      wavesurfer!.play(start, end)
    })
  }

  function loadFile(file: File) {
    if (!wavesurfer) {
      init()
    }
    store.setFile(file)
    isReady.value = false
    wavesurfer!.loadBlob(file)
  }

  function loadBlob(blob: Blob) {
    if (!wavesurfer) return
    isReady.value = false
    wavesurfer.loadBlob(blob)
  }

  function loadUrl(url: string) {
    if (!wavesurfer) return
    isReady.value = false
    wavesurfer.load(url)
  }

  function play() {
    wavesurfer?.play()
  }

  function pause() {
    wavesurfer?.pause()
  }

  function stop() {
    wavesurfer?.stop()
    store.currentTime = 0
    store.isPlaying = false
  }

  function playPause() {
    wavesurfer?.playPause()
  }

  function playRegion() {
    if (!activeRegion || !wavesurfer) return
    const { start, end } = activeRegion
    wavesurfer.play(start, end)
  }

  function setVolume(vol: number) {
    store.volume = vol
    wavesurfer?.setVolume(vol)
  }

  function setPlaybackRate(rate: number) {
    store.playbackRate = rate
    if (wavesurfer) {
      wavesurfer.setPlaybackRate(rate)
    }
  }

  function setZoom(level: number) {
    store.zoomLevel = level
    wavesurfer?.zoom(level)
  }

  function skip(seconds: number) {
    if (!wavesurfer) return
    const newTime = Math.max(0, Math.min(store.duration, store.currentTime + seconds))
    wavesurfer.setTime(newTime)
  }

  function seekTo(time: number) {
    wavesurfer?.setTime(time)
  }

  function clearRegion() {
    if (activeRegion) {
      activeRegion.remove()
      activeRegion = null
    }
    store.region = null
  }

  function destroy() {
    wavesurfer?.destroy()
    wavesurfer = null
    regionsPlugin = null
    activeRegion = null
    isReady.value = false
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    wavesurfer: () => wavesurfer,
    isReady,
    init,
    loadFile,
    loadBlob,
    loadUrl,
    play,
    pause,
    stop,
    playPause,
    playRegion,
    setVolume,
    setPlaybackRate,
    setZoom,
    skip,
    seekTo,
    clearRegion,
    destroy,
  }
}
