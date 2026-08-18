import {
  cameraPosition,
  float,
  mix,
  normalize,
  normalLocal,
  normalWorldGeometry,
  output,
  positionWorld,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import * as THREE from 'three/webgpu'
import type { EarthRenderEndpoint, EarthRenderSnapshot, EarthVisualMode } from './rendererTypes'

const ENDPOINT_CORE_RADIUS = 0.011
const ENDPOINT_GLOW_RADIUS = 0.032
const ROLE_COLORS = {
  origin: new THREE.Color('#ffffff'),
  destination: new THREE.Color('#79d8ff'),
} as const
const ROLE_GLOW_COLORS = {
  origin: new THREE.Color('#a9e9ff'),
  destination: new THREE.Color('#3fa8ff'),
} as const
// The user's own location is the anchor of every arc, so it gets a slightly
// wider bead and halo than the destinations radiating out of it.
const ROLE_SCALES = {
  origin: 1.18,
  destination: 1,
} as const

interface EndpointLayerOptions {
  earthGroup: THREE.Group
  camera: THREE.Camera
  visualMode: EarthVisualMode
  sunDirection: THREE.Vector3
}

interface PointerBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface EndpointLayer {
  setSnapshot: (
    snapshot: EarthRenderSnapshot,
    topologyChanged: boolean,
  ) => readonly EarthRenderEndpoint[]
  setVisualMode: (mode: EarthVisualMode) => void
  setSunDirection: (direction: THREE.Vector3) => void
  update: (delta: number) => void
  hitTest: (clientX: number, clientY: number, bounds: PointerBounds) => EarthRenderEndpoint | null
  dispose: () => void
}

export const createEndpointLayer = (options: EndpointLayerOptions): EndpointLayer => {
  const { camera, earthGroup } = options
  // Endpoints are unlit beads, so their volume has to be faked in the shader:
  // `facing` is 1 at the point of the sphere aimed straight at the camera and 0
  // along the silhouette, which drives both the specular-like hot core and the
  // rim light that separates the bead from the globe behind it.
  const endpointPulse = uniform(1)
  const endpointFacing = positionWorld
    .sub(cameraPosition)
    .normalize()
    .dot(normalWorldGeometry)
    .abs()
    .toVar()
  const sunDirection = uniform(options.sunDirection.clone())
  const endpointSunOrientation = normalLocal.dot(normalize(sunDirection))
  const endpointShade = float(0.7).add(endpointSunOrientation.smoothstep(-0.7, 0.9).mul(0.5))
  const endpointRim = endpointFacing.oneMinus().pow(2.6).mul(0.85)
  const endpointHotCore = endpointFacing.pow(8).mul(0.5)
  const endpointGeometry = new THREE.SphereGeometry(ENDPOINT_CORE_RADIUS, 12, 8)
  const endpointMaterial = new THREE.MeshBasicNodeMaterial()
  const flatEndpointMaterial = new THREE.MeshBasicNodeMaterial()

  endpointMaterial.outputNode = vec4(
    output.rgb
      .mul(endpointShade.add(endpointRim))
      .add(mix(output.rgb, vec3(1), 0.65).mul(endpointHotCore)),
    output.a,
  )

  // A halo shell around each bead. Combining a wide and a tight falloff in one
  // shader gives a dense centre that fades out smoothly, without a second mesh.
  const endpointGlowGeometry = new THREE.SphereGeometry(ENDPOINT_GLOW_RADIUS, 16, 12)
  const endpointGlowMaterial = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  endpointGlowMaterial.outputNode = vec4(
    output.rgb,
    endpointFacing
      .pow(2.4)
      .mul(0.34)
      .add(endpointFacing.pow(9).mul(0.5))
      .mul(endpointPulse)
      .clamp(0, 1),
  )

  let endpointMesh: THREE.InstancedMesh | null = null
  let endpointGlowMesh: THREE.InstancedMesh | null = null
  let endpoints: readonly EarthRenderEndpoint[] = []
  let visualMode = options.visualMode
  let pulseTime = 0
  let disposed = false
  const matrix = new THREE.Matrix4()
  const endpointRotation = new THREE.Quaternion()
  const endpointScale = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const cloneEndpoint = (endpoint: EarthRenderEndpoint): EarthRenderEndpoint => ({
    ...endpoint,
    position: endpoint.position.clone(),
    topHosts: endpoint.topHosts.map((host) => ({ ...host })),
  })

  const rebuildMeshes = () => {
    if (endpointMesh) {
      earthGroup.remove(endpointMesh)
      endpointMesh.dispose()
    }
    if (endpointGlowMesh) {
      earthGroup.remove(endpointGlowMesh)
      endpointGlowMesh.dispose()
    }

    const capacity = Math.max(1, endpoints.length)
    endpointMesh = new THREE.InstancedMesh(
      endpointGeometry,
      visualMode === 'flat' ? flatEndpointMaterial : endpointMaterial,
      capacity,
    )
    endpointGlowMesh = new THREE.InstancedMesh(endpointGlowGeometry, endpointGlowMaterial, capacity)
    endpointMesh.count = endpoints.length
    endpointGlowMesh.count = endpoints.length
    endpointMesh.visible = visualMode !== 'dots'
    endpointGlowMesh.visible = visualMode === 'space'
    endpointRotation.identity()

    for (let index = 0; index < endpoints.length; index += 1) {
      const endpoint = endpoints[index]
      const scale = ROLE_SCALES[endpoint.role]

      matrix.compose(endpoint.position, endpointRotation, endpointScale.setScalar(scale))
      endpointMesh.setMatrixAt(index, matrix)
      endpointGlowMesh.setMatrixAt(index, matrix)
      endpointMesh.setColorAt(index, ROLE_COLORS[endpoint.role])
      endpointGlowMesh.setColorAt(index, ROLE_GLOW_COLORS[endpoint.role])
    }

    endpointMesh.instanceMatrix.needsUpdate = true
    endpointGlowMesh.instanceMatrix.needsUpdate = true
    if (endpointMesh.instanceColor) endpointMesh.instanceColor.needsUpdate = true
    if (endpointGlowMesh.instanceColor) endpointGlowMesh.instanceColor.needsUpdate = true
    // Draw the beads above the arcs and the halos last, so the additive glow
    // blends over everything already on screen.
    endpointMesh.renderOrder = 5
    endpointGlowMesh.renderOrder = 6
    earthGroup.add(endpointMesh, endpointGlowMesh)
  }

  return {
    setSnapshot(snapshot, topologyChanged) {
      if (disposed) return endpoints

      if (topologyChanged) {
        endpoints = snapshot.endpoints.map(cloneEndpoint)
        rebuildMeshes()
      } else {
        const nextByKey = new Map(snapshot.endpoints.map((endpoint) => [endpoint.key, endpoint]))

        for (const endpoint of endpoints) {
          const next = nextByKey.get(endpoint.key)

          if (next) {
            endpoint.city = next.city
            endpoint.country = next.country
            endpoint.connections = next.connections
            endpoint.topHosts = next.topHosts.map((host) => ({ ...host }))
          }
        }
      }

      return endpoints
    },
    setVisualMode(mode) {
      if (disposed || visualMode === mode) return
      visualMode = mode
      if (endpointMesh) {
        endpointMesh.material = mode === 'flat' ? flatEndpointMaterial : endpointMaterial
        endpointMesh.visible = mode !== 'dots'
      }
      if (endpointGlowMesh) endpointGlowMesh.visible = mode === 'space'
    },
    setSunDirection(direction) {
      if (disposed) return
      sunDirection.value.copy(direction)
    },
    update(delta) {
      if (disposed) return
      pulseTime += delta
      endpointPulse.value = 0.82 + Math.sin(pulseTime * 2.1) * 0.18
    },
    hitTest(clientX, clientY, bounds) {
      if (disposed || visualMode === 'dots' || !endpointGlowMesh || endpoints.length === 0) {
        return null
      }

      pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      // The halo shares the bead's instance order and is a far easier target to
      // hit than the core.
      const hit = raycaster.intersectObject(endpointGlowMesh, false)[0]

      if (hit?.instanceId == null) return null
      return endpoints[hit.instanceId] ?? null
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (endpointMesh) {
        earthGroup.remove(endpointMesh)
        endpointMesh.dispose()
        endpointMesh = null
      }
      if (endpointGlowMesh) {
        earthGroup.remove(endpointGlowMesh)
        endpointGlowMesh.dispose()
        endpointGlowMesh = null
      }
      endpoints = []
      endpointGeometry.dispose()
      endpointGlowGeometry.dispose()
      endpointMaterial.dispose()
      flatEndpointMaterial.dispose()
      endpointGlowMaterial.dispose()
    },
  }
}
