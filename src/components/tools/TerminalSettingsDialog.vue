<template>
  <DialogWrapper
    v-model="isOpen"
    :title="$t('terminalSettings')"
  >
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1 text-sm">
        <span>{{ $t('terminalThemeLight') }}</span>
        <select
          class="select select-sm select-bordered"
          v-model="terminalConfig.lightThemeName"
        >
          <option
            v-for="entry in lightThemes"
            :key="entry.name"
            :value="entry.name"
          >
            {{ entry.name }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span>{{ $t('terminalThemeDark') }}</span>
        <select
          class="select select-sm select-bordered"
          v-model="terminalConfig.darkThemeName"
        >
          <option
            v-for="entry in darkThemes"
            :key="entry.name"
            :value="entry.name"
          >
            {{ entry.name }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span>{{ $t('fontFamily') }}</span>
        <select
          class="select select-sm select-bordered"
          v-model="terminalConfig.fontFamily"
        >
          <option value="">{{ $t('defaultFont') }}</option>
          <option
            v-for="family in FONT_FAMILIES"
            :key="family"
            :value="family"
          >
            {{ family }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span>{{ $t('fontSize') }}</span>
        <select
          class="select select-sm select-bordered"
          v-model.number="terminalConfig.fontSize"
        >
          <option
            v-for="size in FONT_SIZES"
            :key="size"
            :value="size"
          >
            {{ size }}
          </option>
        </select>
      </label>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import { FONT_FAMILIES, FONT_SIZES, terminalConfig } from '@/composables/terminalConfig'
import { themesForScheme } from '@/composables/terminalThemes'

const isOpen = defineModel<boolean>()

const lightThemes = themesForScheme(false)
const darkThemes = themesForScheme(true)
</script>
