import { animatedOverlayDims, dimmedOverlayCount } from '@/helper/dialog'
import { animationTime } from '@/helper/panel-motion'
import { isPreferredDark } from '@/helper/utils'
import { onMounted, onUnmounted, watch, type Ref } from 'vue'

const OVERLAY_DIM_ALPHA = 0.4
const OVERLAY_DIM_DURATION = 250

let colorProbe: CanvasRenderingContext2D | null | undefined
let probedColor = ''
let probedRgb: { r: number; g: number; b: number } | null = null

const toRgb = (color: string) => {
  if (color === probedColor) return probedRgb

  if (colorProbe === undefined) {
    colorProbe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  }

  probedColor = color
  probedRgb = null
  if (!colorProbe) return null

  colorProbe.fillStyle = '#010203'
  colorProbe.fillStyle = color
  if (colorProbe.fillStyle === '#010203') return null

  colorProbe.fillRect(0, 0, 1, 1)
  const [r, g, b] = colorProbe.getImageData(0, 0, 1, 1).data
  probedRgb = { r, g, b }
  return probedRgb
}

const easeOut = (t: number) => t * (2 - t)

export const useThemeColor = (app: Ref<HTMLElement | undefined>) => {
  let dimProgress = 0
  let dialogProgress = 0
  let dimFrame = 0
  let transition: { from: number; to: number; start: number; duration: number } | undefined

  const setThemeColor = () => {
    if (!app.value) return

    const themeColor = getComputedStyle(app.value).getPropertyValue('background-color').trim()
    const rgb = dimProgress > 0 ? toRgb(themeColor) : null
    const scale = 1 - OVERLAY_DIM_ALPHA * dimProgress
    const dim = (channel: number) => Math.round(channel * scale)
    const color = rgb ? `rgb(${dim(rgb.r)}, ${dim(rgb.g)}, ${dim(rgb.b)})` : themeColor

    document.documentElement.style.setProperty('--status-bar-tint', color)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }

  const updateDim = () => {
    cancelAnimationFrame(dimFrame)
    const now = animationTime()
    let pending = false

    if (transition) {
      const { from, to, start, duration } = transition
      const progress = Math.min((now - start) / duration, 1)
      dialogProgress = from + (to - from) * easeOut(progress)
      if (progress === 1) transition = undefined
    }

    dimProgress = dialogProgress
    for (const state of animatedOverlayDims.values()) {
      let progress: number
      if (typeof state === 'number') {
        progress = state
      } else {
        const elapsed = now - state.start
        progress = state.motion.sample(elapsed)
        pending ||= elapsed < state.motion.duration
      }
      dimProgress = Math.max(dimProgress, Math.max(0, Math.min(1, progress)))
    }
    setThemeColor()

    if (transition || pending) dimFrame = requestAnimationFrame(updateDim)
  }

  const animateDim = (to: number) => {
    const from = dialogProgress
    const distance = to - from
    transition = distance
      ? { from, to, start: animationTime(), duration: OVERLAY_DIM_DURATION * Math.abs(distance) }
      : undefined
    updateDim()
  }

  watch(isPreferredDark, setThemeColor)
  watch(dimmedOverlayCount, (count) => animateDim(count > 0 ? 1 : 0))
  watch(() => [...animatedOverlayDims.values()], updateDim)

  onMounted(updateDim)
  onUnmounted(() => cancelAnimationFrame(dimFrame))

  return { setThemeColor }
}
