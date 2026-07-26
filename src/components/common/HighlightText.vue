<template>
  <template
    v-for="(part, index) in parts"
    :key="index"
  >
    <mark
      v-if="part.matched"
      class="search-highlight"
      :style="part.style"
    >
      {{ part.text }}
    </mark>
    <span
      v-else-if="part.style"
      :style="part.style"
    >
      {{ part.text }}
    </span>
    <template v-else>{{ part.text }}</template>
  </template>
</template>

<script setup lang="ts">
import { parseAnsiText } from '@/helper/ansi'
import { getSearchTextParts } from '@/helper/search'
import type { CSSProperties } from 'vue'
import { computed } from 'vue'

type HighlightTextPart = {
  text: string
  matched: boolean
  style?: CSSProperties
}

const props = withDefaults(
  defineProps<{
    text: string
    filter: string
    ansi?: boolean
  }>(),
  {
    ansi: false,
  },
)

const parts = computed<HighlightTextPart[]>(() => {
  if (!props.ansi) return getSearchTextParts(props.text, props.filter)

  return parseAnsiText(props.text).flatMap<HighlightTextPart>((segment) =>
    getSearchTextParts(segment.text, props.filter).map((part) => ({
      ...part,
      style: segment.style,
    })),
  )
})
</script>
