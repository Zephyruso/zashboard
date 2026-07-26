<template>
  <div
    class="border-base-300 bg-base-200/95 flex w-full flex-none items-center gap-1.5 overflow-x-auto border-t px-2.5 py-1 backdrop-blur-lg"
    style="padding-bottom: calc(0.25rem + env(safe-area-inset-bottom, 0px))"
    role="toolbar"
    :aria-label="$t('terminalKeys')"
  >
    <template
      v-for="(key, index) in DEFAULT_KEYS"
      :key="index"
    >
      <span
        v-if="key.kind === 'divider'"
        class="bg-base-content/30 mx-0.5 h-1.5 w-1.5 flex-none rounded-full"
        aria-hidden="true"
      />
      <button
        v-else-if="key.kind === 'modifier'"
        type="button"
        :class="[BASE_KEY, modClass(modifiers[key.mod])]"
        :aria-pressed="modifiers[key.mod] !== 'off'"
        @pointerdown.prevent
        @click="emit('modifier', key.mod)"
      >
        {{ key.label }}
      </button>
      <button
        v-else-if="key.kind === 'paste'"
        type="button"
        :class="BASE_KEY"
        :aria-label="$t('paste')"
        @pointerdown.prevent
        @click="emit('paste')"
      >
        <ClipboardIcon class="h-4 w-4" />
      </button>
      <button
        v-else-if="key.kind === 'text'"
        type="button"
        :class="[BASE_KEY, 'font-mono']"
        :aria-label="key.char"
        @pointerdown.prevent
        @click="emit('key', key)"
      >
        {{ key.char }}
      </button>
      <button
        v-else
        type="button"
        :class="BASE_KEY"
        :aria-label="key.label"
        @pointerdown.prevent
        @click="emit('key', key)"
      >
        {{ key.label }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  DEFAULT_KEYS,
  type ModKey,
  type Modifiers,
  type ModState,
  type TerminalKey,
} from '@/composables/terminalKeys'
import { ClipboardIcon } from '@heroicons/vue/24/outline'

defineProps<{ modifiers: Modifiers }>()
const emit = defineEmits<{ modifier: [mod: ModKey]; key: [key: TerminalKey]; paste: [] }>()

const BASE_KEY =
  'bg-base-300 text-base-content flex h-9 min-w-9 flex-none items-center justify-center rounded-md px-2 text-sm active:bg-primary/30'

const modClass = (state: ModState): string => {
  if (state === 'locked') return 'bg-primary! text-primary-content!'
  if (state === 'armed') return 'bg-primary/20! ring-primary ring-[1.5px] ring-inset'
  return ''
}
</script>
