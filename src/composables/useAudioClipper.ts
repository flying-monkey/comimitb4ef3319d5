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

function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  return encodeWAV(audioBuffer)
}

export function useAudioClipper() {
  const store = useAudioStore()

  function extractSelection() {
    if (!store.audioBuffer || !store.region) return null
    const { start, end } = store.region
    store.pushHistory(store.audioBuffer)
    const newBuffer = extractRegion(store.audioBuffer, start, end)
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
    const extracted = extractRegion(store.audioBuffer, start, end)
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
