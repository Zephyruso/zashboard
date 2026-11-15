/**
 * Dims the floating chrome (controls bar, mobile dock) together with in-page overlays.
 *
 * Those bars sit above page content, so a page-level backdrop can't cover them. Each bar hosts
 * its own dim layer and registers it here; overlays drive every layer imperatively, once per
 * animation frame, without going through Vue renders.
 *
 * Several overlays may dim at once (one finishing its close while the next one opens), so each
 * owner reports its own progress and the layers show the strongest one.
 */
type DimState = {
  progress: number
  /** Present while the owner accepts taps on the dimmed bars; absent while it's closing. */
  onDismiss: (() => void) | null
}

const layers = new Map<HTMLElement, number>()
const owners = new Map<object, DimState>()
let appliedProgress = 0
let appliedInteractive = false

const applyLayer = (el: HTMLElement, scale: number) => {
  el.style.opacity = `${appliedProgress * scale}`
  // Only swallow taps while an owner can handle them; a closing overlay lets them through.
  el.style.pointerEvents = appliedInteractive ? 'auto' : 'none'
}

const apply = () => {
  let progress = 0
  let interactive = false

  owners.forEach((state) => {
    progress = Math.max(progress, state.progress)
    interactive ||= state.onDismiss !== null
  })

  if (progress === appliedProgress && interactive === appliedInteractive) return

  appliedProgress = progress
  appliedInteractive = interactive
  layers.forEach((scale, el) => applyLayer(el, scale))
}

export const registerPageDimLayer = (el: HTMLElement, scale = 1) => {
  layers.set(el, scale)
  applyLayer(el, scale)

  return () => {
    layers.delete(el)
  }
}

/** `progress`: 0 = undimmed, 1 = fully dimmed; values are clamped. */
export const setPageDim = (
  owner: object,
  progress: number,
  onDismiss: (() => void) | null = null,
) => {
  owners.set(owner, { progress: Math.min(1, Math.max(0, progress)), onDismiss })
  apply()
}

export const clearPageDim = (owner: object) => {
  if (!owners.delete(owner)) return
  apply()
}

/** A dimmed bar was tapped: dismiss the most recent owner that still accepts taps. */
export const dismissPageDim = () => {
  const states = [...owners.values()]

  for (let i = states.length - 1; i >= 0; i--) {
    const onDismiss = states[i]!.onDismiss

    if (onDismiss) {
      onDismiss()
      return
    }
  }
}
