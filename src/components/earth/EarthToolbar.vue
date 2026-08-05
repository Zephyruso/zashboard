<script setup lang="ts">
import type { OriginOption, OriginSource } from '@/composables/useEarthRoutes'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

defineProps<{
  activeConnectionCount: number
  isOriginLoading: boolean
  locatedConnections: number
  originFailed: boolean
  originOptions: OriginOption[]
  originOptionsLoading: boolean
}>()

const originSource = defineModel<OriginSource>('originSource', { required: true })
defineEmits<{ refresh: [] }>()
</script>

<template>
  <section
    class="earth-toolbar base-container bg-base-100/82 absolute top-3 left-3 z-10 flex flex-col gap-2 p-2.5 shadow-lg backdrop-blur-xl"
  >
    <div class="flex items-center gap-2">
      <span class="text-base-content/55 pl-1 text-xs font-medium">
        {{ $t('earthOrigin') }}
      </span>
      <select
        v-model="originSource"
        class="select select-sm min-w-48 flex-1"
        :aria-label="$t('earthOrigin')"
        :disabled="!originOptions.length"
      >
        <option
          v-if="!originOptions.length"
          value=""
        >
          {{ originOptionsLoading ? $t('getting') : $t('testFailed') }}
        </option>
        <option
          v-for="option in originOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-circle"
        :aria-label="$t('refresh')"
        :title="$t('refresh')"
        @click="$emit('refresh')"
      >
        <ArrowPathIcon
          class="size-4"
          :class="isOriginLoading && 'animate-spin'"
        />
      </button>
    </div>

    <div class="text-base-content/55 flex items-center gap-3 px-1 text-[0.6875rem]">
      <span class="flex items-center gap-1.5">
        <i class="bg-primary size-1.5 rounded-full" />
        {{ $t('earthRelay') }}
      </span>
      <span class="flex items-center gap-1.5">
        <i class="bg-secondary size-1.5 rounded-full" />
        {{ $t('earthDestination') }}
      </span>
      <span class="flex items-center gap-1.5">
        <i class="bg-accent size-1.5 rounded-full" />
        {{ $t('direct') }}
      </span>
      <span
        class="badge badge-ghost badge-sm ml-auto"
        :class="originFailed && 'badge-error'"
        :title="$t('earthLocatedConnections')"
      >
        {{ originFailed ? $t('testFailed') : `${locatedConnections}/${activeConnectionCount}` }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.earth-toolbar {
  width: min(24rem, calc(100% - 5rem));
  border: 1px solid color-mix(in srgb, var(--color-base-content) 9%, transparent);
}

@media (max-width: 767px) {
  .earth-toolbar {
    top: max(0.75rem, env(safe-area-inset-top));
    left: 0.75rem;
    width: calc(100% - 4.75rem);
  }
}
</style>
