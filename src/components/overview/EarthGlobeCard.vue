<template>
  <div
    class="earth-globe-card base-container p-4"
    :class="{ 'earth-globe-card--expanded': expanded }"
  >
    <div class="flex items-center justify-between">
      <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
        {{ t('earthGlobeTitle') }}
      </div>
      <div class="flex items-center gap-1">
        <SelectInput
          v-model="earthVisualMode"
          class="select select-ghost select-sm h-8 min-h-8 w-auto border-0"
          :aria-label="t('earthVisualStyle')"
          :title="t('earthVisualStyle')"
          :options="[
            { value: 'space', label: t('earthVisualStyle_space') },
            { value: 'flat', label: t('earthVisualStyle_flat') },
            { value: 'dots', label: t('earthVisualStyle_dots') },
          ]"
        />
        <button
          class="btn btn-ghost btn-sm btn-square"
          :aria-label="t(showCityLabels ? 'earthHideCityLabels' : 'earthShowCityLabels')"
          :title="t(showCityLabels ? 'earthHideCityLabels' : 'earthShowCityLabels')"
          :aria-pressed="showCityLabels"
          @click="toggleCityLabels"
        >
          <MapPinIcon
            class="h-4 w-4"
            :class="{ 'opacity-40': !showCityLabels }"
          />
        </button>
        <button
          class="btn btn-ghost btn-sm btn-square"
          :aria-label="t(rotationPaused ? 'earthResumeRotation' : 'earthPauseRotation')"
          :title="t(rotationPaused ? 'earthResumeRotation' : 'earthPauseRotation')"
          :aria-pressed="rotationPaused"
          @click="toggleRotation"
        >
          <PlayIcon
            v-if="rotationPaused"
            class="h-4 w-4"
          />
          <PauseIcon
            v-else
            class="h-4 w-4"
          />
        </button>
        <button
          class="btn btn-ghost btn-sm btn-square"
          :aria-label="t(expanded ? 'earthCollapse' : 'earthExpand')"
          :title="t(expanded ? 'earthCollapse' : 'earthExpand')"
          :aria-pressed="expanded"
          @click="expanded = !expanded"
        >
          <ArrowsPointingInIcon
            v-if="expanded"
            class="h-4 w-4"
          />
          <ArrowsPointingOutIcon
            v-else
            class="h-4 w-4"
          />
        </button>
      </div>
    </div>

    <div
      class="relative mt-2 w-full overflow-hidden rounded-xl"
      :class="[
        expanded ? 'min-h-0 flex-1' : 'h-96',
        earthVisualMode === 'space' ? 'bg-black' : 'bg-base-200/30',
      ]"
    >
      <div
        ref="canvasRef"
        class="absolute inset-0 touch-none"
        @touchstart.stop
        @touchmove.stop.prevent
        @touchend.stop
        @touchcancel.stop
      />

      <div class="pointer-events-none absolute top-2 right-2 left-2 flex flex-wrap gap-1.5 text-xs">
        <SelectInput
          v-model="earthOriginSource"
          class="select select-sm bg-base-100/75 pointer-events-auto h-8 min-h-8 w-auto rounded-lg border-0 shadow backdrop-blur-md"
          :aria-label="t('earthOriginAPI')"
          :options="[
            { value: 'china', label: 'ipip.info' },
            { value: 'global', label: 'ip.sb' },
          ]"
        />

        <div
          class="bg-base-100/75 pointer-events-auto flex h-8 items-center gap-1.5 rounded-lg px-2 shadow backdrop-blur-md"
        >
          <span class="text-base-content/60">{{ t('earthLocalIP') }}</span>
          <span class="font-mono">{{ displayedOriginIP }}</span>
          <button
            class="btn btn-ghost btn-circle btn-xs"
            :aria-label="t('earthToggleIP')"
            @click="showOriginIP = !showOriginIP"
          >
            <EyeIcon
              v-if="showOriginIP"
              class="h-3.5 w-3.5"
            />
            <EyeSlashIcon
              v-else
              class="h-3.5 w-3.5"
            />
          </button>
        </div>

        <button
          v-if="showRetry"
          class="btn btn-sm btn-square pointer-events-auto"
          :aria-label="t('retry')"
          @click="retry"
        >
          <ArrowPathIcon class="h-4 w-4" />
        </button>
      </div>

      <div
        class="absolute bottom-2 left-2 flex flex-col items-start gap-0.5 text-[10px]"
        :class="earthVisualMode === 'space' ? 'text-white/65' : 'text-base-content/55'"
      >
        <a
          class="hover:underline"
          :class="earthVisualMode === 'space' ? 'hover:text-white' : 'hover:text-base-content'"
          href="https://db-ip.com/db/lite.php"
          target="_blank"
          rel="noopener noreferrer"
        >
          DB-IP City Lite
        </a>
        <a
          class="hover:underline"
          :class="earthVisualMode === 'space' ? 'hover:text-white' : 'hover:text-base-content'"
          href="https://www.solarsystemscope.com/textures/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Solar System Scope · CC BY 4.0
        </a>
      </div>

      <div
        v-if="rendererError"
        class="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      >
        <div
          class="bg-base-100/90 max-w-sm rounded-xl p-4 text-center text-sm shadow-xl backdrop-blur-md"
        >
          <div class="text-error">{{ rendererError }}</div>
        </div>
      </div>

      <div
        v-else-if="databaseStatus === 'checking' || databaseStatus === 'loading-cache'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          class="bg-base-100/85 flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-xl backdrop-blur-md"
        >
          <span class="loading loading-spinner loading-sm" />
          {{ t(databaseStatus === 'checking' ? 'earthDatabaseChecking' : 'earthDatabaseLoading') }}
        </div>
      </div>

      <div
        v-else-if="databaseStatus === 'idle'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      >
        <div
          class="bg-base-100/90 pointer-events-auto max-w-md rounded-xl p-4 text-sm shadow-xl backdrop-blur-md"
        >
          <div class="font-semibold">{{ t('earthDatabaseConsentTitle') }}</div>
          <p class="text-base-content/70 mt-1.5 leading-5">
            {{ t('earthDatabaseConsent', { download: '61.7 MB', stored: '130.2 MB' }) }}
          </p>
          <p
            v-if="recoveredCorruptCache"
            class="text-warning mt-1.5 text-xs"
          >
            {{ t('earthDatabaseCacheRecovered') }}
          </p>
          <div class="mt-3 flex items-center gap-2">
            <button
              class="btn btn-primary btn-sm"
              @click="downloadDatabase"
            >
              {{ t('earthDatabaseDownload') }}
            </button>
            <a
              class="link text-xs"
              href="https://db-ip.com/db/lite.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t('earthDatabaseLearnMore') }}
            </a>
          </div>
        </div>
      </div>

      <div
        v-else-if="databaseStatus === 'downloading'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      >
        <div
          class="bg-base-100/90 pointer-events-auto w-80 max-w-full rounded-xl p-4 text-sm shadow-xl backdrop-blur-md"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="font-semibold">{{ t('earthDatabaseDownloading') }}</span>
            <span class="text-base-content/60 text-xs">{{ downloadProgressLabel }}</span>
          </div>
          <progress
            class="progress progress-primary mt-3 w-full"
            :value="downloadProgress"
            max="100"
          />
          <button
            class="btn btn-ghost btn-sm mt-2"
            @click="cancelDatabaseDownload"
          >
            {{ t('cancel') }}
          </button>
        </div>
      </div>

      <div
        v-else-if="databaseStatus === 'error'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      >
        <div
          class="bg-base-100/90 pointer-events-auto max-w-sm rounded-xl p-4 text-center text-sm shadow-xl backdrop-blur-md"
        >
          <div class="text-error">{{ databaseErrorMessage }}</div>
          <button
            class="btn btn-sm mt-3"
            @click="retry"
          >
            {{ t('retry') }}
          </button>
        </div>
      </div>

      <div
        v-else-if="databaseStatus === 'ready' && originStatus === 'error'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      >
        <div class="bg-base-100/85 rounded-xl px-4 py-3 text-sm shadow-xl backdrop-blur-md">
          {{ t('earthOriginError') }}
        </div>
      </div>

      <div
        v-else-if="showNoData"
        class="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      >
        <div class="bg-base-100/75 rounded-xl px-4 py-3 text-sm shadow backdrop-blur-md">
          {{ activeConnections.length ? t('earthNoLocatedConnections') : t('earthNoConnections') }}
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="hoveredEndpoint"
        class="bg-base-100 border-base-300 pointer-events-none fixed z-[10000] min-w-40 rounded-lg border p-2 text-xs shadow-xl"
        :style="tooltipStyle"
      >
        <div class="font-semibold">
          {{
            [hoveredEndpoint.city, hoveredEndpoint.country].filter(Boolean).join(', ') ||
            t('unknown')
          }}
        </div>
        <div class="text-base-content/65 mt-1">
          {{ t('earthEndpointRole') }}: {{ t(`earthRole_${hoveredEndpoint.role}`) }}
        </div>
        <div class="text-base-content/65">
          {{ t('connectionCount') }}: {{ hoveredEndpoint.connections }}
        </div>
        <div
          v-if="hoveredEndpoint.role === 'destination' && hoveredEndpoint.topHosts.length"
          class="border-base-300 mt-2 border-t pt-1.5"
        >
          <div class="text-base-content/55 mb-1">{{ t('earthTopDownloadedHosts') }}</div>
          <div
            v-for="(item, index) in hoveredEndpoint.topHosts"
            :key="`${item.host}-${index}`"
            class="flex max-w-64 items-center justify-between gap-3 leading-5"
          >
            <span class="min-w-0 truncate font-mono">{{ item.host }}</span>
            <span class="text-base-content/55 shrink-0">{{
              prettyBytesHelper(item.downloaded)
            }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import SelectInput from '@/components/common/SelectInput.vue'
import { getIPFromIpipnetAPI, getIPFromIpsbAPI } from '@/api/geoip'
import { ipForChina, ipForGlobal } from '@/composables/overview'
import { themeColorScheme } from '@/helper/theme'
import { prettyBytesHelper } from '@/helper/utils'
import { activeConnections } from '@/store/connections'
import { earthOriginSource, earthVisualMode, language, theme } from '@/store/settings'
import {
  ArrowPathIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  EyeIcon,
  EyeSlashIcon,
  MapPinIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/vue/24/outline'
import { useMediaQuery } from '@vueuse/core'
import * as ipaddr from 'ipaddr.js'
import type { CSSProperties } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildEarthRoutes } from './earth/routes'
import {
  DBIP_COMPRESSED_BYTES,
  type EarthEndpointInfo,
  type EarthLocation,
  type GeoDatabaseError,
  type GeoDatabaseStatus,
  type GeoWorkerRequest,
  type GeoWorkerResponse,
} from './earth/types'
import type { EarthRenderer } from './earth/earthRenderer'

const { t } = useI18n()
const canvasRef = ref<HTMLElement>()
const renderer = shallowRef<EarthRenderer>()
const rendererError = ref('')
const databaseStatus = ref<GeoDatabaseStatus>('checking')
const databaseError = ref<GeoDatabaseError>()
const recoveredCorruptCache = ref(false)
const downloadedBytes = ref(0)
const downloadTotalBytes = ref(DBIP_COMPRESSED_BYTES)
const originIP = ref('')
const originStatus = ref<'loading' | 'ready' | 'error'>('loading')
const showOriginIP = ref(false)
const showCityLabels = ref(true)
const rotationPaused = ref(false)
const expanded = ref(false)
const routeCount = ref(0)
const routesLoading = ref(false)
const hoveredEndpoint = ref<EarthEndpointInfo | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const locationCache = new Map<string, EarthLocation | null>()
const lookupRequests = new Map<number, (locations: Record<string, EarthLocation | null>) => void>()
let lookupID = 0
let worker: Worker | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let refreshRunning = false
let refreshQueued = false
let disposed = false
let originRequestID = 0

// 初始化 Worker 与 three/webgpu 渲染器开销较大,先让路由切换动画跑完(0.35s)再在空闲时段执行,
// 否则移动端切到概览页时主线程被占满,页面要卡一两秒才出现。
const INIT_DELAY = 400
const INIT_IDLE_TIMEOUT = 1000
let initTimer: ReturnType<typeof setTimeout> | null = null
let initIdleTimer: ReturnType<typeof setTimeout> | null = null
let initIdleHandle: number | null = null

const isValidIP = (value: string) => Boolean(value && ipaddr.isValid(value))

const maskIP = (value: string) => {
  if (!isValidIP(value)) return '—'

  const address = ipaddr.parse(value)

  if (address.kind() === 'ipv4') {
    const octets = address.toByteArray()
    return `${octets[0]}.${octets[1]}.*.*`
  }

  const parts = address.toNormalizedString().split(':')
  return `${parts[0]}:${parts[1]}:****:****`
}

const displayedOriginIP = computed(() => {
  if (originStatus.value === 'loading') return t('getting')
  if (originStatus.value === 'error') return t('testFailed')
  return showOriginIP.value ? originIP.value : maskIP(originIP.value)
})

const downloadProgress = computed(() =>
  Math.min(100, (downloadedBytes.value / Math.max(1, downloadTotalBytes.value)) * 100),
)
const downloadProgressLabel = computed(() => {
  const received = prettyBytesHelper(downloadedBytes.value)

  return downloadTotalBytes.value
    ? `${received} / ${prettyBytesHelper(downloadTotalBytes.value)}`
    : received
})
const databaseErrorMessage = computed(() =>
  t(`earthDatabaseError_${databaseError.value ?? 'unknown'}`),
)
const showRetry = computed(
  () =>
    databaseStatus.value === 'error' ||
    originStatus.value === 'error' ||
    (databaseStatus.value === 'ready' &&
      routeCount.value === 0 &&
      activeConnections.value.length > 0),
)
const showNoData = computed(
  () =>
    databaseStatus.value === 'ready' &&
    originStatus.value === 'ready' &&
    !routesLoading.value &&
    routeCount.value === 0,
)
const tooltipStyle = computed<CSSProperties>(() => ({
  left: `${Math.min(window.innerWidth - 190, tooltipPosition.value.x + 12)}px`,
  top: `${Math.min(window.innerHeight - 100, tooltipPosition.value.y + 12)}px`,
}))

const postWorker = (message: GeoWorkerRequest) => worker?.postMessage(message)

const lookupLocations = async (ips: string[], locale: string) => {
  const result: Record<string, EarthLocation | null> = {}
  const missing: string[] = []

  for (const ip of ips) {
    if (locationCache.has(ip)) result[ip] = locationCache.get(ip) ?? null
    else missing.push(ip)
  }

  if (missing.length > 0) {
    const id = ++lookupID
    const locations = await new Promise<Record<string, EarthLocation | null>>((resolve) => {
      lookupRequests.set(id, resolve)
      postWorker({ type: 'lookup', id, ips: missing, locale })
    })

    for (const [ip, location] of Object.entries(locations)) {
      locationCache.set(ip, location)
      result[ip] = location
    }

    while (locationCache.size > 8192) {
      const oldest = locationCache.keys().next().value
      if (oldest === undefined) break
      locationCache.delete(oldest)
    }
  }

  return result
}

const refreshRoutes = async () => {
  if (refreshRunning) {
    refreshQueued = true
    return
  }

  refreshRunning = true

  do {
    refreshQueued = false

    if (databaseStatus.value !== 'ready' || !isValidIP(originIP.value)) {
      routeCount.value = 0
      renderer.value?.setRoutes([])
      continue
    }

    routesLoading.value = true
    const snapshot = activeConnections.value

    try {
      const result = await buildEarthRoutes(
        snapshot,
        originIP.value,
        language.value,
        lookupLocations,
      )

      if (!disposed) {
        routeCount.value = result.routes.length
        if (result.origin) renderer.value?.setInitialLocation(result.origin)
        renderer.value?.setRoutes(result.routes)
      }
    } catch {
      if (!disposed) {
        routeCount.value = 0
        renderer.value?.setRoutes([])
      }
    } finally {
      routesLoading.value = false
    }
  } while (refreshQueued && !disposed)

  refreshRunning = false
}

const scheduleRouteRefresh = () => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void refreshRoutes()
  }, 150)
}

