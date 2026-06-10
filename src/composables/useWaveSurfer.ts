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
  let fadeLoopId: number | null = null
  let originalVolume = 0.8
  let regionPlayInfo: {
    start: number
    end: number
    fadeIn: number
    fadeOut: number
    isActive: boolean
  } | null = null

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
      originalVolume = store.volume
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
      stopFadeLoop()
    })

    wavesurfer.on('finish', () => {
      resetRegionPlay()
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
      if (activeRegion && activeRegion.id !== region.id) {
        activeRegion.remove()
      }
      activeRegion = region
      store.region = { start: region.start, end: region.end }
      playRegionWithFade(region.start, region.end)
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

  function easeInOutSine(t: number): number {
    return 0.5 * (1 - Math.cos(Math.PI * t))
  }

  function stopFadeLoop() {
    if (fadeLoopId !== null) {
      cancelAnimationFrame(fadeLoopId)
      fadeLoopId = null
    }
  }

  function calculateRegionGain(
    currentTime: number,
    start: number,
    end: number,
    fadeIn: number,
    fadeOut: number
  ): number {
    const positionInRegion = currentTime - start
    const regionDuration = end - start

    if (currentTime < start || currentTime > end) {
      return 1
    }

    let gain = 1

    if (fadeIn > 0 && positionInRegion < fadeIn) {
      const t = positionInRegion / fadeIn
      gain = easeInOutSine(t)
    }

    if (fadeOut > 0 && positionInRegion > regionDuration - fadeOut) {
      const fadeOutPosition = positionInRegion - (regionDuration - fadeOut)
      const t = fadeOutPosition / fadeOut
      const fadeOutGain = 1 - easeInOutSine(t)
      gain = Math.min(gain, fadeOutGain)
    }

    return Math.max(0, Math.min(1, gain))
  }

  function startRegionFadeLoop() {
    if (!regionPlayInfo || !regionPlayInfo.isActive) return

    stopFadeLoop()

    const { start, end, fadeIn, fadeOut } = regionPlayInfo

    function tick() {
      if (!wavesurfer || !regionPlayInfo || !regionPlayInfo.isActive) {
        stopFadeLoop()
        return
      }

      if (!store.isPlaying) {
        stopFadeLoop()
        return
      }

      const currentTime = wavesurfer.getCurrentTime()

      if (currentTime >= end - 0.001) {
        stopFadeLoop()
        wavesurfer.setVolume(0)
        return
      }

      if (currentTime < start) {
        wavesurfer.setVolume(0)
      } else {
        const gain = calculateRegionGain(currentTime, start, end, fadeIn, fadeOut)
        wavesurfer.setVolume(originalVolume * gain)
      }

      fadeLoopId = requestAnimationFrame(tick)
    }

    fadeLoopId = requestAnimationFrame(tick)
  }

  function resetRegionPlay() {
    regionPlayInfo = null
    stopFadeLoop()
    if (wavesurfer) {
      wavesurfer.setVolume(originalVolume)
    }
  }

  function play() {
    if (wavesurfer) {
      resetRegionPlay()
      wavesurfer.play()
    }
  }

  function pause() {
    if (wavesurfer) {
      stopFadeLoop()
      wavesurfer.pause()
    }
  }

  function stop() {
    if (wavesurfer) {
      resetRegionPlay()
      wavesurfer.stop()
    }
    store.currentTime = 0
    store.isPlaying = false
  }

  function playPause() {
    if (!wavesurfer) return

    if (store.isPlaying) {
      pause()
    } else {
      if (regionPlayInfo && regionPlayInfo.isActive) {
        wavesurfer.play()
        startRegionFadeLoop()
      } else {
        play()
      }
    }
  }

  function playRegion() {
    if (!activeRegion || !wavesurfer || !store.hasRegion) return
    const { start, end } = store.region!
    playRegionWithFade(start, end)
  }

  function playRegionWithFade(start: number, end: number) {
    if (!wavesurfer) return

    originalVolume = store.volume

    const regionDuration = end - start
    const fadeIn = Math.min(store.fadeInDuration, regionDuration / 2)
    const fadeOut = Math.min(store.fadeOutDuration, regionDuration / 2)
    const hasFade = fadeIn > 0 || fadeOut > 0

    regionPlayInfo = {
      start,
      end,
      fadeIn,
      fadeOut,
      isActive: true,
    }

    if (hasFade) {
      wavesurfer.setVolume(0)
      wavesurfer.play(start, end)
      startRegionFadeLoop()
    } else {
      wavesurfer.setVolume(originalVolume)
      wavesurfer.play(start, end)
    }
  }

  function setVolume(vol: number) {
    store.volume = vol
    originalVolume = vol
    if (!wavesurfer) return

    if (regionPlayInfo && regionPlayInfo.isActive && store.isPlaying) {
      const { start, end, fadeIn, fadeOut } = regionPlayInfo
      const currentTime = wavesurfer.getCurrentTime()
      if (currentTime >= start && currentTime <= end) {
        const gain = calculateRegionGain(currentTime, start, end, fadeIn, fadeOut)
        wavesurfer.setVolume(vol * gain)
        return
      }
    }

    wavesurfer.setVolume(vol)
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
    seekTo(newTime)
  }

  function seekTo(time: number) {
    if (!wavesurfer) return

    if (regionPlayInfo && regionPlayInfo.isActive && store.isPlaying) {
      const { start, end, fadeIn, fadeOut } = regionPlayInfo
      if (time >= start && time <= end) {
        const gain = calculateRegionGain(time, start, end, fadeIn, fadeOut)
        wavesurfer.setVolume(originalVolume * gain)
      }
    }

    wavesurfer.setTime(time)
  }

  function clearRegion() {
    if (activeRegion) {
      activeRegion.remove()
      activeRegion = null
    }
    store.region = null
    if (regionPlayInfo?.isActive) {
      resetRegionPlay()
    }
  }

  function destroy() {
    resetRegionPlay()
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
