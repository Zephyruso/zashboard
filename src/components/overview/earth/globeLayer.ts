import backgroundTextureURL from '@/assets/images/earth/background.jpg'
import dayTextureURL from '@/assets/images/earth/earth-day.webp'
import nightTextureURL from '@/assets/images/earth/earth-night.webp'
import surfaceTextureURL from '@/assets/images/earth/earth-surface.webp'
import {
  bumpMap,
  cameraPosition,
  color,
  instancedBufferAttribute,
  max,
  mix,
  normalize,
  normalLocal,
  normalWorldGeometry,
  output,
  positionWorld,
  shapeCircle,
  step,
  texture,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl'
import * as THREE from 'three/webgpu'
import { DOT_COUNT, DOT_POSITIONS, DOT_TEXTURE_COORDINATES, findNearestDotIndex } from './dotGlobe'
import { EARTH_RADIUS } from './earthMath'
import type { EarthColorScheme, EarthRenderSnapshot, EarthVisualMode } from './rendererTypes'

const GLOBE_PALETTES = {
  light: {
    ocean: '#dce6f0',
    land: '#65788d',
  },
  dark: {
    ocean: '#243241',
    land: '#8ca2b8',
  },
} as const

interface GlobeLayerOptions {
  scene: THREE.Scene
  earthGroup: THREE.Group
  renderer: THREE.WebGPURenderer
  visualMode: EarthVisualMode
  colorScheme: EarthColorScheme
  sunDirection: THREE.Vector3
}

export interface GlobeLayer {
  setSnapshot: (snapshot: EarthRenderSnapshot, topologyChanged: boolean) => void
  setVisualMode: (mode: EarthVisualMode) => void
  setColorScheme: (scheme: EarthColorScheme) => void
  setSunDirection: (direction: THREE.Vector3) => void
  syncSunLight: () => void
  dispose: () => void
}

const loadEarthTextures = async () => {
  const loader = new THREE.TextureLoader()
  const results = await Promise.allSettled([
    loader.loadAsync(backgroundTextureURL),
    loader.loadAsync(dayTextureURL),
    loader.loadAsync(nightTextureURL),
    loader.loadAsync(surfaceTextureURL),
  ])
  const textures: THREE.Texture[] = []
  let failed = false
  let failure: unknown

  for (const result of results) {
    if (result.status === 'fulfilled') {
      textures.push(result.value)
    } else {
      if (!failed) failure = result.reason
      failed = true
    }
  }

  if (failed) {
    textures.forEach((texture) => texture.dispose())
    throw failure
  }

  return textures as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture]
}