const cachedOriginIP = () => {
  const info = earthOriginSource.value === 'global' ? ipForGlobal.value : ipForChina.value
  return info.ipWithPrivacy.find(isValidIP) ?? ''
}

const loadOrigin = async (force = false) => {
  const requestID = ++originRequestID
  const source = earthOriginSource.value
  const cached = force ? '' : cachedOriginIP()

  if (cached) {
    originIP.value = cached
    originStatus.value = 'ready'
    scheduleRouteRefresh()
    return
  }

  originStatus.value = 'loading'
  originIP.value = ''
  routeCount.value = 0
  renderer.value?.setRoutes([])

  try {
    if (source === 'global') {
      const result = await getIPFromIpsbAPI()

      if (!isValidIP(result.ip)) throw new Error('Invalid origin IP')
      ipForGlobal.value = {
        ipWithPrivacy: [`${result.country} ${result.organization}`.trim(), result.ip],
        ip: [`${result.country} ${result.organization}`.trim(), maskIP(result.ip)],
      }
      if (requestID === originRequestID && source === earthOriginSource.value) {
        originIP.value = result.ip
      }
    } else {
      const result = await getIPFromIpipnetAPI()
      const ip = result.data.ip

      if (!isValidIP(ip)) throw new Error('Invalid origin IP')
      ipForChina.value = {
        ipWithPrivacy: [result.data.location.join(' '), ip],
        ip: [`${result.data.location[0]} ** ** **`, maskIP(ip)],
      }
      if (requestID === originRequestID && source === earthOriginSource.value) {
        originIP.value = ip
      }
    }

    if (requestID !== originRequestID || source !== earthOriginSource.value) return
    originStatus.value = 'ready'
    scheduleRouteRefresh()
  } catch {
    if (requestID !== originRequestID || source !== earthOriginSource.value) return
    originStatus.value = 'error'
    originIP.value = ''
  }
}

