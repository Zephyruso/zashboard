export type PanelMotion = {
  duration: number
  points: { offset: number; position: number }[]
  sample: (elapsed: number) => number
}

const DURATION = 260
const SAMPLE_MS = 1000 / 120

export const animationTime = () => Number(document.timeline.currentTime ?? performance.now())

const easeOut = (progress: number) => {
  if (progress <= 0 || progress >= 1) return Math.max(0, Math.min(1, progress))

  let lower = 0
  let upper = 1
  for (let i = 0; i < 20; i++) {
    const t = (lower + upper) / 2
    if (t * t * (0.6 + 0.4 * t) < progress) lower = t
    else upper = t
  }
  const t = (lower + upper) / 2
  return t * t * (3 - 2 * t)
}

export const createPanelMotion = (from: number, target: number): PanelMotion => {
  const duration = DURATION * Math.abs(target - from)
  const sample = (elapsed: number) =>
    duration ? from + (target - from) * easeOut(elapsed / duration) : target
  const steps = Math.max(1, Math.ceil(duration / SAMPLE_MS))

  return {
    duration,
    points: Array.from({ length: steps + 1 }, (_, index) => ({
      offset: index / steps,
      position: sample((index / steps) * duration),
    })),
    sample,
  }
}
