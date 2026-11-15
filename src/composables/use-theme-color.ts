import { dimmedOverlayCount } from '@/helper/dialog'
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
  let dimFrame = 0

  let appliedColor = ''

  const applyColor = (baseColor: string) => {
    const rgb = dimProgress > 0 ? toRgb(baseColor) : null
    const scale = 1 - OVERLAY_DIM_ALPHA * dimProgress
    const dim = (channel: number) => Math.round(channel * scale)
    const color = rgb ? `rgb(${dim(rgb.r)}, ${dim(rgb.g)}, ${dim(rgb.b)})` : baseColor

    if (color === appliedColor) return
    appliedColor = color

    // Scope the variable to the tint element: setting it on <html> restyles the whole document.
    document
      .querySelector<HTMLElement>('.status-bar-tint')
      ?.style.setProperty('--status-bar-tint', color)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }

  const readBaseColor = () =>
    app.value ? getComputedStyle(app.value).getPropertyValue('background-color').trim() : ''

  const setThemeColor = () => {
    const baseColor = readBaseColor()
    if (baseColor) applyColor(baseColor)
  }

  const animateDim = (to: number) => {
    cancelAnimationFrame(dimFrame)

    const from = dimProgress
    const distance = to - from
    if (!distance) return

    // Read the base color once; getComputedStyle every frame forces a style recalc mid-animation.
    const baseColor = readBaseColor()
    if (!baseColor) {
      dimProgress = to
      return
    }

    const duration = OVERLAY_DIM_DURATION * Math.abs(distance)
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)

      dimProgress = from + distance * easeOut(progress)
      applyColor(baseColor)

      if (progress < 1) dimFrame = requestAnimationFrame(step)
    }

    dimFrame = requestAnimationFrame(step)
  }

  watch(isPreferredDark, setThemeColor)
  watch(dimmedOverlayCount, (count) => animateDim(count > 0 ? 1 : 0))

  onMounted(setThemeColor)
  onUnmounted(() => cancelAnimationFrame(dimFrame))

  return { setThemeColor }
}
