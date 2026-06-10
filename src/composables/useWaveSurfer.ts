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
  let fadeAnimationId: number | null = null
  let originalVolume = 0.8
  let isFading = false

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
    })

    wavesurfer.on('finish', () => {
      stopFadeAnimation()
      wavesurfer?.setVolume(originalVolume)
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
      store.region = { start: region.start, end: region.end }
      playRegion()
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
      stopFadeAnimation()
      wavesurfer.setVolume(originalVolume)
      wavesurfer.play()
    }
  }

  function pause() {
    if (wavesurfer) {
      stopFadeAnimation()
      wavesurfer.pause()
      wavesurfer.setVolume(originalVolume)
    }
  }

  function stop() {
    if (wavesurfer) {
      stopFadeAnimation()
      wavesurfer.stop()
      wavesurfer.setVolume(originalVolume)
    }
    store.currentTime = 0
    store.isPlaying = false
  }

  function playPause() {
    if (wavesurfer) {
      wavesurfer.playPause()
    }
  }

  function stopFadeAnimation() {
    if (fadeAnimationId !== null) {
      cancelAnimationFrame(fadeAnimationId)
      fadeAnimationId = null
    }
    isFading = false
  }

  function fadeTo(targetVolume: number, duration: number, onComplete?: () => void) {
    if (!wavesurfer) return

    stopFadeAnimation()
    isFading = true

    const startVolume = wavesurfer.getVolume()
    const startTime = performance.now()

    function animate(currentTime: number) {
      if (!wavesurfer) return

      const elapsed = (currentTime - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentVol = startVolume + (targetVolume - startVolume) * eased

      wavesurfer.setVolume(currentVol)

      if (progress < 1) {
        fadeAnimationId = requestAnimationFrame(animate)
      } else {
        isFading = false
        fadeAnimationId = null
        onComplete?.()
      }
    }

    fadeAnimationId = requestAnimationFrame(animate)
  }

  function playRegion() {
    if (!activeRegion || !wavesurfer || !store.hasRegion) return
    const { start, end } = store.region
    const regionDuration = end - start
    const fadeIn = Math.min(store.fadeInDuration, regionDuration / 2)
    const fadeOut = Math.min(store.fadeOutDuration, regionDuration / 2)
    const hasFade = fadeIn > 0 || fadeOut > 0

    if (hasFade) {
      stopFadeAnimation()
      originalVolume = store.volume
      wavesurfer.setVolume(0)
      wavesurfer.play(start, end)

      if (fadeIn > 0) {
        fadeTo(originalVolume, fadeIn)
      } else {
        wavesurfer.setVolume(originalVolume)
      }

      if (fadeOut > 0) {
        const fadeOutStartTime = end - fadeOut - start
        const checkFadeOut = () => {
          if (!wavesurfer || !store.isPlaying) return
          const currentTimeInRegion = wavesurfer.getCurrentTime() - start
          if (currentTimeInRegion >= fadeOutStartTime && !isFading) {
            fadeTo(0, fadeOut)
          } else if (currentTimeInRegion < regionDuration) {
            requestAnimationFrame(checkFadeOut)
          }
        }
        requestAnimationFrame(checkFadeOut)
      }
    } else {
      wavesurfer.play(start, end)
    }
  }

  function setVolume(vol: number) {
    store.volume = vol
    originalVolume = vol
    if (!isFading) {
      wavesurfer?.setVolume(vol)
    }
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
    stopFadeAnimation()
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
