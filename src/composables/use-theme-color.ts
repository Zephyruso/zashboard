import { dimmedOverlayCount } from '@/helper/dialog'
import { animationTime } from '@/helper/spring-motion'
import { isPreferredDark } from '@/helper/utils'
import { onMounted, onUnmounted, watch, type Ref } from 'vue'

const OVERLAY_DIM_ALPHA = 0.4
const OVERLAY_DIM_DURATION = 250

type Rgb = { r: number; g: number; b: number }
let colorProbe: CanvasRenderingContext2D | null | undefined
let probedColor = ''
let probedRgb: Rgb | null = null

const toRgb = (color: string) => {
  if (color === probedColor) return probedRgb
  if (colorProbe === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    colorProbe = canvas.getContext('2d', { willReadFrequently: true })
  }
  probedColor = color
  probedRgb = null
  if (!colorProbe) return null
  colorProbe.clearRect(0, 0, 1, 1)
  colorProbe.fillStyle = color
  colorProbe.fillRect(0, 0, 1, 1)
  const [r, g, b] = colorProbe.getImageData(0, 0, 1, 1).data
  return (probedRgb = { r, g, b })
}

export const useThemeColor = (app: Ref<HTMLElement | undefined>) => {
  let baseColor = ''
  let rgb: Rgb | null = null
  let dimLayer: HTMLElement | null = null
  let meta: HTMLMetaElement | null = null
  let dimAnimation: Animation | undefined
  let dimState = { from: 0, to: 0, start: 0, duration: 0 }

  const updateMeta = () => {
    if (!baseColor) return
    const scale = 1 - OVERLAY_DIM_ALPHA * dimState.to
    const dim = (channel: number) => Math.round(channel * scale)
    const color =
      rgb && dimState.to ? `rgb(${dim(rgb.r)}, ${dim(rgb.g)}, ${dim(rgb.b)})` : baseColor
    if (meta?.content !== color) meta?.setAttribute('content', color)
  }

  const setThemeColor = () => {
    if (!app.value) return
    baseColor = getComputedStyle(app.value).backgroundColor.trim()
    // Resolve modern CSS colors on theme changes, never in an animation callback.
    rgb = toRgb(baseColor)
    const tint = app.value.querySelector<HTMLElement>('.status-bar-tint')
    dimLayer =
      tint && getComputedStyle(tint).display !== 'none'
        ? tint.querySelector('.status-bar-dim')
        : null
    if (dimLayer) dimLayer.style.opacity = String(dimState.to)
    meta = document.querySelector('meta[name="theme-color"]')
    tint?.style.setProperty('--status-bar-tint', baseColor)
    updateMeta()
  }

  const animateDim = (to: number) => {
    const now = animationTime()
    const progress = dimState.duration ? Math.min(1, (now - dimState.start) / dimState.duration) : 1
    const from = dimState.from + (dimState.to - dimState.from) * progress * (2 - progress)
    dimAnimation?.cancel()
    dimAnimation = undefined
    dimState = { from, to, start: now, duration: OVERLAY_DIM_DURATION * Math.abs(to - from) }
    // Browser chrome changes once; the in-page status tint fades on the compositor.
    updateMeta()
    if (!dimLayer) return
    dimLayer.style.opacity = String(to)
    if (!dimState.duration || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dimState.duration = 0
      return
    }
    dimAnimation = dimLayer.animate(
      { opacity: [from, to] },
      {
        duration: dimState.duration,
        easing: 'cubic-bezier(0.333333, 0.666667, 0.666667, 1)',
      },
    )
    dimAnimation.startTime = now
  }

  watch(isPreferredDark, setThemeColor)
  watch(dimmedOverlayCount, (count) => animateDim(count > 0 ? 1 : 0))
  onMounted(setThemeColor)
  onUnmounted(() => dimAnimation?.cancel())
  return { setThemeColor }
}
