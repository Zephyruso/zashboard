<template>
  <DialogWrapper
    v-model="dialogVisible"
    :title="$t('keyboardShortcuts')"
  >
    <div class="flex flex-col gap-3 text-sm">
      <div class="text-xs opacity-70">
        {{ $t('keyboardShortcutsTip') }}
      </div>
      <div
        v-for="item in shortcuts"
        :key="item.action"
        class="bg-base-200/60 flex items-center gap-2 rounded-lg px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="truncate">
            {{ getShortcutLabel(item) }}
          </div>
        </div>
        <input
          class="input input-sm w-28 text-center"
          :value="item.key"
          :placeholder="$t('pressAnyKey')"
          readonly
          @keydown="captureShortcut($event, item.action)"
        />
        <button
          class="btn btn-ghost btn-sm"
          @click="resetShortcut(item.action)"
        >
          {{ $t('reset') }}
        </button>
      </div>
      <div
        v-if="duplicateKeys.length"
        class="text-warning text-xs"
      >
        {{ $t('keyboardShortcutsConflict', { keys: duplicateKeys.join(', ') }) }}
      </div>
      <div class="flex justify-end">
        <button
          class="btn btn-sm"
          @click="resetAllShortcuts"
        >
          {{ $t('resetKeyboardShortcuts') }}
        </button>
      </div>
    </div>
  </DialogWrapper>

  <SettingItem
    :setting-key="GENERAL_ITEM_KEYS.keyboardShortcuts"
    :when="!isMiddleScreen"
  >
    <div class="setting-item-label">
      {{ $t('keyboardShortcuts') }}
    </div>
    <button
      class="btn btn-sm"
      @click="dialogVisible = true"
    >
      <PencilSquareIcon class="h-4 w-4" />
    </button>
  </SettingItem>
</template>

<script setup lang="ts">
import {
  getDefaultShortcutKey,
  KEYBOARD_SHORTCUT_ACTION,
  KEYBOARD_SHORTCUTS,
  PAGE_SHORTCUT_ACTION_INDEX_MAP,
  PAGE_SHORTCUT_ACTIONS,
  serializeShortcutEvent,
  useKeyboardShortcuts,
} from '@/composables/keyboard'
import SettingItem from '@/components/settings/SettingItem.vue'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { renderRoutes } from '@/helper'
import { isMiddleScreen } from '@/helper/utils'
import { keyboardShortcuts } from '@/store/settings'
import { PencilSquareIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogWrapper from '../../common/DialogWrapper.vue'

const dialogVisible = ref(false)
const { getShortcutKey } = useKeyboardShortcuts()
const { t } = useI18n()

const shortcuts = computed(() => {
  return [
    {
      action: KEYBOARD_SHORTCUT_ACTION.TOGGLE_SIDEBAR,
      defaultKey: getDefaultShortcutKey(KEYBOARD_SHORTCUT_ACTION.TOGGLE_SIDEBAR),
      key: getShortcutKey(KEYBOARD_SHORTCUT_ACTION.TOGGLE_SIDEBAR),
      label: KEYBOARD_SHORTCUTS[KEYBOARD_SHORTCUT_ACTION.TOGGLE_SIDEBAR].label,
    },
    {
      action: KEYBOARD_SHORTCUT_ACTION.TOGGLE_MANAGE_HIDDEN_GROUP,
      defaultKey: getDefaultShortcutKey(KEYBOARD_SHORTCUT_ACTION.TOGGLE_MANAGE_HIDDEN_GROUP),
      key: getShortcutKey(KEYBOARD_SHORTCUT_ACTION.TOGGLE_MANAGE_HIDDEN_GROUP),
      label: KEYBOARD_SHORTCUTS[KEYBOARD_SHORTCUT_ACTION.TOGGLE_MANAGE_HIDDEN_GROUP].label,
    },
    {
      action: KEYBOARD_SHORTCUT_ACTION.BACKEND_PREVIOUS,
      defaultKey: getDefaultShortcutKey(KEYBOARD_SHORTCUT_ACTION.BACKEND_PREVIOUS),
      key: getShortcutKey(KEYBOARD_SHORTCUT_ACTION.BACKEND_PREVIOUS),
      label: KEYBOARD_SHORTCUTS[KEYBOARD_SHORTCUT_ACTION.BACKEND_PREVIOUS].label,
    },
    {
      action: KEYBOARD_SHORTCUT_ACTION.BACKEND_NEXT,
      defaultKey: getDefaultShortcutKey(KEYBOARD_SHORTCUT_ACTION.BACKEND_NEXT),
      key: getShortcutKey(KEYBOARD_SHORTCUT_ACTION.BACKEND_NEXT),
      label: KEYBOARD_SHORTCUTS[KEYBOARD_SHORTCUT_ACTION.BACKEND_NEXT].label,
    },
    {
      action: KEYBOARD_SHORTCUT_ACTION.BACKEND_OPEN_SETTINGS,
      defaultKey: getDefaultShortcutKey(KEYBOARD_SHORTCUT_ACTION.BACKEND_OPEN_SETTINGS),
      key: getShortcutKey(KEYBOARD_SHORTCUT_ACTION.BACKEND_OPEN_SETTINGS),
      label: KEYBOARD_SHORTCUTS[KEYBOARD_SHORTCUT_ACTION.BACKEND_OPEN_SETTINGS].label,
    },
    ...PAGE_SHORTCUT_ACTIONS.filter(
      (action) => !!renderRoutes.value[PAGE_SHORTCUT_ACTION_INDEX_MAP[action]!],
    ).map((action) => ({
      action,
      defaultKey: getDefaultShortcutKey(action),
      key: getShortcutKey(action),
      label: KEYBOARD_SHORTCUTS[action].label,
    })),
  ]
})

const duplicateKeys = computed(() => {
  const counts = new Map<string, number>()
  for (const item of shortcuts.value) {
    if (!item.key) continue
    counts.set(item.key, (counts.get(item.key) || 0) + 1)
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
})

const captureShortcut = (event: KeyboardEvent, action: string) => {
  event.preventDefault()

  if (
    (event.key === 'Backspace' || event.key === 'Delete') &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey
  ) {
    keyboardShortcuts.value[action] = ''
    return
  }

  const shortcut = serializeShortcutEvent(event)
  if (!shortcut) {
    return
  }

  keyboardShortcuts.value[action] = shortcut
}

const resetShortcut = (action: string) => {
  const next = { ...keyboardShortcuts.value }
  delete next[action]
  keyboardShortcuts.value = next
}

const getShortcutLabel = (item: (typeof shortcuts.value)[number]) => {
  const pageIndex = PAGE_SHORTCUT_ACTION_INDEX_MAP[item.action as KEYBOARD_SHORTCUT_ACTION]
  if (typeof pageIndex === 'number') {
    const route = renderRoutes.value[pageIndex]
    return route ? t(item.label, { name: t(route) }) : t(item.label, { name: '' })
  }

  return t(item.label)
}

const resetAllShortcuts = () => {
  const next = { ...keyboardShortcuts.value }
  shortcuts.value.forEach((item) => {
    const action = item.action
    delete next[action]
  })
  keyboardShortcuts.value = next
}
</script>
