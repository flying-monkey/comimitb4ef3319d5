import { useAudioStore } from '@/stores/audio'

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1
  const bitDepth = 16

  const length = audioBuffer.length
  const channelData: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch))
  }

  const dataLength = length * numChannels * (bitDepth / 8)
  const headerLength = 44
  const totalLength = headerLength + dataLength
  const buffer = new ArrayBuffer(totalLength)
  const view = new DataView(buffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, totalLength - 8, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true)
  view.setUint16(32, numChannels * (bitDepth / 8), true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function extractRegion(audioBuffer: AudioBuffer, start: number, end: number): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate
  const numChannels = audioBuffer.numberOfChannels
  const startSample = Math.floor(start * sampleRate)
  const endSample = Math.floor(end * sampleRate)
  const newLength = endSample - startSample

  const audioContext = new AudioContext()
  const newBuffer = audioContext.createBuffer(numChannels, newLength, sampleRate)

  for (let ch = 0; ch < numChannels; ch++) {
    const sourceData = audioBuffer.getChannelData(ch)
    const targetData = newBuffer.getChannelData(ch)
    for (let i = 0; i < newLength; i++) {
      targetData[i] = sourceData[startSample + i]
    }
  }

  return newBuffer
}

function removeRegion(audioBuffer: AudioBuffer, start: number, end: number): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate
  const numChannels = audioBuffer.numberOfChannels
  const startSample = Math.floor(start * sampleRate)
  const endSample = Math.floor(end * sampleRate)
  const newLength = audioBuffer.length - (endSample - startSample)

  if (newLength <= 0) {
    const audioContext = new AudioContext()
    return audioContext.createBuffer(numChannels, 1, sampleRate)
  }

  const audioContext = new AudioContext()
  const newBuffer = audioContext.createBuffer(numChannels, newLength, sampleRate)

  for (let ch = 0; ch < numChannels; ch++) {
    const sourceData = audioBuffer.getChannelData(ch)
    const targetData = newBuffer.getChannelData(ch)
    let targetIdx = 0

    for (let i = 0; i < startSample; i++) {
      targetData[targetIdx++] = sourceData[i]
    }
    for (let i = endSample; i < audioBuffer.length; i++) {
      targetData[targetIdx++] = sourceData[i]
    }
  }

  return newBuffer
}

function easeInOutSine(t: number): number {
  return 0.5 * (1 - Math.cos(Math.PI * t))
}

function applyFadeInOut(
  audioBuffer: AudioBuffer,
  fadeInSeconds: number,
  fadeOutSeconds: number
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate
  const numChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length

  const audioContext = new AudioContext()
  const newBuffer = audioContext.createBuffer(numChannels, length, sampleRate)

  const fadeInSamples = Math.floor(fadeInSeconds * sampleRate)
  const fadeOutSamples = Math.floor(fadeOutSeconds * sampleRate)

  for (let ch = 0; ch < numChannels; ch++) {
    const sourceData = audioBuffer.getChannelData(ch)
    const targetData = newBuffer.getChannelData(ch)

    for (let i = 0; i < length; i++) {
      let sample = sourceData[i]
      let gain = 1

      if (fadeInSamples > 0 && i < fadeInSamples) {
        const t = i / fadeInSamples
        gain = easeInOutSine(t)
      }

      if (fadeOutSamples > 0 && i >= length - fadeOutSamples) {
        const fadeOutIndex = i - (length - fadeOutSamples)
        const t = fadeOutIndex / fadeOutSamples
        const fadeOutGain = 1 - easeInOutSine(t)
        gain = Math.min(gain, fadeOutGain)
      }

      targetData[i] = sample * gain
    }
  }

  return newBuffer
}

function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  return encodeWAV(audioBuffer)
}

export function useAudioClipper() {
  const store = useAudioStore()

  function extractSelection() {
    if (!store.audioBuffer || !store.region) return null
    const { start, end } = store.region
    store.pushHistory(store.audioBuffer)
    let newBuffer = extractRegion(store.audioBuffer, start, end)
    if (store.fadeInDuration > 0 || store.fadeOutDuration > 0) {
      const maxFade = Math.min(store.fadeInDuration, store.fadeOutDuration)
      const halfDuration = (end - start) / 2
      const safeFadeIn = Math.min(store.fadeInDuration, halfDuration)
      const safeFadeOut = Math.min(store.fadeOutDuration, halfDuration)
      newBuffer = applyFadeInOut(newBuffer, safeFadeIn, safeFadeOut)
    }
    store.setAudioBuffer(newBuffer)
    return newBuffer
  }

  function removeSelection() {
    if (!store.audioBuffer || !store.region) return null
    store.pushHistory(store.audioBuffer)
    const { start, end } = store.region
    const newBuffer = removeRegion(store.audioBuffer, start, end)
    store.setAudioBuffer(newBuffer)
    return newBuffer
  }

  function undo() {
    const prevBuffer = store.popHistory()
    if (prevBuffer) {
      store.setAudioBuffer(prevBuffer)
      return prevBuffer
    }
    return null
  }

  function exportAudio(): Blob | null {
    if (!store.audioBuffer) return null
    return audioBufferToWavBlob(store.audioBuffer)
  }

  function exportSelection(): Blob | null {
    if (!store.audioBuffer || !store.region) return null
    const { start, end } = store.region
    let extracted = extractRegion(store.audioBuffer, start, end)
    if (store.fadeInDuration > 0 || store.fadeOutDuration > 0) {
      const halfDuration = (end - start) / 2
      const safeFadeIn = Math.min(store.fadeInDuration, halfDuration)
      const safeFadeOut = Math.min(store.fadeOutDuration, halfDuration)
      extracted = applyFadeInOut(extracted, safeFadeIn, safeFadeOut)
    }
    return audioBufferToWavBlob(extracted)
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    extractSelection,
    removeSelection,
    undo,
    exportAudio,
    exportSelection,
    downloadBlob,
  }
}
