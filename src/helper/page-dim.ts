/**
 * Dims the floating chrome (controls bar, mobile dock) together with an in-page overlay.
 *
 * Those bars sit above page content, so a page-level backdrop can't cover them. Each bar hosts
 * its own dim layer and registers it here; the overlay drives every layer imperatively, once
 * per animation frame, without going through Vue renders.
 */
const layers = new Map<HTMLElement, number>()
let progress = 0
let dismissHandler: (() => void) | null = null

const applyLayer = (el: HTMLElement, scale: number) => {
  el.style.opacity = `${progress * scale}`
  // While dimmed, the layer swallows taps on the bar beneath it.
  el.style.pointerEvents = progress > 0 ? 'auto' : 'none'
}

export const registerPageDimLayer = (el: HTMLElement, scale = 1) => {
  layers.set(el, scale)
  applyLayer(el, scale)

  return () => {
    layers.delete(el)
  }
}

/** 0 = undimmed, 1 = fully dimmed; values are clamped. */
export const setPageDim = (value: number) => {
  const next = Math.min(1, Math.max(0, value))
  if (next === progress) return

  progress = next
  layers.forEach((scale, el) => applyLayer(el, scale))
}

/** Called when a dimmed bar is tapped; the overlay that owns the dim should close itself. */
export const setPageDimDismissHandler = (handler: (() => void) | null) => {
  dismissHandler = handler
}

export const dismissPageDim = () => {
  dismissHandler?.()
}
