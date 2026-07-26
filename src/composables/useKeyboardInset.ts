import { onBeforeUnmount, onMounted, ref } from 'vue'

// Height (px) of the on-screen keyboard, derived from the visual viewport.
// Stays 0 on desktop (no soft keyboard), so callers can gate mobile-only UI on
// `inset > 0` without an explicit platform check.
export const useKeyboardInset = () => {
  const inset = ref(0)

  const update = () => {
    const viewport = window.visualViewport
    if (!viewport) return
    // Bottom gap between the layout viewport and the visual viewport. Subtract
    // offsetTop too: when the page scrolls under the keyboard (notably iOS
    // Safari) the visual viewport shifts down, and height alone overstates it.
    const height = window.innerHeight - viewport.height - viewport.offsetTop
    inset.value = height > 1 ? Math.round(height) : 0
  }

  onMounted(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    update()
    // `scroll` fires when the viewport shifts (offsetTop changes) without a
    // resize, e.g. iOS keyboard handling; keep the inset in sync with both.
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
  })

  onBeforeUnmount(() => {
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
  })

  return inset
}
