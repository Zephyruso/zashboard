import { onBeforeUnmount } from 'vue'

export interface LongPressOptions {
  duration?: number
  movementTolerance?: number
  onLongPress?: (event: PointerEvent) => void
}

interface LongPressBinding {
  onPointerdown: (event: PointerEvent) => void
  onPointermove: (event: PointerEvent) => void
  onPointerup: (event: PointerEvent) => void
  onPointercancel: (event: PointerEvent) => void
  onPointerleave: (event: PointerEvent) => void
}

export function useLongPress(options: LongPressOptions = {}): LongPressBinding {
  const duration = options.duration ?? 500
  const tolerance = options.movementTolerance ?? 10
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  let activePointer: number | null = null

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    activePointer = null
  }

  onBeforeUnmount(cancel)

  return {
    onPointerdown(event) {
      if (event.button !== 0 && event.pointerType === 'mouse') return

      cancel()
      activePointer = event.pointerId
      startX = event.clientX
      startY = event.clientY
      timer = setTimeout(() => {
        timer = null
        if (activePointer === event.pointerId) {
          options.onLongPress?.(event)
        }
      }, duration)
    },
    onPointermove(event) {
      if (activePointer !== event.pointerId) return

      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.hypot(dx, dy) > tolerance) cancel()
    },
    onPointerup(event) {
      if (activePointer === event.pointerId) cancel()
    },
    onPointercancel(event) {
      if (activePointer === event.pointerId) cancel()
    },
    onPointerleave(event) {
      if (activePointer === event.pointerId) cancel()
    },
  }
}