const downloadDatabase = () => {
  databaseError.value = undefined
  postWorker({ type: 'download' })
}
const cancelDatabaseDownload = () => postWorker({ type: 'cancel' })
const retry = () => {
  if (databaseStatus.value === 'error') downloadDatabase()
  if (originStatus.value === 'error') void loadOrigin(true)
  if (databaseStatus.value === 'ready' && originStatus.value === 'ready') scheduleRouteRefresh()
}

const handleWorkerMessage = ({ data }: MessageEvent<GeoWorkerResponse>) => {
  if (data.type === 'lookup') {
    lookupRequests.get(data.id)?.(data.locations)
    lookupRequests.delete(data.id)
    return
  }

  databaseStatus.value = data.status
  if (data.error) databaseError.value = data.error
  if (data.recoveredCorruptCache) recoveredCorruptCache.value = true
  if (data.received != null) downloadedBytes.value = data.received
  if (data.total != null) downloadTotalBytes.value = data.total

  if (data.status === 'ready') {
    locationCache.clear()
    scheduleRouteRefresh()
  }
  if (data.status !== 'ready' && data.status !== 'downloading') {
    routeCount.value = 0
    renderer.value?.setRoutes([])
  }
}

const handleEndpointHover = (info: EarthEndpointInfo | null, x?: number, y?: number) => {
  hoveredEndpoint.value = info
  if (x != null && y != null) tooltipPosition.value = { x, y }
}

