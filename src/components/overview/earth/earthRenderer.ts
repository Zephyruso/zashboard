import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import * as THREE from 'three/webgpu'
import { createCityLabelLayer } from './cityLabelLayer'
import { getRealtimeSunDirection, toEarthVector } from './earthMath'
import { createEndpointLayer } from './endpointLayer'
import { createGlobeLayer } from './globeLayer'
import { createEarthRenderSnapshot } from './renderSnapshot'
import type { EarthRenderer as EarthRendererContract, EarthRendererOptions } from './rendererTypes'
import { createRouteLayer } from './routeLayer'

export type { EarthRenderer } from './rendererTypes'

const MAX_INITIAL_LATITUDE = 15

type Cleanup = () => void

const runCleanups = (cleanups: Cleanup[]) => {
  let firstError: unknown

  while (cleanups.length > 0) {
    try {
      cleanups.pop()!()
    } catch (error) {
      firstError ??= error
    }
  }

  if (firstError) throw firstError
}

export const createEarthRenderer = async (
  container: HTMLElement,
  options: EarthRendererOptions,
): Promise<EarthRendererContract> => {
  const cleanups: Cleanup[] = []
  let disposed = false
  const registerCleanup = (cleanup: Cleanup) => cleanups.push(cleanup)
  const disposeResources = () => {
    if (disposed) return
    disposed = true
    runCleanups(cleanups)
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100)
  camera.position.set(3.7, 1.55, 3.2)

  const renderer = new THREE.WebGPURenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.className = 'h-full w-full cursor-grab active:cursor-grabbing'
  renderer.domElement.style.display = 'block'

  try {
    container.appendChild(renderer.domElement)
    registerCleanup(() => {
      renderer.setAnimationLoop(null)
      try {
        renderer.dispose()
      } finally {
        renderer.domElement.remove()
      }
    })
    await renderer.init()

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.sortObjects = false
    labelRenderer.domElement.className = 'pointer-events-none absolute inset-0 overflow-hidden'
    labelRenderer.domElement.setAttribute('aria-hidden', 'true')
    container.appendChild(labelRenderer.domElement)
    registerCleanup(() => labelRenderer.domElement.remove())

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 2.65
    controls.maxDistance = 7.5
    controls.rotateSpeed = 0.55
    controls.zoomSpeed = 0.75
    controls.touches.ONE = THREE.TOUCH.ROTATE
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE
    // Keep browser scrolling/navigation gestures inside the canvas from competing
    // with OrbitControls on touch devices.
    renderer.domElement.style.touchAction = 'none'
    registerCleanup(() => controls.dispose())

    const earthGroup = new THREE.Group()
    scene.add(earthGroup)
    registerCleanup(() => scene.remove(earthGroup))

    let reducedMotion = options.reducedMotion
    let visualMode = options.visualMode
    let colorScheme = options.colorScheme
    let autoRotation = true
    let initialLocationSet = false
    let visible = !document.hidden
    let intersecting = true
    let pinnedEndpoint = false
    let currentSignature = ''
    const clock = new THREE.Clock()
    const sunDirection = getRealtimeSunDirection()

    const globeLayer = await createGlobeLayer({
      scene,
      earthGroup,
      renderer,
      visualMode,
      colorScheme,
      sunDirection,
    })
    registerCleanup(() => globeLayer.dispose())

    const routeLayer = createRouteLayer({ earthGroup, visualMode, colorScheme })
    registerCleanup(() => routeLayer.dispose())

    const endpointLayer = createEndpointLayer({
      earthGroup,
      camera,
      visualMode,
      sunDirection,
    })
    registerCleanup(() => endpointLayer.dispose())

    const cityLabelLayer = createCityLabelLayer({
      earthGroup,
      camera,
      controls,
      labelRenderer,
    })
    registerCleanup(() => cityLabelLayer.dispose())

    const updateSunForTime = () => {
      getRealtimeSunDirection(new Date(), sunDirection)
      globeLayer.setSunDirection(sunDirection)
      endpointLayer.setSunDirection(sunDirection)
    }

    const render = () => {
      if (!disposed && visible && intersecting) {
        cityLabelLayer.updateVisibility()
        renderer.render(scene, camera)
        labelRenderer.render(scene, camera)
      }
    }

    const animate = () => {
      if (disposed) return

      const elapsed = clock.getDelta()
      const delta = Math.min(0.05, elapsed)
      if (autoRotation) earthGroup.rotation.y += delta * 0.025
      endpointLayer.update(delta)
      if (visualMode === 'space') globeLayer.syncSunLight()
      controls.update(delta)
      routeLayer.update(elapsed)

      render()
    }

    const updateAnimationLoop = () => {
      if (disposed) return

      renderer.setAnimationLoop(null)
      clock.stop()

      if (!visible || !intersecting) return

      if (visualMode === 'space') updateSunForTime()

      if (reducedMotion) {
        controls.enableDamping = false
        render()
      } else {
        controls.enableDamping = true
        clock.start()
        renderer.setAnimationLoop(animate)
      }
    }

    const clearEndpointInteraction = () => {
      pinnedEndpoint = false
      options.onEndpointHover(null)
      renderer.domElement.style.cursor = ''
    }

    const showEndpoint = (event: PointerEvent, pin = false) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      const endpoint = endpointLayer.hitTest(event.clientX, event.clientY, bounds)

      if (endpoint) {
        pinnedEndpoint = pin
        options.onEndpointHover(endpoint, event.clientX, event.clientY)
        renderer.domElement.style.cursor = 'pointer'
      } else if (!pinnedEndpoint || pin) {
        clearEndpointInteraction()
      }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!pinnedEndpoint && event.pointerType !== 'touch') showEndpoint(event)
    }
    const onClick = (event: PointerEvent) => showEndpoint(event, true)
    const onPointerLeave = () => {
      if (!pinnedEndpoint) clearEndpointInteraction()
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    registerCleanup(() => {
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
    })

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.max(1, entry.contentRect.width)
      const height = Math.max(1, entry.contentRect.height)

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      labelRenderer.setSize(width, height)
      render()
    })
    resizeObserver.observe(container)
    registerCleanup(() => resizeObserver.disconnect())

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting
        updateAnimationLoop()
      },
      { threshold: 0.01 },
    )
    intersectionObserver.observe(container)
    registerCleanup(() => intersectionObserver.disconnect())

    const onVisibilityChange = () => {
      visible = !document.hidden
      updateAnimationLoop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    registerCleanup(() => document.removeEventListener('visibilitychange', onVisibilityChange))

    const sunTimer = window.setInterval(() => {
      if (visualMode === 'space') updateSunForTime()
      if (reducedMotion) render()
    }, 60_000)
    registerCleanup(() => window.clearInterval(sunTimer))

    const onControlsChange = () => {
      if (reducedMotion) render()
    }
    controls.addEventListener('change', onControlsChange)
    registerCleanup(() => controls.removeEventListener('change', onControlsChange))

    updateAnimationLoop()

    return {
      setRoutes(incomingRoutes) {
        if (disposed) return

        const snapshot = createEarthRenderSnapshot(incomingRoutes)
        const topologyChanged = snapshot.signature !== currentSignature
        currentSignature = snapshot.signature
        if (topologyChanged) clearEndpointInteraction()
        globeLayer.setSnapshot(snapshot, topologyChanged)
        routeLayer.setSnapshot(snapshot, topologyChanged)
        const endpoints = endpointLayer.setSnapshot(snapshot, topologyChanged)
        cityLabelLayer.setEndpoints(endpoints)
        if (reducedMotion) render()
      },
      setInitialLocation(location) {
        if (
          disposed ||
          initialLocationSet ||
          !Number.isFinite(location.latitude) ||
          !Number.isFinite(location.longitude)
        ) {
          return
        }

        initialLocationSet = true
        const distance = camera.position.distanceTo(controls.target)
        const direction = toEarthVector({
          latitude: THREE.MathUtils.clamp(
            location.latitude,
            -MAX_INITIAL_LATITUDE,
            MAX_INITIAL_LATITUDE,
          ),
          longitude: location.longitude,
        })
          .applyQuaternion(earthGroup.quaternion)
          .normalize()
        camera.position.copy(controls.target).addScaledVector(direction, distance)
        controls.update()
        render()
      },
      setReducedMotion(value) {
        if (disposed) return
        reducedMotion = value
        updateAnimationLoop()
      },
      setAutoRotation(enabled) {
        if (disposed) return
        autoRotation = enabled
      },
      setCityLabelsVisible(nextVisible) {
        if (disposed) return
        cityLabelLayer.setVisible(nextVisible)
        render()
      },
      setVisualMode(mode) {
        if (disposed || visualMode === mode) return
        visualMode = mode
        if (mode === 'dots') clearEndpointInteraction()
        globeLayer.setVisualMode(mode)
        routeLayer.setVisualMode(mode)
        endpointLayer.setVisualMode(mode)
        render()
      },
      setColorScheme(scheme) {
        if (disposed || colorScheme === scheme) return
        colorScheme = scheme
        globeLayer.setColorScheme(scheme)
        routeLayer.setColorScheme(scheme)
        if (visualMode !== 'space') render()
      },
      dispose: disposeResources,
    }
  } catch (error) {
    try {
      disposeResources()
    } catch {
      // Preserve the initialization error while still attempting every cleanup.
    }
    throw error
  }
}
