<template>
  <div
    v-if="hasError"
    class="flex flex-col items-center justify-center gap-3 py-12 text-center"
  >
    <ExclamationTriangleIcon
      class="text-state-danger h-12 w-12"
      aria-hidden="true"
    />
    <div class="text-title">{{ fallbackTitle || $t('errorOccurred') }}</div>
    <div
      v-if="fallbackDescription"
      class="text-caption max-w-sm"
    >
      {{ fallbackDescription }}
    </div>
    <button
      class="btn-tonal mt-2"
      @click="handleRetry"
    >
      {{ $t('retry') }}
    </button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { onErrorCaptured, ref } from 'vue'

withDefaults(
  defineProps<{
    fallbackTitle?: string
    fallbackDescription?: string
  }>(),
  {
    fallbackTitle: '',
    fallbackDescription: '',
  },
)

const emit = defineEmits<{
  retry: []
}>()

const hasError = ref(false)

onErrorCaptured((err) => {
  console.error('[ErrorBoundary]', err)
  hasError.value = true
  return false
})

const handleRetry = () => {
  hasError.value = false
  emit('retry')
}
</script>
