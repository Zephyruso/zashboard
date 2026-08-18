import * as THREE from 'three/webgpu'
import { EARTH_RADIUS } from './earthMath'

export const DOT_COUNT = 18_000
export const DOT_RADIUS = EARTH_RADIUS * 1.002

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export const DOT_POSITIONS = new Float32Array(DOT_COUNT * 3)
export const DOT_TEXTURE_COORDINATES = new Float32Array(DOT_COUNT * 2)

for (let index = 0; index < DOT_COUNT; index += 1) {
  const y = 1 - (2 * (index + 0.5)) / DOT_COUNT
  const horizontalRadius = Math.sqrt(1 - y * y)
  const longitude = index * GOLDEN_ANGLE
  const x = Math.cos(longitude) * horizontalRadius
  const z = Math.sin(longitude) * horizontalRadius
  const positionOffset = index * 3
  const uvOffset = index * 2

  DOT_POSITIONS[positionOffset] = x * DOT_RADIUS
  DOT_POSITIONS[positionOffset + 1] = y * DOT_RADIUS
  DOT_POSITIONS[positionOffset + 2] = z * DOT_RADIUS
  DOT_TEXTURE_COORDINATES[uvOffset] = Math.atan2(-z, x) / (Math.PI * 2) + 0.5
  DOT_TEXTURE_COORDINATES[uvOffset + 1] = Math.asin(y) / Math.PI + 0.5
}

export const findNearestDotIndex = (position: THREE.Vector3) => {
  let nearestIndex = 0
  let nearestDot = -Infinity

  for (let index = 0; index < DOT_COUNT; index += 1) {
    const offset = index * 3
    const dot =
      DOT_POSITIONS[offset] * position.x +
      DOT_POSITIONS[offset + 1] * position.y +
      DOT_POSITIONS[offset + 2] * position.z

    if (dot > nearestDot) {
      nearestDot = dot
      nearestIndex = index
    }
  }

  return nearestIndex
}

export const getDotPosition = (index: number, target = new THREE.Vector3()) => {
  const offset = index * 3

  return target.set(DOT_POSITIONS[offset], DOT_POSITIONS[offset + 1], DOT_POSITIONS[offset + 2])
}

export const snapToNearestDot = (position: THREE.Vector3, target = new THREE.Vector3()) =>
  getDotPosition(findNearestDotIndex(position), target)
