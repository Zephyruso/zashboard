import type { GeoIPLocation } from '@/api/geoip'
import {
  ElevatedRouteLayer,
  ROUTE_FLOW_DURATION,
  type ElevatedRouteLine,
  type RouteFlowAnimation,
} from '@/components/earth/ElevatedRouteLayer'
import type {
  ConnectionRoute,
  RouteCoordinate,
  RouteLegKind,
} from '@/components/earth/connectionRoutes'
import {
  POINT_GLOW_LAYER_ID,
  POINT_LAYER_ID,
  POINT_SOURCE_ID,
  createGlobeStyle,
  createPalette,
  createSky,
  pointColorExpression,
  routeColor,
  type GlobePalette,
} from '@/components/earth/globeStyle'
import { theme } from '@/store/settings'
import { useMediaQuery, useResizeObserver } from '@vueuse/core'
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

type RoutePointRole = RouteLegKind | 'origin'

interface AnimatedRoute {
  route: ConnectionRoute
  progress: number
  from: number
  target: 0 | 1
  startedAt: number
  uploadFlow?: RouteFlowAnimation
  downloadFlow?: RouteFlowAnimation
}

interface RoutePointFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: RouteCoordinate
  }
  properties: {
    role: RoutePointRole
    opacity: number
  }
}

interface UseEarthGlobeOptions {
  originLocation: Readonly<Ref<GeoIPLocation | null>>
  routes: Readonly<Ref<Map<string, ConnectionRoute>>>
}

const ENTER_DURATION = 420
const EXIT_DURATION = 320
const REDUCED_MOTION_DURATION = 160
const FLOW_HOLD_DURATION = ROUTE_FLOW_DURATION / 2

setWorkerUrl(workerUrl)

