import type { RouteLegKind } from '@/components/earth/connectionRoutes'
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'

export type Rgb = [number, number, number]

type GlobeStyle = Exclude<
  NonNullable<ConstructorParameters<typeof MapLibreMap>[0]['style']>,
  string
>

export type GlobeSky = NonNullable<GlobeStyle['sky']>

export interface GlobePalette {
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
  routeRelay: Rgb
  routeDestination: Rgb
  routeDirect: Rgb
  routePointStroke: string
}

export const POINT_SOURCE_ID = 'connection-points'
export const POINT_GLOW_LAYER_ID = 'connection-points-glow'
export const POINT_LAYER_ID = 'connection-points-circle'

const BLACK: Rgb = [2, 4, 10]
const WHITE: Rgb = [255, 255, 255]
const colorCanvas = document.createElement('canvas')
const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true })

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

export const rgb = (color: Rgb) => `rgb(${color.join(', ')})`
const rgba = (color: Rgb, alpha: number) => `rgba(${color.join(', ')}, ${alpha})`
const luminance = ([red, green, blue]: Rgb) => (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255

export const createPalette = (container: HTMLElement): GlobePalette => {
  const styles = getComputedStyle(container)
  const read = (property: string, fallback: Rgb) =>
    toRgb(styles.getPropertyValue(property).trim(), fallback)
  const base100 = read('--color-base-100', WHITE)
  const base200 = read('--color-base-200', base100)
  const base300 = read('--color-base-300', base200)
  const baseContent = read('--color-base-content', BLACK)
  const primary = read('--color-primary', [92, 103, 235])
  const secondary = read('--color-secondary', primary)
  const accent = read('--color-accent', secondary)
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
    routeRelay: primary,
    routeDestination: secondary,
    routeDirect: accent,
    routePointStroke: rgb(base100),
  }
}

export const createSky = (palette: GlobePalette): GlobeSky => ({
  'sky-color': palette.sky,
  'sky-horizon-blend': 0.2,
  'horizon-color': palette.horizon,
  'horizon-fog-blend': 0.35,
  'fog-color': palette.fog,
  'fog-ground-blend': 0.45,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.5, 7, 0],
})

export const pointColorExpression = (palette: GlobePalette): ExpressionSpecification => [
  'match',
  ['get', 'role'],
  'relay',
  rgb(palette.routeRelay),
  'destination',
  rgb(palette.routeDestination),
  'direct',
  rgb(palette.routeDirect),
  rgb(palette.routeRelay),
]

export const createGlobeStyle = (palette: GlobePalette): GlobeStyle => ({
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

export const routeColor = (palette: GlobePalette, leg: RouteLegKind) => {
  if (leg === 'relay') return palette.routeRelay
  if (leg === 'destination') return palette.routeDestination
  return palette.routeDirect
}
