import { renderRoutes } from '@/helper'
import { showNotification } from '@/helper/notification'
import { getLabelFromBackend } from '@/helper/utils'
import { isSidebarCollapsed, keyboardShortcuts } from '@/store/settings'
import { activeBackend, switchActiveBackend } from '@/store/setup'
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export enum KEYBOARD_SHORTCUT_ACTION {
  TOGGLE_SIDEBAR = 'sidebar:toggle',
  BACKEND_PREVIOUS = 'backend:previous',
  BACKEND_NEXT = 'backend:next',
  PAGE_1 = 'page:1',
  PAGE_2 = 'page:2',
  PAGE_3 = 'page:3',
  PAGE_4 = 'page:4',
  PAGE_5 = 'page:5',
  PAGE_6 = 'page:6',
}

export const PAGE_SHORTCUT_ACTIONS = [
  KEYBOARD_SHORTCUT_ACTION.PAGE_1,
  KEYBOARD_SHORTCUT_ACTION.PAGE_2,
  KEYBOARD_SHORTCUT_ACTION.PAGE_3,
  KEYBOARD_SHORTCUT_ACTION.PAGE_4,
  KEYBOARD_SHORTCUT_ACTION.PAGE_5,
  KEYBOARD_SHORTCUT_ACTION.PAGE_6,
] as const

export const PAGE_SHORTCUT_ACTION_INDEX_MAP: Partial<
  Record<KEYBOARD_SHORTCUT_ACTION, number | null>
> = {
  [KEYBOARD_SHORTCUT_ACTION.PAGE_1]: 0,
  [KEYBOARD_SHORTCUT_ACTION.PAGE_2]: 1,
  [KEYBOARD_SHORTCUT_ACTION.PAGE_3]: 2,
  [KEYBOARD_SHORTCUT_ACTION.PAGE_4]: 3,
  [KEYBOARD_SHORTCUT_ACTION.PAGE_5]: 4,
  [KEYBOARD_SHORTCUT_ACTION.PAGE_6]: 5,
}

export const KEYBOARD_SHORTCUTS = {
  [KEYBOARD_SHORTCUT_ACTION.TOGGLE_SIDEBAR]: {
    defaultKey: 'B',
    label: 'toggleSidebar',
  },
  [KEYBOARD_SHORTCUT_ACTION.BACKEND_PREVIOUS]: {
    defaultKey: 'P',
    label: 'switchToPreviousBackend',
  },
  [KEYBOARD_SHORTCUT_ACTION.BACKEND_NEXT]: {
    defaultKey: 'N',
    label: 'switchToNextBackend',
  },
  [KEYBOARD_SHORTCUT_ACTION.PAGE_1]: {
    defaultKey: '1',
    label: 'keyboardShortcutPageName',
  },
  [KEYBOARD_SHORTCUT_ACTION.PAGE_2]: {
    defaultKey: '2',
    label: 'keyboardShortcutPageName',
  },
  [KEYBOARD_SHORTCUT_ACTION.PAGE_3]: {
    defaultKey: '3',
    label: 'keyboardShortcutPageName',
  },
  [KEYBOARD_SHORTCUT_ACTION.PAGE_4]: {
    defaultKey: '4',
    label: 'keyboardShortcutPageName',
  },
  [KEYBOARD_SHORTCUT_ACTION.PAGE_5]: {
    defaultKey: '5',
    label: 'keyboardShortcutPageName',
  },
  [KEYBOARD_SHORTCUT_ACTION.PAGE_6]: {
    defaultKey: '6',
    label: 'keyboardShortcutPageName',
  },
} as const

const normalizeShortcutKey = (key: string) => {
  if (key === ' ') {
    return 'Space'
  }

  const normalizedKey = key.trim()

  if (!normalizedKey) {
    return ''
  }

  if (normalizedKey.length === 1) {
    return normalizedKey.toUpperCase()
  }

  return normalizedKey
}

const isModifierOnlyKey = (key: string) => {
  return ['Control', 'Meta', 'Alt', 'Shift'].includes(key)
}

