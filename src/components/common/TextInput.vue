<template>
  <label
    ref="anchorRef"
    :class="['input input-sm', { 'pe-1': clearable }]"
  >
    <input
      v-model="inputValue"
      ref="inputRef"
      type="text"
      :class="inputClass"
      :placeholder="placeholder || ''"
      :name="name || ''"
      :autocomplete="autocomplete || ''"
      :role="menus?.length ? 'combobox' : undefined"
      :aria-expanded="menus?.length ? isMenuOpen : undefined"
      :aria-controls="menus?.length ? listboxId : undefined"
      :aria-activedescendant="
        isMenuOpen && activeMenuIndex >= 0 ? optionId(activeMenuIndex) : undefined
      "
      aria-autocomplete="list"
      @click="toggleMenu"
      @blur="commitMenuHistory"
      @keydown="handleInputKeydown"
      @input="handleInput"
      @change="emits('change', inputValue || '')"
    />
    <button
      v-if="clearable"
      type="button"
      class="btn btn-ghost btn-circle btn-xs h-5 min-h-5 w-5 shrink-0 p-0"
      @pointerdown="menuHistoryLimit && $event.preventDefault()"
      @click="clearInput"
    >
      <XMarkIcon class="h-3 w-3" />
    </button>

    <Teleport
      v-if="isMounted"
      to="#app-content"
    >
      <Transition name="floating-menu">
        <div
          v-if="isMenuOpen"
          :id="listboxId"
          ref="menuRef"
          role="listbox"
          class="floating-menu-panel"
          :style="panelStyle"
        >
          <div
            v-for="(item, index) in menus"
            :id="optionId(index)"
            :key="item"
            role="option"
            :aria-selected="inputValue === item"
            class="floating-menu-option"
            :class="[
              index === activeMenuIndex ? 'bg-base-200' : '',
              inputValue === item ? 'text-primary font-medium' : '',
            ]"
            @pointermove="activeMenuIndex = index"
            @pointerdown.prevent
            @click="selectMenuItem(item)"
          >
            <span class="min-w-0 flex-1 truncate">{{ item }}</span>
            <CheckIcon
              v-if="inputValue === item"
              class="ml-2 h-4 w-4 flex-none"
            />
            <button
              v-if="menusDeleteable"
              type="button"
              class="btn btn-ghost btn-circle btn-xs ml-2 h-5 min-h-5 w-5 flex-none p-0"
              :aria-label="`${$t('delete')}: ${item}`"
              @pointerdown.prevent
              @click.stop="deleteMenuItem(item)"
            >
              <XMarkIcon class="h-3 w-3" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </label>
</template>

<script lang="ts" setup>
import { useFloatingMenu } from '@/composables/use-floating-menu'
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { nextTick, onMounted, ref, useId, watch } from 'vue'

const emits = defineEmits<{
  (e: 'input', value: string): void
  (e: 'change', value: string): void
  (e: 'update:menus', value: string[]): void
}>()

const props = defineProps<{
  placeholder?: string
  name?: string
  autocomplete?: string
  clearable?: boolean
  inputClass?: string
  menus?: string[]
  menusDeleteable?: boolean
  menuHistoryLimit?: number
}>()

const inputValue = defineModel<string>()
const anchorRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()
const menuRef = ref<HTMLDivElement>()
const isMounted = ref(false)
const isMenuOpen = ref(false)
const activeMenuIndex = ref(-1)
let hasPendingHistoryEntry = false
const id = useId().replace(/[^\w-]/g, '')
const listboxId = `text-input-listbox-${id}`
const { close, panelStyle, remeasure } = useFloatingMenu(anchorRef, menuRef, isMenuOpen, {
  maximumHeight: 256,
})

const optionId = (index: number) => `${listboxId}-option-${index}`

const openMenu = () => {
  if (!props.menus?.length || isMenuOpen.value) return
  const selectedIndex = props.menus.indexOf(inputValue.value || '')
  activeMenuIndex.value = selectedIndex >= 0 ? selectedIndex : 0
  isMenuOpen.value = true
  nextTick(() => {
    menuRef.value
      ?.querySelector<HTMLElement>(`#${optionId(activeMenuIndex.value)}`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

const toggleMenu = () => (isMenuOpen.value ? close() : openMenu())

const moveActive = (direction: 1 | -1) => {
  const length = props.menus?.length ?? 0
  if (!length) return
  activeMenuIndex.value = (activeMenuIndex.value + direction + length) % length
  nextTick(() => {
    menuRef.value
      ?.querySelector<HTMLElement>(`#${optionId(activeMenuIndex.value)}`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

const saveMenuHistory = (value: string) => {
  const limit = props.menuHistoryLimit
  const query = value.trim()
  if (!limit || !query) return

  const history = (props.menus ?? []).filter((item) => item.trim() !== query)
  emits('update:menus', [query, ...history].slice(0, limit))
}

const commitMenuHistory = () => {
  if (!hasPendingHistoryEntry) return

  hasPendingHistoryEntry = false
  saveMenuHistory(inputRef.value?.value ?? '')
}

const selectMenuItem = (item: string) => {
  hasPendingHistoryEntry = false
  inputValue.value = item
  close()
  saveMenuHistory(item)
  inputRef.value?.focus()
}

const deleteMenuItem = (item: string) => {
  if (item.trim() === inputRef.value?.value.trim()) hasPendingHistoryEntry = false

  const nextMenus = (props.menus ?? []).filter((menu) => menu !== item)
  emits('update:menus', nextMenus)
  if (!nextMenus.length) {
    close()
    return
  }
  activeMenuIndex.value = Math.min(activeMenuIndex.value, nextMenus.length - 1)
  remeasure()
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return
  if (event.key === 'Enter' && !isMenuOpen.value) commitMenuHistory()
  if (!props.menus?.length) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (isMenuOpen.value) moveActive(1)
      else openMenu()
      break
    case 'ArrowUp':
      event.preventDefault()
      if (isMenuOpen.value) moveActive(-1)
      else openMenu()
      break
    case 'Enter': {
      if (!isMenuOpen.value) return
      const item = props.menus?.[activeMenuIndex.value]
      if (!item) return
      event.preventDefault()
      event.stopPropagation()
      selectMenuItem(item)
      break
    }
    case 'Escape':
      if (!isMenuOpen.value) return
      event.preventDefault()
      event.stopPropagation()
      close()
      break
    case 'Tab':
      close()
  }
}

const handleInput = () => {
  if (props.menuHistoryLimit) hasPendingHistoryEntry = true
  emits('input', inputValue.value || '')
  close()
}

const clearInput = () => {
  hasPendingHistoryEntry = false
  inputValue.value = ''
  close()
}

watch(
  () => props.menus,
  (menus) => {
    if (!menus?.length) close()
    else if (isMenuOpen.value) remeasure()
  },
  { deep: true },
)

onMounted(() => (isMounted.value = true))
</script>