export const createGlobeLayer = async (options: GlobeLayerOptions): Promise<GlobeLayer> => {
  const { scene, earthGroup, renderer } = options
  const textures = await loadEarthTextures()
  const [backgroundTexture, dayTexture, nightTexture, surfaceTexture] = textures

  backgroundTexture.mapping = THREE.EquirectangularReflectionMapping
  backgroundTexture.colorSpace = THREE.SRGBColorSpace
  dayTexture.colorSpace = THREE.SRGBColorSpace
  nightTexture.colorSpace = THREE.SRGBColorSpace
  dayTexture.anisotropy = 8
  nightTexture.anisotropy = 8
  surfaceTexture.anisotropy = 8

  const sun = new THREE.DirectionalLight('#ffffff', 2)
  sun.position.set(0, 0.25, 3)
  scene.add(sun)

  const atmosphereDayColor = uniform(color('#4db2ff'))
  const atmosphereTwilightColor = uniform(color('#bc490b'))
  const roughnessLow = uniform(0.25)
  const roughnessHigh = uniform(0.38)
  const sunDirection = uniform(options.sunDirection.clone())
  const viewDirection = positionWorld.sub(cameraPosition).normalize()
  const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar()
  const sunOrientation = normalLocal.dot(normalize(sunDirection)).toVar()
  const atmosphereColor = mix(
    atmosphereTwilightColor,
    atmosphereDayColor,
    sunOrientation.smoothstep(-0.25, 0.75),
  )
  const cloudsStrength = texture(surfaceTexture, uv()).b.smoothstep(0.2, 1)
  const globeMaterial = new THREE.MeshStandardNodeMaterial()

  globeMaterial.colorNode = mix(texture(dayTexture), vec3(1), cloudsStrength.mul(2))
  globeMaterial.roughnessNode = max(texture(surfaceTexture).g, step(0.01, cloudsStrength)).remap(
    0,
    1,
    roughnessLow,
    roughnessHigh,
  )

  const night = texture(nightTexture)
  const dayStrength = sunOrientation.smoothstep(-0.25, 0.5)
  const atmosphereDayStrength = sunOrientation.smoothstep(-0.5, 1)
  const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0, 1)
  let finalOutput = mix(night.rgb, output.rgb, dayStrength)
  finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix)
  globeMaterial.outputNode = vec4(finalOutput, output.a)
  globeMaterial.normalNode = bumpMap(max(texture(surfaceTexture).r, cloudsStrength))

  // The surface texture separates land (green channel) from water (blue channel),
  // keeping the same coastline in the flat and dot renderers without photo shading.
  const oceanColor = uniform(new THREE.Color())
  const landColor = uniform(new THREE.Color())
  const flatSurface = texture(surfaceTexture, uv())
  const flatLandMask = flatSurface.g.sub(flatSurface.b).smoothstep(0.02, 0.16)
  const flatGlobeMaterial = new THREE.MeshBasicNodeMaterial()

  flatGlobeMaterial.colorNode = mix(oceanColor, landColor, flatLandMask)
  flatGlobeMaterial.toneMapped = false

  const dotDestinationColor = uniform(new THREE.Color('#ffb35c'))
  const dotOriginColor = uniform(new THREE.Color('#ff56d7'))
  const dotAttributes = {
    position: new THREE.InstancedBufferAttribute(DOT_POSITIONS, 3),
    uv: new THREE.InstancedBufferAttribute(DOT_TEXTURE_COORDINATES, 2),
    endpointRole: new THREE.InstancedBufferAttribute(new Float32Array(DOT_COUNT), 1),
  }
  const dotPosition = instancedBufferAttribute(dotAttributes.position)
  const dotTextureCoordinate = instancedBufferAttribute(dotAttributes.uv)
  const dotEndpointRole = instancedBufferAttribute<'float'>(dotAttributes.endpointRole, 'float')
  const dotSurface = texture(surfaceTexture, dotTextureCoordinate)
  const dotLandMask = dotSurface.g.sub(dotSurface.b).smoothstep(0.02, 0.16)
  const dotMaterial = new THREE.PointsNodeMaterial({
    alphaToCoverage: true,
    sizeAttenuation: false,
  })

  dotMaterial.positionNode = dotPosition
  dotMaterial.sizeNode = uniform(2.15)
  const dotBaseColor = mix(oceanColor, landColor, dotLandMask)
  const dotEndpointColor = mix(
    dotBaseColor,
    dotDestinationColor,
    dotEndpointRole.smoothstep(0.5, 1),
  )
  dotMaterial.colorNode = mix(dotEndpointColor, dotOriginColor, dotEndpointRole.smoothstep(1.5, 2))
  dotMaterial.opacityNode = shapeCircle()
  dotMaterial.toneMapped = false

  // Instanced sprites are the documented WebGPU path for points wider than one
  // physical pixel. The hidden core only writes depth, so the card background stays
  // visible through the gaps while points and routes on the far side remain occluded.
  const dotGlobe = new THREE.Sprite(dotMaterial as unknown as THREE.SpriteMaterial)
  dotGlobe.count = DOT_COUNT
  dotGlobe.frustumCulled = false
  const dotDepthMaterial = new THREE.MeshBasicNodeMaterial({ colorWrite: false })
  const dotDepthGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 0.998, 48, 32),
    dotDepthMaterial,
  )
  dotDepthGlobe.renderOrder = -1
  earthGroup.add(dotDepthGlobe, dotGlobe)

  const sphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const globe = new THREE.Mesh<THREE.SphereGeometry, THREE.Material>(sphereGeometry, globeMaterial)
  earthGroup.add(globe)

  const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  })
  let atmosphereAlpha = fresnel.remap(0.73, 1, 1, 0).pow(3)
  atmosphereAlpha = atmosphereAlpha.mul(sunOrientation.smoothstep(-0.5, 1))
  atmosphereMaterial.outputNode = vec4(atmosphereColor, atmosphereAlpha)
  const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial)
  atmosphere.scale.setScalar(1.045)
  earthGroup.add(atmosphere)

  let visualMode = options.visualMode
  let colorScheme = options.colorScheme
  let disposed = false

  const applyColorScheme = () => {
    const palette = GLOBE_PALETTES[colorScheme]

    oceanColor.value.set(palette.ocean)
    landColor.value.set(palette.land)
  }

  const applyVisualMode = () => {
    const space = visualMode === 'space'
    const dots = visualMode === 'dots'

    scene.background = space ? backgroundTexture : null
    renderer.toneMapping = space ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    globe.material = space ? globeMaterial : flatGlobeMaterial
    globe.visible = !dots
    dotGlobe.visible = dots
    dotDepthGlobe.visible = dots
    sun.visible = space
    atmosphere.visible = space
  }

  const syncSunLight = () => {
    if (disposed) return
    sun.position.copy(sunDirection.value).applyQuaternion(earthGroup.quaternion).multiplyScalar(3)
  }

  applyColorScheme()
  applyVisualMode()
  syncSunLight()

  return {
    setSnapshot(snapshot, topologyChanged) {
      if (disposed || !topologyChanged) return
      const endpointRoles = dotAttributes.endpointRole.array as Float32Array

      endpointRoles.fill(0)
      for (const endpoint of snapshot.endpoints) {
        const index = findNearestDotIndex(endpoint.position)
        endpointRoles[index] = Math.max(endpointRoles[index], endpoint.role === 'origin' ? 2 : 1)
      }
      dotAttributes.endpointRole.needsUpdate = true
    },
    setVisualMode(mode) {
      if (disposed || visualMode === mode) return
      visualMode = mode
      applyVisualMode()
    },
    setColorScheme(scheme) {
      if (disposed || colorScheme === scheme) return
      colorScheme = scheme
      applyColorScheme()
    },
    setSunDirection(direction) {
      if (disposed) return
      sunDirection.value.copy(direction)
      syncSunLight()
    },
    syncSunLight,
    dispose() {
      if (disposed) return
      disposed = true
      if (scene.background === backgroundTexture) scene.background = null
      scene.remove(sun)
      earthGroup.remove(globe, atmosphere, dotGlobe, dotDepthGlobe)
      sphereGeometry.dispose()
      dotDepthGlobe.geometry.dispose()
      globeMaterial.dispose()
      flatGlobeMaterial.dispose()
      atmosphereMaterial.dispose()
      dotMaterial.dispose()
      dotDepthMaterial.dispose()
      dotAttributes.position.dispose()
      dotAttributes.uv.dispose()
      dotAttributes.endpointRole.dispose()
      textures.forEach((texture) => texture.dispose())
    },
  }
}
