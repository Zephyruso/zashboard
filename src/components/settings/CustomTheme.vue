<template>
  <DialogWrapper
    v-model="model"
    :title="$t('customTheme')"
  >
    <div class="divider">Color</div>
    <div class="grid grid-cols-4 gap-2">
      <div
        v-for="color in colors"
        :key="color"
      >
        <label class="flex cursor-pointer flex-col items-center gap-1">
          <div class="flex h-6 items-center justify-center text-xs">
            {{ color.replace('--color-', '') }}
          </div>
          <div
            class="border-base-content h-6 w-6 rounded border-2"
            :style="`background-color: ${customTheme[color as keyof typeof customTheme]};`"
          />
          <input
            :key="color"
            v-model="customTheme[color as keyof typeof customTheme]"
            class="h-1 w-1 opacity-0"
            type="color"
          />
        </label>
      </div>
    </div>
    <div class="divider">Radius</div>
    <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div
        v-for="radius in radiusKey"
        :key="radius"
        class="flex items-center gap-2"
      >
        {{ radius.replace('--radius-', '') }}
        <TextInput
          v-model="customTheme[radius as keyof typeof customTheme] as string"
          class="w-20"
        />
      </div>
    </div>
    <div class="divider">Size</div>
    <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div
        v-for="size in sizeKey"
        :key="size"
        class="flex items-center gap-2"
      >
        {{ size.replace('--size-', '') }}
        <TextInput
          v-model="customTheme[size as keyof typeof customTheme] as string"
          class="w-20"
        />
      </div>
      <div class="flex items-center gap-2">
        border
        <TextInput
          v-model="customTheme['--border']"
          class="w-20"
        />
      </div>
    </div>
    <div class="divider">Effect</div>
    <div class="grid grid-cols-1 gap-2 pb-12 md:grid-cols-3">
      <div>
        depth
        <input
          v-model="depth"
          class="toggle"
          type="checkbox"
        />
      </div>
      <div>
        noise
        <input
          v-model="noise"
          class="toggle"
          type="checkbox"
        />
      </div>
      <div>
        dark
        <input
          v-model="dark"
          class="toggle"
          type="checkbox"
        />
      </div>
    </div>
    <div
      class="bg-base-100 border-base-200 absolute right-0 bottom-0 left-0 flex gap-2 border-t p-2 pt-2"
    >
      <select
        v-model="applyFrom"
        class="select select-sm w-26"
      >
        <option
          v-for="opt in ALL_THEME"
          :key="opt"
          :value="opt"
        >
          {{ opt }}
        </option>
      </select>
      <button
        class="btn btn-sm"
        @click="resetCustomTheme"
      >
        {{ $t('reset') }}
      </button>
      <div class="flex-1" />
      <a
        class="btn btn-sm"
        href="https://daisyui.com/theme-generator/"
        target="_blank"
      >
        {{ $t('moreDetails') }}
      </a>
      <button
        class="btn btn-sm btn-primary"
        @click="handlerCustomThemeSave"
      >
        {{ $t('save') }}
      </button>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { ALL_THEME, DEFAULT_THEME, type THEME } from '@/constant'
import { applyCustomThemes } from '@/helper'
import { customThemes, darkTheme, defaultTheme } from '@/store/settings'
import { v4 as uuid } from 'uuid'
import { computed, nextTick, reactive, ref } from 'vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import TextInput from '../common/TextInput.vue'

const model = defineModel<boolean>('value', {
  default: false,
})

const applyFrom = ref(ALL_THEME[0])
const customTheme = reactive<THEME>({ ...(customThemes.value[0] || DEFAULT_THEME) })
const colors = computed(() => {
  return Object.keys(customTheme).filter((key) => key.startsWith('--color-'))
})
const radiusKey = computed(() => {
  return Object.keys(customTheme).filter((key) => key.startsWith('--radius-'))
})
const sizeKey = computed(() => {
  return Object.keys(customTheme).filter((key) => key.startsWith('--size-'))
})

const depth = computed({
  get: () => customTheme['--depth'] === '1',
  set: (value) => {
    customTheme['--depth'] = value ? '1' : '0'
  },
})

const noise = computed({
  get: () => customTheme['--noise'] === '1',
  set: (value) => {
    customTheme['--noise'] = value ? '1' : '0'
  },
})

const dark = computed({
  get: () => customTheme['color-scheme'] === 'dark',
  set: (value) => {
    customTheme['color-scheme'] = value ? 'dark' : 'light'
  },
})

const handlerCustomThemeSave = async () => {
  customThemes.value = [
    {
      ...customTheme,
      id: uuid(),
    } as THEME,
  ]

  defaultTheme.value = ''
  darkTheme.value = ''

  await nextTick()

  defaultTheme.value = customTheme.name
  darkTheme.value = customTheme.name
  applyCustomThemes()
}

const resetCustomTheme = () => {
  const themeElement = document.createElement('div')

  themeElement.dataset.theme = applyFrom.value
  themeElement.style.display = 'none'
  document.body.appendChild(themeElement)
  const styles = getComputedStyle(themeElement)

  Object.keys(DEFAULT_THEME).forEach((key) => {
    const value = styles.getPropertyValue(key).trim()

    if (value) {
      customTheme[key] = value
    }
  })
  themeElement.remove()
  handlerCustomThemeSave()
}
</script>
