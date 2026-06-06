import { backgroundImage } from '@/helper/indexeddb'
import { blurIntensity, dashboardTransparent, lowPowerMode } from '@/store/settings'
import { computed, onBeforeUnmount, watchEffect } from 'vue'

type GlassCssVariables = Record<string, string>

const MAX_BLUR_INTENSITY = 40
const MAX_GLASS_BLUR_RADIUS = 32
const GLASS_VARIABLE_NAMES = [
  '--blur-radius',
  '--glass-blur-radius',
  '--glass-sweep-blur-radius',
  '--glass-saturation',
  '--glass-tint',
  '--glass-inner-tint',
  '--bg-tint',
]

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

const blurIntensityValue = computed(() => {
  if (lowPowerMode.value) return 0
  return clamp(Number(blurIntensity.value), 0, MAX_BLUR_INTENSITY)
})

export const glassBlurRadius = computed(() =>
  Math.round((blurIntensityValue.value / MAX_BLUR_INTENSITY) * MAX_GLASS_BLUR_RADIUS),
)

export const glassStyleVariables = computed<GlassCssVariables>(() => {
  const radius = glassBlurRadius.value
  const baseTint = backgroundImage.value ? Number(dashboardTransparent.value) : 82
  const innerBaseTint = backgroundImage.value ? Number(dashboardTransparent.value) : 74
  const style: GlassCssVariables = {
    '--blur-radius': `${radius}px`,
    '--glass-blur-radius': `${radius}px`,
    '--glass-sweep-blur-radius': `${Math.round(radius * 0.28)}px`,
    '--glass-saturation': `${Math.round(150 + radius * 3)}%`,
    '--glass-tint': `${Math.min(88, Math.max(34, baseTint - radius * 0.35))}%`,
    '--glass-inner-tint': `${Math.min(82, Math.max(28, innerBaseTint - radius * 0.45))}%`,
  }

  if (backgroundImage.value) {
    style['--bg-tint'] = `${dashboardTransparent.value}%`
  }

  return style
})

export const useDocumentGlassVariables = () => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const stop = watchEffect(() => {
    const style = glassStyleVariables.value

    for (const name of GLASS_VARIABLE_NAMES) {
      if (!(name in style)) {
        root.style.removeProperty(name)
      }
    }

    for (const [name, value] of Object.entries(style)) {
      root.style.setProperty(name, value)
    }
  })

  onBeforeUnmount(() => {
    stop()
    for (const name of GLASS_VARIABLE_NAMES) {
      root.style.removeProperty(name)
    }
  })
}
