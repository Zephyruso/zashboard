<template>
  <div
    class="flex flex-col items-center justify-center gap-3 py-12 text-center"
    role="status"
  >
    <div class="empty-state-icon">
      <component
        :is="icon"
        class="h-8 w-8"
        aria-hidden="true"
      />
    </div>
    <div class="text-title">{{ title }}</div>
    <div
      v-if="description"
      class="text-caption max-w-sm"
    >
      {{ description }}
    </div>
    <button
      v-if="actionLabel"
      class="btn-tonal mt-2"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()
</script>
