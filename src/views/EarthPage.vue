<script setup lang="ts">
import { theme } from '@/store/settings'
import { useResizeObserver } from '@vueuse/core'
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Rgb = [number, number, number]
type GlobeStyle = Exclude<NonNullable<ConstructorParameters<typeof Map>[0]['style']>, string>
type GlobeSky = NonNullable<GlobeStyle['sky']>

interface GlobePalette {
  dark: boolean
  sky: string
  horizon: string
  fog: string
  ocean: string
  landLow: string
  landHigh: string
  glow: string
  boundary: string
  geoline: string
  label: string
  labelHalo: string
}

const BLACK: Rgb = [2, 4, 10]
const WHITE: Rgb = [255, 255, 255]
const colorCanvas = document.createElement('canvas')
const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true })
const mapContainer = ref<HTMLElement>()
let map: Map | undefined
let themeFrame: number | undefined

setWorkerUrl(workerUrl)

const toRgb = (value: string, fallback: Rgb): Rgb => {
  if (!colorContext) return fallback

  colorContext.clearRect(0, 0, 1, 1)
  colorContext.fillStyle = `rgb(${fallback.join(', ')})`
  colorContext.fillStyle = value
  colorContext.fillRect(0, 0, 1, 1)
  const [red, green, blue] = colorContext.getImageData(0, 0, 1, 1).data
  return [red, green, blue]
}

const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
  from.map((value, index) => Math.round(value + (to[index] - value) * amount)) as Rgb

const rgb = (color: Rgb) => `rgb(${color.join(', ')})`
const rgba = (color: Rgb, alpha: number) => `rgba(${color.join(', ')}, ${alpha})`
const luminance = ([red, green, blue]: Rgb) => (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255

const createPalette = (container: HTMLElement): GlobePalette => {
  const styles = getComputedStyle(container)
  const read = (property: string, fallback: Rgb) =>
    toRgb(styles.getPropertyValue(property).trim(), fallback)
  const base100 = read('--color-base-100', WHITE)
  const base200 = read('--color-base-200', base100)
  const base300 = read('--color-base-300', base200)
  const baseContent = read('--color-base-content', BLACK)
  const primary = read('--color-primary', [92, 103, 235])
  const secondary = read('--color-secondary', primary)
  const dark = luminance(base100) < 0.45

  return {
    dark,
    sky: rgb(base200),
    horizon: rgb(mix(base300, secondary, dark ? 0.42 : 0.28)),
    fog: rgb(mix(base100, primary, dark ? 0.24 : 0.16)),
    ocean: rgb(mix(base200, primary, dark ? 0.18 : 0.24)),
    landLow: rgb(mix(base100, primary, dark ? 0.2 : 0.1)),
    landHigh: rgb(mix(base100, primary, dark ? 0.32 : 0.18)),
    glow: rgba(primary, dark ? 0.24 : 0.15),
    boundary: rgba(mix(baseContent, secondary, 0.38), dark ? 0.62 : 0.44),
    geoline: rgba(secondary, dark ? 0.3 : 0.24),
    label: rgb(mix(baseContent, dark ? WHITE : BLACK, 0.1)),
    labelHalo: rgba(dark ? mix(base300, BLACK, 0.35) : base100, 0.9),
  }
}

const createSky = (palette: GlobePalette): GlobeSky => ({
  'sky-color': palette.sky,
  'sky-horizon-blend': 0.2,
  'horizon-color': palette.horizon,
  'horizon-fog-blend': 0.35,
  'fog-color': palette.fog,
  'fog-ground-blend': 0.45,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.5, 7, 0],
})

const createGlobeStyle = (palette: GlobePalette): GlobeStyle => ({
  version: 8,
  name: 'Zashboard Globe',
  projection: { type: 'globe' },
  transition: { duration: 220, delay: 0 },
  sky: createSky(palette),
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    maplibre: {
      type: 'vector',
      url: 'https://demotiles.maplibre.org/tiles/tiles.json',
    },
  },
  layers: [
    {
      id: 'ocean',
      type: 'background',
      paint: { 'background-color': palette.ocean },
    },
    {
      id: 'countries-fill',
      type: 'fill',
      source: 'maplibre',
      'source-layer': 'countries',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          palette.landLow,
          5,
          palette.landHigh,
        ],
      },
    },
    {
      id: 'geolines',
      type: 'line',
      source: 'maplibre',
      'source-layer': 'geolines',
      filter: ['!=', ['get', 'name'], 'International Date Line'],
      layout: { 'line-cap': 'round' },
      paint: {
        'line-color': palette.geoline,
        'line-width': 0.7,
        'line-dasharray': [2, 3],
      },
    },
    {
      id: 'countries-glow',
      type: 'line',
      source: 'maplibre',
      'source-layer': 'countries',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.glow,
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 2, 6, 6],
        'line-blur': 2,
      },
    },
    {
      id: 'countries-boundary',
      type: 'line',
      source: 'maplibre',
      'source-layer': 'countries',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.boundary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.45, 6, 1.1],
      },
    },
    {
      id: 'countries-label',
      type: 'symbol',
      source: 'maplibre',
      'source-layer': 'centroids',
      minzoom: 0.8,
      layout: {
        'text-field': ['step', ['zoom'], ['get', 'ABBREV'], 2.4, ['get', 'NAME']],
        'text-font': ['Open Sans Semibold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0.8, 8, 3, 11, 6, 15],
        'text-letter-spacing': 0.04,
        'text-max-width': 8,
      },
      paint: {
        'text-color': palette.label,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': ['interpolate', ['linear'], ['zoom'], 0.8, 0.8, 6, 1.5],
        'text-halo-blur': 0.4,
      },
    },
  ],
})

