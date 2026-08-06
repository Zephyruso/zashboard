import { getGeoIPLocation, type GeoIPLocation } from '@/api/geoip'
import { connectionAccessor } from '@/assembly/connections'
import { proxyMap } from '@/assembly/proxies'
import type { Connection } from '@/types'
import { parseConnectionIP, resolveConnectionIP } from './connectionDns'

export { parseConnectionIP } from './connectionDns'

export type RouteLegKind = 'relay' | 'destination' | 'direct'
export type RouteCoordinate = [number, number]

export interface ConnectionRouteLeg {
  kind: RouteLegKind
  coordinates: RouteCoordinate[]
  endpoint: GeoIPLocation
}

export interface ConnectionRoute {
  id: string
  signature: string
  upload: number
  download: number
  legs: ConnectionRouteLeg[]
}

type RouteKind = 'direct' | 'proxy' | 'blocked' | 'internal'

interface RouteEndpoints {
  id: string
  kind: 'direct' | 'proxy'
  relayIP?: string
  destinationIP?: string
}

const BLOCKED_ADAPTERS = new Set(['reject', 'rejectdrop', 'reject-drop'])
const INTERNAL_ADAPTERS = new Set(['dns', 'pass', 'passrule', 'pass-rule', 'rematch'])

const classifyRoute = (connection: Connection): RouteKind => {
  const accessor = connectionAccessor()
  const leaf = accessor.chains(connection)[0]?.trim()
  const adapter = (
    (leaf ? proxyMap.value[leaf]?.type : undefined) ||
    accessor.outboundType(connection) ||
    leaf
  )?.toLowerCase()

  if (!adapter) return 'direct'
  if (adapter === 'direct' || adapter === 'compatible') return 'direct'
  if (BLOCKED_ADAPTERS.has(adapter)) return 'blocked'
  if (INTERNAL_ADAPTERS.has(adapter)) return 'internal'

  return 'proxy'
}

const getRouteEndpoints = async (connection: Connection): Promise<RouteEndpoints | null> => {
  const accessor = connectionAccessor()
  const kind = classifyRoute(connection)

  if (kind === 'blocked' || kind === 'internal') return null

  const [remoteIP, destinationIP] = await Promise.all([
    resolveConnectionIP(accessor.remoteAddress(connection)),
    Promise.resolve(
      parseConnectionIP(accessor.destination(connection)) ||
        accessor
          .destinationAddresses(connection)
          .map(parseConnectionIP)
          .find((address) => address !== undefined),
    ),
  ])

  if (kind === 'direct') {
    return {
      id: connection.id,
      kind,
      // For TCP DIRECT, remoteDestination is the address actually dialed.
      // UDP and compatible backends may omit it, so fall back to destinationIP.
      destinationIP: remoteIP || destinationIP,
    }
  }

  return {
    id: connection.id,
    kind,
    // L3 tunnel outbounds can report the destination as the remote address.
    // Equal addresses do not form a real intermediate hop.
    relayIP: remoteIP && remoteIP !== destinationIP ? remoteIP : undefined,
    destinationIP,
  }
}

const unwrapCoordinates = (coordinates: number[][]): RouteCoordinate[] => {
  if (!coordinates.length) return []

  const unwrapped: RouteCoordinate[] = [[coordinates[0][0], coordinates[0][1]]]

  for (const coordinate of coordinates.slice(1)) {
    let longitude = coordinate[0]
    const previousLongitude = unwrapped.at(-1)![0]

    while (longitude - previousLongitude >= 180) longitude -= 360
    while (longitude - previousLongitude < -180) longitude += 360
    unwrapped.push([longitude, coordinate[1]])
  }

  return unwrapped
}

const greatCircleCoordinates = (from: RouteCoordinate, to: RouteCoordinate) => {
  const toCartesian = ([longitude, latitude]: RouteCoordinate) => {
    const longitudeRadians = (longitude * Math.PI) / 180
    const latitudeRadians = (latitude * Math.PI) / 180
    const latitudeCosine = Math.cos(latitudeRadians)

    return [
      latitudeCosine * Math.cos(longitudeRadians),
      latitudeCosine * Math.sin(longitudeRadians),
      Math.sin(latitudeRadians),
    ]
  }
  const fromVector = toCartesian(from)
  const toVector = toCartesian(to)
  const angle = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        fromVector[0] * toVector[0] + fromVector[1] * toVector[1] + fromVector[2] * toVector[2],
      ),
    ),
  )
  const angleSine = Math.sin(angle)
  const coordinates: number[][] = []

  for (let index = 0; index < 48; index += 1) {
    const progress = index / 47

    if (Math.abs(angleSine) < 1e-6) {
      let longitudeDelta = to[0] - from[0]

      if (longitudeDelta > 180) longitudeDelta -= 360
      if (longitudeDelta < -180) longitudeDelta += 360
      coordinates.push([
        from[0] + longitudeDelta * progress,
        from[1] + (to[1] - from[1]) * progress,
      ])
      continue
    }

    const fromWeight = Math.sin((1 - progress) * angle) / angleSine
    const toWeight = Math.sin(progress * angle) / angleSine
    const x = fromVector[0] * fromWeight + toVector[0] * toWeight
    const y = fromVector[1] * fromWeight + toVector[1] * toWeight
    const z = fromVector[2] * fromWeight + toVector[2] * toWeight

    coordinates.push([
      (Math.atan2(y, x) * 180) / Math.PI,
      (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
    ])
  }

  return unwrapCoordinates(coordinates)
}

const makeLeg = (
  from: GeoIPLocation,
  to: GeoIPLocation,
  kind: RouteLegKind,
): ConnectionRouteLeg | null => {
  if (from.latitude === to.latitude && from.longitude === to.longitude) return null

  return {
    kind,
    coordinates: greatCircleCoordinates(
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ),
    endpoint: to,
  }
}

/**
 * Convert one active connection into a small route model:
 * own IP -> relay -> destination, or own IP -> destination for DIRECT.
 */
export const resolveConnectionRoute = async (
  connection: Connection,
  origin: GeoIPLocation,
): Promise<ConnectionRoute | null> => {
  const accessor = connectionAccessor()
  const endpoints = await getRouteEndpoints(connection)

  if (!endpoints?.destinationIP && !endpoints?.relayIP) return null

  const [relay, destination] = await Promise.all([
    endpoints.relayIP ? getGeoIPLocation(endpoints.relayIP) : null,
    endpoints.destinationIP ? getGeoIPLocation(endpoints.destinationIP) : null,
  ])
  const legs: ConnectionRouteLeg[] = []

  if (endpoints.kind === 'direct') {
    if (destination) {
      const leg = makeLeg(origin, destination, 'direct')

      if (leg) legs.push(leg)
    }
  } else {
    let routeStart = origin

    if (relay) {
      const relayLeg = makeLeg(origin, relay, 'relay')

      if (relayLeg) legs.push(relayLeg)
      routeStart = relay
    }

    if (destination) {
      const destinationLeg = makeLeg(routeStart, destination, 'destination')

      if (destinationLeg) legs.push(destinationLeg)
    }
  }

  if (!legs.length) return null

  return {
    id: endpoints.id,
    signature: [origin.ip, endpoints.kind, endpoints.relayIP, endpoints.destinationIP].join('|'),
    upload: Math.max(0, accessor.upload(connection)),
    download: Math.max(0, accessor.download(connection)),
    legs,
  }
}
