import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineSegments2 } from 'three/addons/lines/webgpu/LineSegments2.js'
import * as THREE from 'three/webgpu'
import { DOT_RADIUS, snapToNearestDot } from './dotGlobe'
import {
  createGreatCircle,
  createGreatCircleBetweenVectors,
  sampleEarthPath,
  toEarthVector,
} from './earthMath'
import type { EarthColorScheme, EarthRenderSnapshot, EarthVisualMode } from './rendererTypes'
import type { EarthRoute } from './types'

const FLOW_DURATION_SECONDS = 0.85
const FLOW_STREAK_LENGTH = 0.14
const FLOW_STREAK_SEGMENTS = 14
const FLOW_COLOR = new THREE.Color('#ffffff')
const LIGHT_FLOW_COLOR = new THREE.Color('#5ad9ef')
const LINE_ORIGIN_COLOR = new THREE.Color('#b8f7ff')
const LINE_DESTINATION_COLOR = new THREE.Color('#4f9dff')

interface RuntimeRoute {
  route: EarthRoute
  points: THREE.Vector3[]
}

interface RouteLayerOptions {
  earthGroup: THREE.Group
  visualMode: EarthVisualMode
  colorScheme: EarthColorScheme
}

export interface RouteLayer {
  setSnapshot: (snapshot: EarthRenderSnapshot, topologyChanged: boolean) => void
  setVisualMode: (mode: EarthVisualMode) => void
  setColorScheme: (scheme: EarthColorScheme) => void
  update: (elapsed: number) => void
  dispose: () => void
}

