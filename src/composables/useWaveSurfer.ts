import { ref, watch, onUnmounted, type Ref } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { useAudioStore } from '@/stores/audio'

export function useWaveSurfer(containerRef: Ref<HTMLElement | null>) {
  const store = useAudioStore()
  let wavesurfer: WaveSurfer | null = null
  let regionsPlugin: RegionsPlugin | null = null
  let activeRegion: any = null
  const isReady = ref(false)

  function init() {
    if (!containerRef.value) return

    if (wavesurfer) {
      wavesurfer.destroy()
      wavesurfer = null
      regionsPlugin = null
      activeRegion = null
    }

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
      plugins: [regionsPlugin],
    })

    wavesurfer.on('ready', () => {
      isReady.value = true
      const duration = wavesurfer!.getDuration()
      store.duration = duration
      
      const decodedData = wavesurfer!.getDecodedData()
      if (decodedData) {
        store.setAudioBuffer(decodedData)
      }
      
      wavesurfer!.setVolume(store.volume)
      wavesurfer!.setPlaybackRate(store.playbackRate)
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

    wavesurfer.on('finish', () => {
      store.isPlaying = false
      store.currentTime = store.duration
    })

    wavesurfer.on('error', (err) => {
      console.error('WaveSurfer error:', err)
    })

    enableRegionCreation()
  }

  function enableRegionCreation() {
    if (!regionsPlugin) return

    regionsPlugin.enableDragSelection({
      color: 'rgba(255, 107, 53, 0.3)',
    })

    regionsPlugin.on('region-created', (region: any) => {
      if (activeRegion && activeRegion.id !== region.id) {
        activeRegion.remove()
      }
      activeRegion = region
      store.region = { start: region.start, end: region.end }
    })

    regionsPlugin.on('region-updated', (region: any) => {
      activeRegion = region
      store.region = { start: region.start, end: region.end }
    })

    regionsPlugin.on('region-clicked', (region: any, e: MouseEvent) => {
      e.stopPropagation()
      wavesurfer?.play(region.start, region.end)
    })
  }

  function loadFile(file: File) {
    if (!wavesurfer) {
      init()
    }
    if (!store.file) {
      store.setFile(file)
    }
    store.region = null
    store.currentTime = 0
    store.isPlaying = false
    activeRegion = null
    isReady.value = false
    wavesurfer!.loadBlob(file)
  }

  function loadBlob(blob: Blob) {
    if (!wavesurfer) return
    store.region = null
    activeRegion = null
    isReady.value = false
    wavesurfer.loadBlob(blob)
  }

  function loadUrl(url: string) {
    if (!wavesurfer) return
    store.region = null
    store.currentTime = 0
    store.isPlaying = false
    activeRegion = null
    isReady.value = false
    wavesurfer.load(url)
  }

  function play() {
    if (wavesurfer) {
      wavesurfer.play()
    }
  }

  function pause() {
    if (wavesurfer) {
      wavesurfer.pause()
    }
  }

  function stop() {
    if (wavesurfer) {
      wavesurfer.stop()
    }
    store.currentTime = 0
    store.isPlaying = false
  }

  function playPause() {
    if (wavesurfer) {
      wavesurfer.playPause()
    }
  }

  function playRegion() {
    if (!activeRegion || !wavesurfer || !store.hasRegion) return
    const { start, end } = store.region
    wavesurfer.play(start, end)
  }

  function setVolume(vol: number) {
    store.volume = vol
    wavesurfer?.setVolume(vol)
  }

  function setPlaybackRate(rate: number) {
    store.playbackRate = rate
    wavesurfer?.setPlaybackRate(rate)
  }

  function setZoom(level: number) {
    store.zoomLevel = level
    wavesurfer?.zoom(level)
  }

  function skip(seconds: number) {
    if (!wavesurfer || !store.duration) return
    const newTime = Math.max(0, Math.min(store.duration, store.currentTime + seconds))
    wavesurfer.setTime(newTime)
  }

  function seekTo(time: number) {
    if (wavesurfer) {
      wavesurfer.setTime(time)
    }
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

  watch(() => store.region, (newRegion) => {
    if (!newRegion && activeRegion) {
      activeRegion.remove()
      activeRegion = null
    }
  })

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