const normalizeShortcut = (shortcut: string) => {
  if (!shortcut) {
    return ''
  }

  const parts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) {
    return ''
  }

  const modifierSet = new Set(parts)
  const modifiers = ['Ctrl', 'Meta', 'Alt', 'Shift'].filter((modifier) => modifierSet.has(modifier))
  const mainKey = parts.find((part) => !['Ctrl', 'Meta', 'Alt', 'Shift'].includes(part)) || ''

  if (!mainKey) {
    return ''
  }

  return [...modifiers, normalizeShortcutKey(mainKey)].join('+')
}

export const serializeShortcutEvent = (event: KeyboardEvent) => {
  if (isModifierOnlyKey(event.key)) {
    return ''
  }

  const modifiers = [
    event.ctrlKey ? 'Ctrl' : '',
    event.metaKey ? 'Meta' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
  ].filter(Boolean)

  return [...modifiers, normalizeShortcutKey(event.key)].join('+')
}

export const getDefaultShortcutKey = (action: string) => {
  return KEYBOARD_SHORTCUTS[action as KEYBOARD_SHORTCUT_ACTION]?.defaultKey ?? ''
}

export const useKeyboardShortcuts = () => {
  const normalizedCustomShortcuts = computed(() => {
    return Object.fromEntries(
      Object.entries(keyboardShortcuts.value).map(([action, shortcut]) => [
        action,
        normalizeShortcut(shortcut),
      ]),
    )
  })

  const getShortcutKey = (action: string) => {
    return (
      normalizedCustomShortcuts.value[action] || normalizeShortcut(getDefaultShortcutKey(action))
    )
  }

  return {
    getShortcutKey,
  }
}

export const useKeyboard = () => {
  const router = useRouter()
  const currentRoute = useRoute()
  const { getShortcutKey } = useKeyboardShortcuts()

  const shortcutActionMap = computed(() => {
    const entries = new Map<string, string>()
    const actions = Object.keys(KEYBOARD_SHORTCUTS)

    for (const action of actions) {
      const key = getShortcutKey(action)
      if (!key || entries.has(key)) {
        continue
      }

      entries.set(key, action)
    }

    return entries
  })

  const handleKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable
    ) {
      return
    }

    const key = serializeShortcutEvent(event)
    const action = shortcutActionMap.value.get(key)
    if (!action) {
      return
    }

    if (action === KEYBOARD_SHORTCUT_ACTION.TOGGLE_SIDEBAR) {
      event.preventDefault()
      isSidebarCollapsed.value = !isSidebarCollapsed.value
      return
    }

    if (action === KEYBOARD_SHORTCUT_ACTION.BACKEND_PREVIOUS) {
      if (!activeBackend.value) {
        return
      }

      event.preventDefault()
      const backend = switchActiveBackend(-1)
      if (backend) {
        showNotification({
          content: 'backendSwitchTo',
          params: {
            backend: getLabelFromBackend(backend),
          },
          type: 'alert-success',
        })
      }
      return
    }

    if (action === KEYBOARD_SHORTCUT_ACTION.BACKEND_NEXT) {
      if (!activeBackend.value) {
        return
      }

      event.preventDefault()
      const backend = switchActiveBackend(1)
      if (backend) {
        showNotification({
          content: 'backendSwitchTo',
          params: {
            backend: getLabelFromBackend(backend),
          },
          type: 'alert-success',
        })
      }
      return
    }

    if (!activeBackend.value) {
      return
    }

    const pageIndex = PAGE_SHORTCUT_ACTION_INDEX_MAP[action as KEYBOARD_SHORTCUT_ACTION]
    if (typeof pageIndex !== 'number') {
      return
    }

    const targetRoute = renderRoutes.value[pageIndex]
    if (!targetRoute) {
      return
    }

    event.preventDefault()
    if (currentRoute.name === targetRoute) {
      return
    }

    router.push({ name: targetRoute })
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {
    getShortcutKey,
  }
}