const applyMapTheme = () => {
  if (!map || !mapContainer.value || !map.isStyleLoaded()) return

  const palette = createPalette(mapContainer.value)
  mapContainer.value.style.setProperty(
    '--earth-control-icon-filter',
    palette.dark ? 'invert(1)' : 'none',
  )
  map.setSky(createSky(palette))
  map.setPaintProperty('ocean', 'background-color', palette.ocean)
  map.setPaintProperty('countries-fill', 'fill-color', [
    'interpolate',
    ['linear'],
    ['zoom'],
    0,
    palette.landLow,
    5,
    palette.landHigh,
  ])
  map.setPaintProperty('geolines', 'line-color', palette.geoline)
  map.setPaintProperty('countries-glow', 'line-color', palette.glow)
  map.setPaintProperty('countries-boundary', 'line-color', palette.boundary)
  map.setPaintProperty('countries-label', 'text-color', palette.label)
  map.setPaintProperty('countries-label', 'text-halo-color', palette.labelHalo)
}

const scheduleThemeUpdate = () => {
  if (themeFrame !== undefined) cancelAnimationFrame(themeFrame)
  themeFrame = requestAnimationFrame(() => {
    themeFrame = undefined
    applyMapTheme()
  })
}

watch(theme, scheduleThemeUpdate, { flush: 'post' })
useResizeObserver(mapContainer, () => map?.resize())

onMounted(() => {
  if (!mapContainer.value) return

  const palette = createPalette(mapContainer.value)
  mapContainer.value.style.setProperty(
    '--earth-control-icon-filter',
    palette.dark ? 'invert(1)' : 'none',
  )
  map = new Map({
    container: mapContainer.value,
    style: createGlobeStyle(palette),
    center: [104, 27],
    zoom: 1.25,
    pitch: 8,
    bearing: -7,
    minZoom: 0.45,
    maxZoom: 7,
    attributionControl: { compact: true },
  })
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
  map.on('load', applyMapTheme)
})

onBeforeUnmount(() => {
  if (themeFrame !== undefined) cancelAnimationFrame(themeFrame)
  map?.remove()
})
</script>

<template>
  <main class="earth-page relative size-full overflow-hidden">
    <div
      ref="mapContainer"
      class="earth-map absolute inset-0"
      role="application"
      :aria-label="$t('earth')"
    />
    <div
      class="earth-vignette pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
  </main>
</template>

<style scoped>
.earth-page {
  isolation: isolate;
  background: var(--color-base-200);
}

.earth-map {
  position: absolute;
  inset: 0;
}

.earth-vignette {
  z-index: 1;
  background:
    radial-gradient(
      circle at 50% 45%,
      transparent 38%,
      color-mix(in srgb, var(--color-base-200) 18%, transparent) 76%,
      color-mix(in srgb, var(--color-base-200) 42%, transparent) 100%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-base-200) 12%, transparent),
      transparent 24%,
      transparent 72%,
      color-mix(in srgb, var(--color-base-200) 22%, transparent)
    );
}

.earth-map :deep(.maplibregl-ctrl-group),
.earth-map :deep(.maplibregl-ctrl-attrib) {
  border: 1px solid color-mix(in srgb, var(--color-base-content) 10%, transparent);
  background: color-mix(in srgb, var(--color-base-100) 78%, transparent);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--color-base-300) 34%, transparent);
  backdrop-filter: blur(18px) saturate(135%);
}

.earth-map :deep(.maplibregl-ctrl-group) {
  overflow: hidden;
  border-radius: var(--radius-field);
}

.earth-map :deep(.maplibregl-ctrl-group button + button) {
  border-color: color-mix(in srgb, var(--color-base-content) 10%, transparent);
}

.earth-map :deep(.maplibregl-ctrl button) {
  transition:
    transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 160ms ease;
}

.earth-map :deep(.maplibregl-ctrl button:active) {
  transform: scale(0.94);
}

.earth-map :deep(.maplibregl-ctrl-icon) {
  opacity: 0.78;
  filter: var(--earth-control-icon-filter);
}

.earth-map :deep(.maplibregl-ctrl-attrib) {
  color: color-mix(in srgb, var(--color-base-content) 72%, transparent);
  border-radius: var(--radius-field) 0 0 0;
}

.earth-map :deep(.maplibregl-ctrl-attrib a) {
  color: inherit;
}

@media (hover: hover) and (pointer: fine) {
  .earth-map :deep(.maplibregl-ctrl button:hover) {
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  }
}

@media (max-width: 767px) {
  .earth-map :deep(.maplibregl-ctrl-bottom-right) {
    bottom: calc(4rem + env(safe-area-inset-bottom));
  }
}
</style>
