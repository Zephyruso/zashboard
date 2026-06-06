import { type Ref, onBeforeUnmount, watch } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ')

export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
  )
}

export const useFocusTrap = (
  containerRef: Ref<HTMLElement | null>,
  options?: { active?: Ref<boolean | undefined>; onEscape?: () => void },
) => {
  let previouslyFocused: HTMLElement | null = null
  let isActive = false

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      options?.onEscape?.()
      return
    }

    if (event.key !== 'Tab') return

    const container = containerRef.value
    if (!container) return

    const focusable = getFocusableElements(container)
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const activate = () => {
    if (isActive) return
    isActive = true
    previouslyFocused = document.activeElement as HTMLElement
    document.addEventListener('keydown', handleKeydown)

    const container = containerRef.value
    if (container) {
      const focusable = getFocusableElements(container)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        container.focus()
      }
    }
  }

  const deactivate = () => {
    if (!isActive) return
    isActive = false
    document.removeEventListener('keydown', handleKeydown)
    if (
      previouslyFocused &&
      previouslyFocused.isConnected &&
      typeof previouslyFocused.focus === 'function'
    ) {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  const isEnabled = () => options?.active?.value !== false

  watch(
    [containerRef, () => options?.active?.value],
    ([el]) => {
      if (el && isEnabled()) {
        activate()
      } else {
        deactivate()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    deactivate()
  })

  return { activate, deactivate }
}
