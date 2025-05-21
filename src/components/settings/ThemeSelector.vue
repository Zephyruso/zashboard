<template>
  <div class="dropdown join-item input input-sm inline w-48 p-0">
    <div
      tabindex="0"
      role="button"
      class="flex h-full w-full cursor-pointer items-center indent-4"
    >
      {{ theme }}
    </div>
    <ul
      class="dropdown-content card mt-2 h-96 w-48 overflow-y-auto overscroll-contain shadow-2xl"
      tabindex="0"
    >
      <li
        v-for="themeName in themes"
        :key="themeName"
        @click="theme = themeName"
        class="hover:bg-base-200 flex cursor-pointer items-center gap-2 p-2"
        :data-theme="themeName"
      >
        <div class="bg-primary rounded-field h-3 w-5 shadow"></div>
        <span :class="{ 'font-bold': theme === themeName }">{{ themeName }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ALL_THEME } from '@/constant'
import { customThemes } from '@/store/settings'
import { computed } from 'vue'

const theme = defineModel<string>('value', {
  type: String,
  required: true,
})

const themes = computed(() => {
  if (customThemes.value.length) {
    return [...ALL_THEME, ...customThemes.value.map((theme) => theme.name)]
  }

  return ALL_THEME
})
</script>