export const useEarthGlobe = ({ originLocation, routes }: UseEarthGlobeOptions) => {
  const mapContainer = ref<HTMLElement>()
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const routeStates = new Map<string, AnimatedRoute>()
  const elevatedRouteLayer = new ElevatedRouteLayer()

  let map: MapLibreMap | undefined
  let currentPalette: GlobePalette | undefined
  let themeFrame: number | undefined
  let routeFrame: number | undefined

  const emptyFeatureCollection = () => ({ type: 'FeatureCollection' as const, features: [] })

  const addConnectionLayers = (palette: GlobePalette) => {
    if (!map || map.getSource(POINT_SOURCE_ID)) return

    map.addSource(POINT_SOURCE_ID, { type: 'geojson', data: emptyFeatureCollection() })
    map.addLayer(elevatedRouteLayer)
    map.addLayer({
      id: POINT_GLOW_LAYER_ID,
      type: 'circle',
      source: POINT_SOURCE_ID,
      paint: {
        'circle-color': pointColorExpression(palette),
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 7, 11],
        'circle-opacity': ['*', ['get', 'opacity'], 0.22],
        'circle-blur': 0.65,
      },
    })
    map.addLayer({
      id: POINT_LAYER_ID,
      type: 'circle',
      source: POINT_SOURCE_ID,
      paint: {
        'circle-color': pointColorExpression(palette),
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2.2, 7, 4.5],
        'circle-opacity': ['get', 'opacity'],
        'circle-stroke-color': palette.routePointStroke,
        'circle-stroke-width': 1,
        'circle-stroke-opacity': ['get', 'opacity'],
      },
    })
  }

  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const smoothstep = (value: number) => value * value * (3 - 2 * value)
  const transitionDuration = (target: 0 | 1) =>
    reduceMotion.value ? REDUCED_MOTION_DURATION : target ? ENTER_DURATION : EXIT_DURATION

  const isFlowActive = (flow: RouteFlowAnimation | undefined, now: number) =>
    !reduceMotion.value && Boolean(flow && now < flow.endsAt)

  const extendFlow = (flow: RouteFlowAnimation | undefined, now: number): RouteFlowAnimation => {
    if (!flow || now >= flow.endsAt) {
      return { startedAt: now, endsAt: now + ROUTE_FLOW_DURATION }
    }

    const minimumEndsAt = now + FLOW_HOLD_DURATION
    const cycles = Math.ceil((minimumEndsAt - flow.startedAt) / ROUTE_FLOW_DURATION)

    return {
      startedAt: flow.startedAt,
      endsAt: Math.max(flow.endsAt, flow.startedAt + cycles * ROUTE_FLOW_DURATION),
    }
  }

  const presentationProgress = (state: AnimatedRoute, now: number) => {
    if (state.from === state.target) return state.target

    const elapsed = (now - state.startedAt) / transitionDuration(state.target)
    const amount = smoothstep(clamp(elapsed))

    return state.from + (state.target - state.from) * amount
  }

  const collapseIdenticalBaseLines = (lines: ElevatedRouteLine[]) => {
    const visibleLines = new Map<string, ElevatedRouteLine>()

    for (const line of lines) {
      if (line.opacity <= 0) continue

      const from = line.coordinates[0]
      const to = line.coordinates.at(-1)!
      const key = `${line.leg}:${from[0]},${from[1]}:${to[0]},${to[1]}`
      const visible = visibleLines.get(key)

      if (!visible) {
        visibleLines.set(key, line)
        continue
      }

      if (
        line.progress > visible.progress ||
        (line.progress === visible.progress && line.opacity > visible.opacity)
      ) {
        visible.opacity = 0
        visibleLines.set(key, line)
      } else {
        line.opacity = 0
      }
    }
  }

  const renderRouteData = () => {
    const now = performance.now()
    const lines: ElevatedRouteLine[] = []
    const pointFeatures = new Map<string, RoutePointFeature>()

    const addPoint = (role: RoutePointRole, location: GeoIPLocation, opacity: number) => {
      if (opacity <= 0) return

      const key = `${role}:${location.longitude.toFixed(4)}:${location.latitude.toFixed(4)}`
      const previous = pointFeatures.get(key)

      if (previous && previous.properties.opacity >= opacity) return
      pointFeatures.set(key, {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
        },
        properties: { role, opacity },
      })
    }

    if (originLocation.value) addPoint('origin', originLocation.value, 1)

    for (const state of routeStates.values()) {
      const legCount = state.route.legs.length
      const uploadFlow = isFlowActive(state.uploadFlow, now) ? state.uploadFlow : undefined
      const downloadFlow = isFlowActive(state.downloadFlow, now) ? state.downloadFlow : undefined
      const hasTrafficFlow = Boolean(uploadFlow || downloadFlow)

      state.route.legs.forEach((leg, index) => {
        const legProgress = clamp(state.progress * legCount - index)
        const opacity = reduceMotion.value ? state.progress : Math.min(1, legProgress * 5)

        if (currentPalette && ((legProgress > 0 && opacity > 0) || hasTrafficFlow)) {
          lines.push({
            id: `${state.route.id}:${index}`,
            leg: leg.kind,
            coordinates: leg.coordinates,
            color: routeColor(currentPalette, leg.kind),
            opacity,
            progress: reduceMotion.value ? 1 : legProgress,
            routeStart: index / legCount,
            routeEnd: (index + 1) / legCount,
            uploadFlow,
            downloadFlow,
          })
        }

        const endpointOpacity = reduceMotion.value
          ? state.progress
          : clamp((legProgress - 0.82) / 0.18)
        addPoint(leg.kind, leg.endpoint, endpointOpacity)
      })
    }

    // Identical routes share one 20% base line. Their traffic animations remain
    // on the original entries, so upload/download pulses are still independent.
    collapseIdenticalBaseLines(lines)
    elevatedRouteLayer.setData(lines)
    const pointSource = map?.getSource(POINT_SOURCE_ID) as GeoJSONSource | undefined
    pointSource?.setData({
      type: 'FeatureCollection',
      features: [...pointFeatures.values()],
    })
  }

  const applyMapTheme = () => {
    if (!map || !mapContainer.value || !map.isStyleLoaded()) return

    const palette = createPalette(mapContainer.value)
    currentPalette = palette
    mapContainer.value.style.setProperty(
      '--earth-control-icon-filter',
      palette.dark ? 'invert(1)' : 'none',
    )
    map.setSky(createSky(palette))
    map.setPaintProperty('ocean', 'background-color', palette.ocean)
    map.setPaintProperty('land', 'fill-color', [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      palette.landLow,
      5,
      palette.landHigh,
    ])
    map.setPaintProperty('geolines', 'line-color', palette.geoline)

    if (map.getLayer(POINT_LAYER_ID)) {
      const pointColors = pointColorExpression(palette)

      map.setPaintProperty(POINT_GLOW_LAYER_ID, 'circle-color', pointColors)
      map.setPaintProperty(POINT_LAYER_ID, 'circle-color', pointColors)
      map.setPaintProperty(POINT_LAYER_ID, 'circle-stroke-color', palette.routePointStroke)
    }

    renderRouteData()
  }

  const scheduleThemeUpdate = () => {
    if (themeFrame !== undefined) cancelAnimationFrame(themeFrame)
    themeFrame = requestAnimationFrame(() => {
      themeFrame = undefined
      applyMapTheme()
    })
  }

  const animateRoutes = (now: number) => {
    routeFrame = undefined
    let hasAnimation = false
    let needsRender = false

    for (const [id, state] of routeStates) {
      const previousProgress = state.progress
      state.progress = presentationProgress(state, now)
      needsRender ||= Math.abs(state.progress - previousProgress) >= 0.001
      const complete = Math.abs(state.progress - state.target) < 0.001

      if (complete) {
        state.progress = state.target
        state.from = state.target
        if (state.target === 0) {
          const hasTrafficFlow =
            isFlowActive(state.uploadFlow, now) || isFlowActive(state.downloadFlow, now)

          if (hasTrafficFlow) {
            hasAnimation = true
          } else {
            routeStates.delete(id)
            needsRender = true
          }
        }
      } else {
        hasAnimation = true
      }
    }

    if (needsRender) renderRouteData()
    if (hasAnimation) routeFrame = requestAnimationFrame(animateRoutes)
  }

  const scheduleRouteAnimation = () => {
    if (routeFrame === undefined) routeFrame = requestAnimationFrame(animateRoutes)
  }

  const syncRouteStates = (nextRoutes: Map<string, ConnectionRoute>) => {
    const now = performance.now()

    for (const state of routeStates.values()) {
      state.progress = presentationProgress(state, now)
    }

    for (const [id, route] of nextRoutes) {
      const current = routeStates.get(id)

      if (!current) {
        routeStates.set(id, {
          route,
          progress: 0,
          from: 0,
          target: 1,
          startedAt: now,
        })
        continue
      }

      if (current.route.signature !== route.signature) {
        current.route = route
        current.progress = 0
        current.from = 0
        current.target = 1
        current.startedAt = now
        continue
      }

      if (!reduceMotion.value && route.upload > current.route.upload) {
        current.uploadFlow = extendFlow(current.uploadFlow, now)
      }
      if (!reduceMotion.value && route.download > current.route.download) {
        current.downloadFlow = extendFlow(current.downloadFlow, now)
      }

      current.route = route
      if (current.target === 0) {
        current.from = current.progress
        current.target = 1
        current.startedAt = now
      }
    }

    for (const [id, state] of routeStates) {
      if (nextRoutes.has(id) || state.target === 0) continue

      state.from = state.progress
      state.target = 0
      state.startedAt = now
    }

    renderRouteData()
    scheduleRouteAnimation()
  }

  const resetRouteStates = () => {
    if (routeFrame !== undefined) cancelAnimationFrame(routeFrame)
    routeFrame = undefined
    routeStates.clear()
    renderRouteData()
  }

  watch(originLocation, (location) => {
    if (!location) resetRouteStates()
  })
  watch(routes, syncRouteStates, { immediate: true })
  watch(theme, scheduleThemeUpdate, { flush: 'post' })
  watch(reduceMotion, () => {
    const now = performance.now()

    for (const state of routeStates.values()) {
      state.progress = presentationProgress(state, now)
      state.from = state.progress
      state.startedAt = now
    }
    renderRouteData()
    scheduleRouteAnimation()
  })

  useResizeObserver(mapContainer, () => map?.resize())

  onMounted(() => {
    if (!mapContainer.value) return

    const palette = createPalette(mapContainer.value)
    currentPalette = palette
    mapContainer.value.style.setProperty(
      '--earth-control-icon-filter',
      palette.dark ? 'invert(1)' : 'none',
    )
    map = new MapLibreMap({
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
    map.on('load', () => {
      if (!mapContainer.value) return
      addConnectionLayers(createPalette(mapContainer.value))
      applyMapTheme()
      renderRouteData()
    })
  })

  onBeforeUnmount(() => {
    if (themeFrame !== undefined) cancelAnimationFrame(themeFrame)
    if (routeFrame !== undefined) cancelAnimationFrame(routeFrame)
    map?.remove()
    map = undefined
  })

  return { mapContainer }
}
