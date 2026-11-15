import { animationTime, type SpringMotion } from './spring-motion'

type DimState = {
  progress: number
  motion?: SpringMotion
  start?: number
  onDismiss: (() => void) | null
}
type DimLayer = { scale: number; animation?: Animation }

const layers = new Map<HTMLElement, DimLayer>()
const owners = new Map<object, DimState>()
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Rebuild only on open/close/reversal, never from a per-frame JavaScript loop. */
const apply = () => {
  const now = animationTime()
  const states = [...owners.values()]
  const duration = Math.max(
    0,
    ...states.map((state) => (state.motion ? state.motion.duration - (now - state.start!) : 0)),
  )
  const progressAt = (elapsed: number) =>
    Math.max(
      0,
      ...states.map((state) =>
        clamp01(
          state.motion
            ? state.motion.sample(now + elapsed - state.start!).position
            : state.progress,
        ),
      ),
    )
  const steps = Math.max(1, Math.ceil(duration / (1000 / 120)))
  const points = Array.from({ length: steps + 1 }, (_, index) => ({
    offset: index / steps,
    opacity: progressAt((index / steps) * duration),
  }))
  const interactive = states.some((state) => state.onDismiss !== null)

  for (const [el, layer] of layers) {
    layer.animation?.cancel()
    layer.animation = undefined
    el.style.opacity = String(progressAt(duration) * layer.scale)
    el.style.pointerEvents = interactive ? 'auto' : 'none'
    if (!duration) continue

    const animation = el.animate(
      points.map((point) => ({ offset: point.offset, opacity: point.opacity * layer.scale })),
      { duration, easing: 'linear' },
    )
    animation.startTime = now
    layer.animation = animation
    animation.onfinish = () => {
      if (layer.animation === animation) layer.animation = undefined
    }
  }
}

export const registerPageDimLayer = (el: HTMLElement, scale = 1) => {
  const layer: DimLayer = { scale }
  layers.set(el, layer)
  apply()
  return () => {
    layer.animation?.cancel()
    layers.delete(el)
  }
}

export const setPageDim = (
  owner: object,
  progress: number,
  onDismiss: (() => void) | null = null,
) => {
  owners.set(owner, { progress: clamp01(progress), onDismiss })
  apply()
}

/** Overlapping closing/opening panels share the strongest dim, on the same native timeline. */
export const animatePageDim = (
  owner: object,
  motion: SpringMotion,
  start: number,
  onDismiss: (() => void) | null,
) => {
  owners.delete(owner)
  owners.set(owner, { progress: motion.target, motion, start, onDismiss })
  apply()
}

export const clearPageDim = (owner: object) => {
  if (owners.delete(owner)) apply()
}

export const dismissPageDim = () => {
  const states = [...owners.values()]
  for (let i = states.length - 1; i >= 0; i--) {
    const dismiss = states[i]!.onDismiss
    if (dismiss) {
      dismiss()
      return
    }
  }
}
