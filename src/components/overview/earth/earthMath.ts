import * as THREE from 'three/webgpu'
import type { EarthLocation } from './types'

export const EARTH_RADIUS = 1
export const ENDPOINT_RADIUS = 1.005

const ARC_SEGMENTS = 36

export const toEarthVector = ({
  latitude,
  longitude,
}: Pick<EarthLocation, 'latitude' | 'longitude'>) => {
  const latitudeRadians = THREE.MathUtils.degToRad(latitude)
  const longitudeRadians = THREE.MathUtils.degToRad(longitude)
  const cosLatitude = Math.cos(latitudeRadians)

  return new THREE.Vector3(
    cosLatitude * Math.cos(longitudeRadians),
    Math.sin(latitudeRadians),
    -cosLatitude * Math.sin(longitudeRadians),
  )
}

// NOAA's fractional-year approximation gives the current solar declination and
// equation of time. The resulting vector is expressed in the globe's local
// longitude/latitude coordinate system, so the day/night boundary stays attached
// to real geography even while the presentation group slowly rotates.
export const getRealtimeSunDirection = (date = new Date(), target = new THREE.Vector3()) => {
  const year = date.getUTCFullYear()
  const startOfYear = Date.UTC(year, 0, 1)
  const startOfDay = Date.UTC(year, date.getUTCMonth(), date.getUTCDate())
  const dayOfYear = Math.floor((startOfDay - startOfYear) / 86_400_000) + 1
  const daysInYear = (Date.UTC(year + 1, 0, 1) - startOfYear) / 86_400_000
  const minutesUTC = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60
  const fractionalHour = minutesUTC / 60
  const gamma = (2 * Math.PI * (dayOfYear - 1 + (fractionalHour - 12) / 24)) / daysInYear
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)
  const longitude = THREE.MathUtils.degToRad((720 - minutesUTC - equationOfTime) / 4)
  const cosDeclination = Math.cos(declination)

  return target
    .set(
      cosDeclination * Math.cos(longitude),
      Math.sin(declination),
      -cosDeclination * Math.sin(longitude),
    )
    .normalize()
}

// Quaternion interpolation follows the shortest spherical path, including paths that
// cross +/-180 degrees longitude. It also has a deterministic antipodal fallback.
export const createGreatCircleBetweenVectors = (
  from: THREE.Vector3,
  to: THREE.Vector3,
  surfaceRadius = EARTH_RADIUS,
) => {
  const start = from.clone().normalize()
  const end = to.clone().normalize()
  const rotation = new THREE.Quaternion().setFromUnitVectors(start, end)
  const identity = new THREE.Quaternion()
  const angle = Math.acos(THREE.MathUtils.clamp(start.dot(end), -1, 1))
  const height = 0.075 + Math.min(0.22, angle * 0.095)
  const points: THREE.Vector3[] = []

  for (let index = 0; index <= ARC_SEGMENTS; index += 1) {
    const progress = index / ARC_SEGMENTS
    const orientation = new THREE.Quaternion().slerpQuaternions(identity, rotation, progress)
    const radius = surfaceRadius + Math.sin(Math.PI * progress) * height

    points.push(start.clone().applyQuaternion(orientation).normalize().multiplyScalar(radius))
  }

  return points
}

export const createGreatCircle = (from: EarthLocation, to: EarthLocation) =>
  createGreatCircleBetweenVectors(toEarthVector(from), toEarthVector(to))

export const sampleEarthPath = (
  points: readonly THREE.Vector3[],
  progress: number,
  target: THREE.Vector3,
) => {
  if (points.length === 0) return target.set(0, 0, 0)
  if (points.length === 1) return target.copy(points[0])

  const scaled = THREE.MathUtils.clamp(progress, 0, 1) * (points.length - 1)
  const index = Math.min(points.length - 2, Math.floor(scaled))

  return target.lerpVectors(points[index], points[index + 1], scaled - index)
}