const toggleRotation = () => {
  rotationPaused.value = !rotationPaused.value
  renderer.value?.setAutoRotation(!rotationPaused.value)
}

const toggleCityLabels = () => {
  showCityLabels.value = !showCityLabels.value
  renderer.value?.setCityLabelsVisible(showCityLabels.value)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && expanded.value) expanded.value = false
}

watch(activeConnections, scheduleRouteRefresh)
watch(earthOriginSource, () => void loadOrigin())
watch(language, () => {
  locationCache.clear()
  scheduleRouteRefresh()
})
watch(reducedMotion, (value) => renderer.value?.setReducedMotion(value))
watch(earthVisualMode, (value) => renderer.value?.setVisualMode(value))
watch(
  theme,
  async () => {
    await nextTick()
    renderer.value?.setColorScheme(themeColorScheme.value)
  },
  { flush: 'post' },
)

const initialize = async () => {
  if (disposed) return

  worker = new Worker(new URL('./earth/geoip.worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', handleWorkerMessage)
  postWorker({ type: 'init' })
  void loadOrigin()

  await nextTick()

  try {
    const { createEarthRenderer } = await import('./earth/earthRenderer')

    if (!canvasRef.value || disposed) return
    const createdRenderer = await createEarthRenderer(canvasRef.value, {
      reducedMotion: reducedMotion.value,
      visualMode: earthVisualMode.value,
      colorScheme: themeColorScheme.value,
      onEndpointHover: handleEndpointHover,
    })

    if (disposed) {
      createdRenderer.dispose()
      return
    }

    renderer.value = createdRenderer
    createdRenderer.setAutoRotation(!rotationPaused.value)
    createdRenderer.setCityLabelsVisible(showCityLabels.value)
    scheduleRouteRefresh()
  } catch {
    canvasRef.value?.replaceChildren()
    rendererError.value = t('earthRendererError')
  }
}

const scheduleInitialization = () => {
  initTimer = setTimeout(() => {
    initTimer = null

    if (typeof requestIdleCallback === 'function') {
      initIdleHandle = requestIdleCallback(
        () => {
          initIdleHandle = null
          void initialize()
        },
        { timeout: INIT_IDLE_TIMEOUT },
      )
    } else {
      initIdleTimer = setTimeout(() => {
        initIdleTimer = null
        void initialize()
      })
    }
  }, INIT_DELAY)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  scheduleInitialization()
})

onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('keydown', handleKeydown)
  if (refreshTimer) clearTimeout(refreshTimer)
  if (initTimer) clearTimeout(initTimer)
  if (initIdleTimer) clearTimeout(initIdleTimer)
  if (initIdleHandle !== null) cancelIdleCallback(initIdleHandle)
  renderer.value?.dispose()
  renderer.value = undefined
  worker?.removeEventListener('message', handleWorkerMessage)
  worker?.terminate()
  worker = null
  lookupRequests.clear()
})
</script>

<style scoped>
.earth-globe-card--expanded {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  border-radius: 0;
}

@media (min-width: 769px) {
  :global(.home-page.sidebar-expanded) .earth-globe-card--expanded {
    left: 16rem;
  }

  :global(.home-page.sidebar-collapsed) .earth-globe-card--expanded {
    left: 4.5rem;
  }
}
</style>
