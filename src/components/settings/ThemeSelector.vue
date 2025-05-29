<template>
  <div
    class="join-item input input-sm inline w-48 p-0"
    @click="handlerDropdown"
  >
    <div class="flex h-full w-full cursor-pointer items-center indent-4">
      {{ theme }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ALL_THEME } from '@renderer/constant'
import { useTooltip } from '@renderer/helper/tooltip'
import { customThemes } from '@renderer/store/settings'
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

const { showTip, hideTip } = useTooltip()
const handlerDropdown = (e: Event) => {
  const themeCotainer = document.createElement('div')

  themeCotainer.className = 'card h-96 w-48 overflow-y-auto overscroll-contain shadow-2xl'

  for (const themeName of themes.value) {
    const item = document.createElement('div')
    const primary = document.createElement('div')
    const label = document.createElement('span')

    item.dataset.theme = themeName

    item.className = 'flex cursor-pointer items-center gap-2 p-2 bg-base-100 hover:bg-base-200'
    primary.className = 'h-3 w-5 shadow rounded-field bg-primary'

    label.textContent = themeName

    item.append(primary)
    item.append(label)

    item.addEventListener('click', () => {
      theme.value = themeName
      hideTip()
    })

    themeCotainer.append(item)
  }

  showTip(e, themeCotainer, {
    theme: 'transparent',
    placement: 'bottom-start',
    trigger: 'click',
    appendTo: document.body,
    interactive: true,
    arrow: false,
  })
}
</script>
