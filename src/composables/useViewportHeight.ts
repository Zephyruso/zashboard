import { onBeforeUnmount, onMounted } from 'vue'

// Keep the app sized to the *visual* viewport (the area not covered by the
// on-screen keyboard) by publishing its height as the `--app-height` CSS var.
//
// iOS Safari never resizes the layout viewport (nor `dvh`/`100vh`) when the
// keyboard opens — it only shrinks the visual viewport and scrolls the page
// under the keyboard, so `position: fixed`/full-height layouts get covered and
// the user has to scroll to reach the bottom. Mirroring `visualViewport.height`
// into a CSS var (the approach Telegram and most "100vh on iOS" fixes use), plus
// pinning the page scroll, makes the whole layout shrink to the visible region
// so normal flex layout keeps everything above the keyboard. On Android/Chromium
// `visualViewport` behaves the same, so this is a single cross-platform path.
export const useViewportHeight = () => {
  const update = () => {
    const viewport = window.visualViewport
    const height = viewport ? viewport.height : window.innerHeight
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`)
    // iOS scrolls the layout viewport to reveal the focused field (offsetTop > 0);
    // the app is already shrunk to fit, so undo that scroll to keep it aligned
    // with the visible region instead of letting content drift below the fold.
    if (viewport && viewport.offsetTop !== 0) window.scrollTo(0, 0)
  }

  onMounted(() => {
    update()
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
  })

  onBeforeUnmount(() => {
    const viewport = window.visualViewport
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    // Stop pinning the height so the rest of the app falls back to `100dvh`;
    // this tracking is only wanted while the terminal is open.
    document.documentElement.style.removeProperty('--app-height')
  })
}