export const createRouteLayer = (options: RouteLayerOptions): RouteLayer => {
  const { earthGroup } = options
  let lineGeometry = new LineSegmentsGeometry()
  const lineGlowMaterial = new THREE.Line2NodeMaterial({
    color: '#ffffff',
    linewidth: 5.5,
    transparent: true,
    opacity: 0.26,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const lineMaterial = new THREE.Line2NodeMaterial({
    color: '#ffffff',
    linewidth: 1.45,
    transparent: true,
    opacity: 0.96,
    vertexColors: true,
    depthWrite: false,
  })
  const lineGlow = new LineSegments2(lineGeometry, lineGlowMaterial)
  const lines = new LineSegments2(lineGeometry, lineMaterial)
  lineGlow.frustumCulled = false
  lines.frustumCulled = false
  // InstancedBufferGeometry defaults instanceCount to Infinity. Rendering the empty
  // placeholder before the first route snapshot makes WebGPU pass Infinity to
  // drawIndexed(), which is invalid. Only reveal it after finite segment data exists.
  lineGlow.visible = false
  lines.visible = false
  lineGlow.renderOrder = 1
  lines.renderOrder = 2
  earthGroup.add(lineGlow, lines)

  let flowGeometry = new LineSegmentsGeometry()
  const flowGlowMaterial = new THREE.Line2NodeMaterial({
    color: '#ffffff',
    linewidth: 9,
    transparent: true,
    opacity: 0.3,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const flowMaterial = new THREE.Line2NodeMaterial({
    color: '#ffffff',
    linewidth: 2.6,
    transparent: true,
    opacity: 0.96,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const flowGlow = new LineSegments2(flowGeometry, flowGlowMaterial)
  const flows = new LineSegments2(flowGeometry, flowMaterial)
  flowGlow.frustumCulled = false
  flows.frustumCulled = false
  flowGlow.visible = false
  flows.visible = false
  flowGlow.renderOrder = 3
  flows.renderOrder = 4
  earthGroup.add(flowGlow, flows)

  let runtimeRoutes: RuntimeRoute[] = []
  let currentRoutes: readonly EarthRoute[] = []
  let visualMode = options.visualMode
  let colorScheme = options.colorScheme
  let disposed = false
  const flowProgress = new Map<string, number>()
  let flowPositions = new Float32Array(0)
  let flowColors = new Float32Array(0)
  let flowPositionBuffer: THREE.InterleavedBuffer | null = null
  let flowColorBuffer: THREE.InterleavedBuffer | null = null
  const flowStart = new THREE.Vector3()
  const flowEnd = new THREE.Vector3()

  const applyVisualMode = () => {
    const space = visualMode === 'space'

    lineGlow.visible = space && lines.visible
    flowGlow.visible = space && flows.visible
    flowMaterial.blending = space ? THREE.AdditiveBlending : THREE.NormalBlending
    flowMaterial.needsUpdate = true
  }

  const updateFlows = (delta: number, advance: boolean) => {
    if (disposed || flowPositions.length === 0) return

    let flowSegmentIndex = 0
    const flowColor =
      visualMode !== 'space' && colorScheme === 'light' ? LIGHT_FLOW_COLOR : FLOW_COLOR

    for (const runtime of runtimeRoutes) {
      for (const direction of ['upload', 'download'] as const) {
        const rate = runtime.route[direction]
        const progressKey = `${runtime.route.key}:${direction}`
        let progress = flowProgress.get(progressKey) ?? 0

        if (rate <= 0) continue

        if (advance) {
          progress = Math.min(
            1 + FLOW_STREAK_LENGTH,
            progress + (delta * (1 + FLOW_STREAK_LENGTH)) / FLOW_DURATION_SECONDS,
          )
        }
        flowProgress.set(progressKey, progress)

        const trailStart = Math.max(0, progress - FLOW_STREAK_LENGTH)
        const trailEnd = Math.min(1, progress)
        const visibleLength = trailEnd - trailStart
        if (visibleLength <= 0) continue

        const segmentCount = Math.max(
          1,
          Math.ceil((visibleLength / FLOW_STREAK_LENGTH) * FLOW_STREAK_SEGMENTS),
        )
        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
          const startRatio = segmentIndex / segmentCount
          const endRatio = (segmentIndex + 1) / segmentCount
          const startProgress = THREE.MathUtils.lerp(trailStart, trailEnd, startRatio)
          const endProgress = THREE.MathUtils.lerp(trailStart, trailEnd, endRatio)
          sampleEarthPath(
            runtime.points,
            direction === 'download' ? 1 - startProgress : startProgress,
            flowStart,
          )
          sampleEarthPath(
            runtime.points,
            direction === 'download' ? 1 - endProgress : endProgress,
            flowEnd,
          )

          const offset = flowSegmentIndex * 6
          flowPositions[offset] = flowStart.x
          flowPositions[offset + 1] = flowStart.y
          flowPositions[offset + 2] = flowStart.z
          flowPositions[offset + 3] = flowEnd.x
          flowPositions[offset + 4] = flowEnd.y
          flowPositions[offset + 5] = flowEnd.z
          flowColors[offset] = flowColor.r
          flowColors[offset + 1] = flowColor.g
          flowColors[offset + 2] = flowColor.b
          flowColors[offset + 3] = flowColor.r
          flowColors[offset + 4] = flowColor.g
          flowColors[offset + 5] = flowColor.b
          flowSegmentIndex += 1
        }
      }
    }

    flowGeometry.instanceCount = flowSegmentIndex
    flowGlow.visible = visualMode === 'space' && flowSegmentIndex > 0
    flows.visible = flowSegmentIndex > 0
    if (flowPositionBuffer) flowPositionBuffer.needsUpdate = true
    if (flowColorBuffer) flowColorBuffer.needsUpdate = true
  }

  const rebuildGeometry = (routes: readonly EarthRoute[]) => {
    const positions: number[] = []
    const colors: number[] = []
    runtimeRoutes = []
    const snappedLocations = new Map<string, THREE.Vector3>()
    const getSnappedLocation = (location: EarthRoute['path'][number]) => {
      const key = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`
      let position = snappedLocations.get(key)

      if (!position) {
        position = snapToNearestDot(toEarthVector(location))
        snappedLocations.set(key, position)
      }
      return position
    }

    for (const route of routes) {
      const routePoints: THREE.Vector3[] = []

      for (let pathIndex = 0; pathIndex < route.path.length - 1; pathIndex += 1) {
        const from = route.path[pathIndex]
        const to = route.path[pathIndex + 1]
        const arc =
          visualMode === 'dots'
            ? createGreatCircleBetweenVectors(
                getSnappedLocation(from),
                getSnappedLocation(to),
                DOT_RADIUS,
              )
            : createGreatCircle(from, to)

        routePoints.push(...(routePoints.length > 0 ? arc.slice(1) : arc))

        for (let pointIndex = 0; pointIndex < arc.length - 1; pointIndex += 1) {
          const start = arc[pointIndex]
          const end = arc[pointIndex + 1]
          const startProgress = pointIndex / (arc.length - 1)
          const endProgress = (pointIndex + 1) / (arc.length - 1)
          positions.push(start.x, start.y, start.z, end.x, end.y, end.z)
          colors.push(
            THREE.MathUtils.lerp(LINE_ORIGIN_COLOR.r, LINE_DESTINATION_COLOR.r, startProgress),
            THREE.MathUtils.lerp(LINE_ORIGIN_COLOR.g, LINE_DESTINATION_COLOR.g, startProgress),
            THREE.MathUtils.lerp(LINE_ORIGIN_COLOR.b, LINE_DESTINATION_COLOR.b, startProgress),
            THREE.MathUtils.lerp(LINE_ORIGIN_COLOR.r, LINE_DESTINATION_COLOR.r, endProgress),
            THREE.MathUtils.lerp(LINE_ORIGIN_COLOR.g, LINE_DESTINATION_COLOR.g, endProgress),
            THREE.MathUtils.lerp(LINE_ORIGIN_COLOR.b, LINE_DESTINATION_COLOR.b, endProgress),
          )
        }
      }

      runtimeRoutes.push({ route, points: routePoints })
    }

    const previousGeometry = lineGeometry
    lineGeometry = new LineSegmentsGeometry()

    if (positions.length > 0) {
      lineGeometry.setPositions(positions)
      lineGeometry.setColors(colors)
      lineGlow.visible = visualMode === 'space'
      lines.visible = true
    } else {
      lineGlow.visible = false
      lines.visible = false
    }

    lineGlow.geometry = lineGeometry
    lines.geometry = lineGeometry
    previousGeometry.dispose()

    const previousFlowGeometry = flowGeometry
    const flowCapacity = Math.max(1, runtimeRoutes.length * 2 * FLOW_STREAK_SEGMENTS)
    flowPositions = new Float32Array(flowCapacity * 6)
    flowColors = new Float32Array(flowCapacity * 6)
    flowGeometry = new LineSegmentsGeometry()
    flowGeometry.setPositions(flowPositions)
    flowGeometry.setColors(flowColors)
    flowPositionBuffer = (
      flowGeometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute
    ).data
    flowColorBuffer = (
      flowGeometry.getAttribute('instanceColorStart') as THREE.InterleavedBufferAttribute
    ).data
    flowPositionBuffer.setUsage(THREE.DynamicDrawUsage)
    flowColorBuffer.setUsage(THREE.DynamicDrawUsage)
    flowGeometry.instanceCount = 0
    flowGlow.geometry = flowGeometry
    flows.geometry = flowGeometry
    previousFlowGeometry.dispose()
  }

  applyVisualMode()

  return {
    setSnapshot(snapshot, topologyChanged) {
      if (disposed) return
      currentRoutes = snapshot.routes

      if (topologyChanged) {
        rebuildGeometry(snapshot.routes)
      } else {
        const nextByKey = new Map(snapshot.routes.map((route) => [route.key, route]))

        for (const runtime of runtimeRoutes) {
          const next = nextByKey.get(runtime.route.key)
          if (next) runtime.route = next
        }
      }

      flowProgress.clear()
      for (const route of snapshot.routes) {
        if (route.upload > 0) flowProgress.set(`${route.key}:upload`, 0)
        if (route.download > 0) flowProgress.set(`${route.key}:download`, 0)
      }
      updateFlows(0, false)
    },
    setVisualMode(mode) {
      if (disposed || visualMode === mode) return
      const dotGeometryChanged = visualMode === 'dots' || mode === 'dots'
      visualMode = mode
      if (dotGeometryChanged) rebuildGeometry(currentRoutes)
      applyVisualMode()
      updateFlows(0, false)
    },
    setColorScheme(scheme) {
      if (disposed || colorScheme === scheme) return
      colorScheme = scheme
      updateFlows(0, false)
    },
    update(elapsed) {
      updateFlows(elapsed, true)
    },
    dispose() {
      if (disposed) return
      disposed = true
      earthGroup.remove(lineGlow, lines, flowGlow, flows)
      lineGeometry.dispose()
      lineGlowMaterial.dispose()
      lineMaterial.dispose()
      flowGeometry.dispose()
      flowGlowMaterial.dispose()
      flowMaterial.dispose()
      runtimeRoutes = []
      currentRoutes = []
      flowProgress.clear()
    },
  }
}
