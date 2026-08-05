import { getGeoIPLocation, getIPFromIpipnetAPI, getIPInfo, type GeoIPLocation } from '@/api/geoip'
import {
  parseConnectionIP,
  resolveConnectionRoute,
  type ConnectionRoute,
} from '@/components/earth/connectionRoutes'
import { activeConnections } from '@/store/connections'
import { IPInfoAPI } from '@/store/settings'
import { useStorage } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

export type OriginSource = 'global' | 'china'

export interface OriginOption {
  value: OriginSource
  label: string
  ip: string
}

export const useEarthRoutes = () => {
  const originSource = useStorage<OriginSource>('config/earth-origin-source', 'global')
  const originOptions = ref<OriginOption[]>([])
  const originOptionsLoading = ref(false)
  const originLocationLoading = ref(false)
  const originFailed = ref(false)
  const originLocation = shallowRef<GeoIPLocation | null>(null)
  const routes = shallowRef<Map<string, ConnectionRoute>>(new Map())
  const locatedConnections = ref(0)

  let originRequest = 0
  let originLookupRequest = 0
  let routesRequest = 0
  let disposed = false

  const selectedOriginIP = computed(
    () => originOptions.value.find((option) => option.value === originSource.value)?.ip ?? '',
  )
  const isOriginLoading = computed(() => originOptionsLoading.value || originLocationLoading.value)
  const activeConnectionCount = computed(() => activeConnections.value.length)

  const refreshRoutes = async () => {
    const request = ++routesRequest
    const origin = originLocation.value
    const connections = activeConnections.value

    if (!origin) {
      locatedConnections.value = 0
      routes.value = new Map()
      return
    }

    const resolved = await Promise.allSettled(
      connections.map((connection) => resolveConnectionRoute(connection, origin)),
    )

    if (disposed || request !== routesRequest) return

    const nextRoutes = new Map<string, ConnectionRoute>()

    for (const result of resolved) {
      if (result.status === 'fulfilled' && result.value) {
        nextRoutes.set(result.value.id, result.value)
      }
    }

    locatedConnections.value = nextRoutes.size
    originFailed.value ||= resolved.some((result) => result.status === 'rejected')
    routes.value = nextRoutes
  }

  const loadOriginOptions = async () => {
    const request = ++originRequest
    originOptionsLoading.value = true
    originFailed.value = false
    const [globalResult, chinaResult] = await Promise.allSettled([
      getIPInfo(),
      getIPFromIpipnetAPI(),
    ])

    if (disposed || request !== originRequest) return

    const options: OriginOption[] = []

    if (globalResult.status === 'fulfilled') {
      const ip = parseConnectionIP(globalResult.value.ip)

      if (ip) options.push({ value: 'global', label: `${IPInfoAPI.value} · ${ip}`, ip })
    }

    if (chinaResult.status === 'fulfilled') {
      const ip = parseConnectionIP(chinaResult.value.data.ip)

      if (ip) options.push({ value: 'china', label: `ipip.net · ${ip}`, ip })
    }

    originOptions.value = options
    originOptionsLoading.value = false
    originFailed.value = options.length === 0

    if (!options.some((option) => option.value === originSource.value) && options[0]) {
      originSource.value = options[0].value
    }
  }

  watch(
    selectedOriginIP,
    async (ip) => {
      const request = ++originLookupRequest
      originLocationLoading.value = Boolean(ip)
      originLocation.value = null
      routes.value = new Map()

      if (!ip) {
        originLocationLoading.value = false
        return
      }

      try {
        const location = await getGeoIPLocation(ip)

        if (disposed || request !== originLookupRequest) return
        originLocation.value = location
        originFailed.value ||= !location
      } catch {
        if (disposed || request !== originLookupRequest) return
        originFailed.value = true
      } finally {
        if (request === originLookupRequest) originLocationLoading.value = false
      }
    },
    { immediate: true },
  )

  watch(activeConnections, () => void refreshRoutes(), { immediate: true })
  watch(originLocation, () => void refreshRoutes())
  watch(IPInfoAPI, () => void loadOriginOptions(), { immediate: true })

  onBeforeUnmount(() => {
    disposed = true
    originRequest += 1
    originLookupRequest += 1
    routesRequest += 1
  })

  return {
    activeConnectionCount,
    isOriginLoading,
    loadOriginOptions,
    locatedConnections,
    originFailed,
    originLocation,
    originOptions,
    originOptionsLoading,
    originSource,
    routes,
  }
}
