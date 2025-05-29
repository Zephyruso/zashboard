import { MIN_PROXY_CARD_WIDTH, PROXY_CARD_SIZE } from '@renderer/constant'
import type { Backend } from '@renderer/types'
import { useMediaQuery } from '@vueuse/core'
import dayjs from 'dayjs'
import prettyBytes, { type Options } from 'pretty-bytes'
import { ref } from 'vue'

export const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')
export const isDarkTheme = ref(false)
export const isMiddleScreen = useMediaQuery('(max-width: 768px)')
export const isLargeScreen = useMediaQuery('(max-width: 1024px)')
export const isPWA = (() => {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
})()

export const prettyBytesHelper = (bytes: number, opts?: Options) => {
  return prettyBytes(bytes, {
    binary: false,
    ...opts,
  })
}

export const fromNow = (timestamp: string | number) => {
  return dayjs(timestamp).fromNow()
}

export const exportSettings = () => {
  const settings: Record<string, string | null> = {}

  for (const key in localStorage) {
    if (key.startsWith('config/') || key.startsWith('setup/')) {
      settings[key] = localStorage.getItem(key)
    }
  }

  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'zashboard-settings'
  a.click()
  URL.revokeObjectURL(url)
}

export const getUrlFromBackend = (end: Omit<Backend, 'uuid'>) => {
  return `${end.protocol}://${end.host}:${end.port}${end.secondaryPath || ''}`
}

export const getLabelFromBackend = (end: Omit<Backend, 'uuid'>) => {
  return end.label || getUrlFromBackend(end)
}

export const getMinCardWidth = (size: PROXY_CARD_SIZE) => {
  return size === PROXY_CARD_SIZE.LARGE ? MIN_PROXY_CARD_WIDTH.LARGE : MIN_PROXY_CARD_WIDTH.SMALL
}

export const SCROLLABLE_PARENT_CLASS = 'scrollable-parent'

export const scrollIntoCenter = (el: HTMLElement) => {
  const scrollableParent = findScrollableParent(el)

  if (!scrollableParent) return

  const elRect = el.getBoundingClientRect()
  const parentRect = scrollableParent.getBoundingClientRect()

  if (elRect.top >= parentRect.top && elRect.bottom <= parentRect.bottom) return

  const parentTop = scrollableParent.offsetTop
  const childTop = el.offsetTop

  const centerOffset =
    childTop - parentTop - scrollableParent.clientHeight / 2 + el.clientHeight / 2

  scrollableParent.scrollTo({
    top: centerOffset,
    behavior: 'smooth',
  })
}

const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
  const parent = el?.parentElement

  if (
    parent?.classList.contains(SCROLLABLE_PARENT_CLASS) &&
    parent.scrollHeight > parent.clientHeight
  ) {
    return parent
  }

  return parent ? findScrollableParent(parent) : null
}
