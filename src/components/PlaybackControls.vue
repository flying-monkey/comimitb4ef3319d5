<script setup lang="ts">
import { computed } from 'vue'
import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-vue-next'
import { useAudioStore } from '@/stores/audio'

const store = useAudioStore()

const emit = defineEmits<{
  (e: 'play-pause'): void
  (e: 'stop'): void
  (e: 'skip', seconds: number): void
  (e: 'seek', time: number): void
  (e: 'update:volume', val: number): void
  (e: 'update:playbackRate', val: number): void
}>()

const volumePercent = computed(() => Math.round(store.volume * 100))

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]

function handleVolumeChange(val: number) {
  emit('update:volume', val / 100)
}

function handleProgressChange(val: number) {
  emit('seek', val)
}
</script>

<template>
  <div class="playback-controls bg-bg-card/60 rounded-xl border border-border-custom/50 p-4 backdrop-blur-sm">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <el-slider
          :model-value="store.currentTime"
          :max="store.duration"
          :step="0.01"
          :show-tooltip="false"
          class="flex-1"
          :disabled="!store.hasFile"
          @update:model-value="handleProgressChange"
        />
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span class="font-mono text-sm text-accent tabular-nums">
            {{ store.formattedCurrentTime }}
          </span>
          <span class="text-text-muted mx-1">/</span>
          <span class="font-mono text-sm text-text-secondary tabular-nums">
            {{ store.formattedDuration }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="w-9 h-9 rounded-lg bg-bg-hover/50 border border-border-custom/50 flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/50 transition-all disabled:opacity-30"
            :disabled="!store.hasFile"
            @click="emit('skip', -5)"
          >
            <SkipBack class="w-4 h-4" />
          </button>

          <button
            class="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-bg-primary hover:shadow-glow transition-all disabled:opacity-30 disabled:hover:shadow-none"
            :disabled="!store.hasFile"
            @click="emit('play-pause')"
          >
            <Pause v-if="store.isPlaying" class="w-5 h-5" />
            <Play v-else class="w-5 h-5 ml-0.5" />
          </button>

          <button
            class="w-9 h-9 rounded-lg bg-bg-hover/50 border border-border-custom/50 flex items-center justify-center text-text-secondary hover:text-accent-warm hover:border-accent-warm/50 transition-all disabled:opacity-30"
            :disabled="!store.hasFile"
            @click="emit('stop')"
          >
            <Square class="w-4 h-4" />
          </button>

          <button
            class="w-9 h-9 rounded-lg bg-bg-hover/50 border border-border-custom/50 flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/50 transition-all disabled:opacity-30"
            :disabled="!store.hasFile"
            @click="emit('skip', 5)"
          >
            <SkipForward class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-xs text-text-muted font-mono">速度</span>
            <el-select
              :model-value="store.playbackRate"
              size="small"
              class="!w-20"
              :disabled="!store.hasFile"
              @update:model-value="emit('update:playbackRate', $event)"
            >
              <el-option
                v-for="rate in playbackRates"
                :key="rate"
                :label="rate + 'x'"
                :value="rate"
              />
            </el-select>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-text-muted font-mono">{{ volumePercent }}%</span>
            <el-slider
              :model-value="volumePercent"
              :min="0"
              :max="100"
              :show-tooltip="false"
              class="!w-20"
              @update:model-value="handleVolumeChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
