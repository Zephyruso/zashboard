<template>
  <div class="p-2 sm:p-4">
    <div class="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-x-6 lg:grid-cols-2">
      <!-- Network Quality -->
      <section class="flex flex-col gap-1">
        <div class="settings-section-label">{{ $t('networkQuality') }}</div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-item-label">{{ $t('configURL') }}</div>
            <input
              class="input input-sm w-48 max-w-full sm:w-80"
              v-model="nqConfigURL"
              :disabled="nqRunning"
            />
          </div>
          <div class="setting-item">
            <div class="setting-item-label">{{ $t('outbound') }}</div>
            <select
              class="select select-sm min-w-24"
              v-model="nqOutbound"
              :disabled="nqRunning"
            >
              <option value="">{{ $t('default') }}</option>
              <option
                v-for="tag in outboundTags"
                :key="tag"
                :value="tag"
              >
                {{ tag }}
              </option>
            </select>
          </div>
          <div class="setting-item">
            <div class="setting-item-label">{{ $t('maxRuntime') }}</div>
            <select
              class="select select-sm min-w-24"
              v-model.number="nqMaxRuntime"
              :disabled="nqRunning"
            >
              <option
                v-for="sec in [20, 30, 60]"
                :key="sec"
                :value="sec"
              >
                {{ sec }} s
              </option>
            </select>
          </div>
          <div class="setting-item">
            <div class="setting-item-label">{{ $t('serial') }}</div>
            <input
              type="checkbox"
              class="toggle"
              v-model="nqSerial"
              :disabled="nqRunning"
            />
          </div>
          <div class="setting-item">
            <div class="setting-item-label">{{ $t('http3') }}</div>
            <input
              type="checkbox"
              class="toggle"
              v-model="nqHttp3"
              :disabled="nqRunning"
            />
          </div>
          <div class="setting-item">
            <button
              v-if="!nqRunning"
              class="btn btn-neutral btn-sm ml-auto"
              @click="startNetworkQuality"
            >
              {{ $t('startTest') }}
            </button>
            <button
              v-else
              class="btn btn-sm ml-auto"
              @click="cancelNetworkQuality"
            >
              {{ $t('cancelTest') }}
            </button>
          </div>
        </div>

        <div
          v-if="nqError"
          class="text-error px-1 pt-2 text-sm"
        >
          {{ nqError }}
        </div>
        <div
          v-if="nqProgress"
          class="bg-base-100 mt-3 flex flex-col gap-3 rounded-xl p-4"
        >
          <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
            {{ $t('networkQuality') }} · {{ $t('results') }}
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="flex flex-col gap-1">
              <div class="text-base-content/60 text-xs">{{ $t('download') }}</div>
              <div class="flex flex-wrap items-baseline gap-1.5">
                <span
                  v-if="nqRunning && !nqFinished && nqProgress.phase === 1"
                  class="loading loading-spinner loading-xs self-center"
                ></span>
                <span class="text-xl font-extralight tabular-nums">{{ dlParts.value }}</span>
                <span class="text-base-content/60 text-sm">{{ dlParts.unit }}</span>
                <AccuracyBadge
                  v-if="nqFinished && nqProgress.downloadCapacity > 0n"
                  :accuracy="nqProgress.downloadCapacityAccuracy"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <div class="text-base-content/60 text-xs">{{ $t('upload') }}</div>
              <div class="flex flex-wrap items-baseline gap-1.5">
                <span
                  v-if="nqRunning && !nqFinished && nqProgress.phase === 2"
                  class="loading loading-spinner loading-xs self-center"
                ></span>
                <span class="text-xl font-extralight tabular-nums">{{ ulParts.value }}</span>
                <span class="text-base-content/60 text-sm">{{ ulParts.unit }}</span>
                <AccuracyBadge
                  v-if="nqFinished && nqProgress.uploadCapacity > 0n"
                  :accuracy="nqProgress.uploadCapacityAccuracy"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <div class="text-base-content/60 text-xs">{{ $t('idleLatency') }}</div>
              <div class="flex flex-wrap items-baseline gap-1.5">
                <span class="text-xl font-extralight tabular-nums">
                  {{ nqProgress.idleLatencyMs > 0 ? nqProgress.idleLatencyMs : '-' }}
                </span>
                <span class="text-base-content/60 text-sm">ms</span>
              </div>
            </div>
            <div class="flex flex-col gap-0.5 text-sm">
              <div class="text-base-content/60 text-xs">{{ $t('downloadRPM') }}</div>
              <ResultValue
                class="font-medium tabular-nums"
                :pending="nqRunning && !nqFinished && nqProgress.phase === 1"
                :value="nqProgress.downloadRPM > 0 ? String(nqProgress.downloadRPM) : '-'"
              >
                <AccuracyBadge
                  v-if="nqFinished && nqProgress.downloadRPM > 0"
                  :accuracy="nqProgress.downloadRPMAccuracy"
                />
              </ResultValue>
            </div>
            <div class="flex flex-col gap-0.5 text-sm">
              <div class="text-base-content/60 text-xs">{{ $t('uploadRPM') }}</div>
              <ResultValue
                class="font-medium tabular-nums"
                :pending="nqRunning && !nqFinished && nqProgress.phase === 2"
                :value="nqProgress.uploadRPM > 0 ? String(nqProgress.uploadRPM) : '-'"
              >
                <AccuracyBadge
                  v-if="nqFinished && nqProgress.uploadRPM > 0"
                  :accuracy="nqProgress.uploadRPMAccuracy"
                />
              </ResultValue>
            </div>
            <div class="flex flex-col gap-0.5 text-sm">
              <div class="text-base-content/60 text-xs">{{ $t('elapsed') }}</div>
              <span class="font-medium tabular-nums">
                {{ `${(Number(nqProgress.elapsedMs) / 1000).toFixed(1)} s` }}
              </span>
            </div>
          </div>
          <BasicCharts
            :data="nqChartData"
            :label-formatter="formatBitrate"
            :tool-tip-formatter="nqTooltipFormatter"
            x-axis-mode="seconds"
            :window-sec="nqWindowSec"
            :show-pause-button="false"
          />
        </div>
        <div
          v-else-if="nqRunning"
          class="flex items-center gap-2 px-1 pt-2 text-sm opacity-70"
        >
          <span class="loading loading-spinner loading-xs"></span>
          {{ $t('fetchingConfiguration') }}
        </div>
      </section>

      <!-- STUN Test -->
      <section class="flex flex-col gap-1">
        <div class="settings-section-label">
          {{ $t('stunTest') }} - {{ $t('natTypeDetection') }}
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-item-label">{{ $t('serverField') }}</div>
            <input
              class="input input-sm w-48 max-w-full sm:w-72"
              v-model="stunServer"
              :disabled="stunRunning"
            />
          </div>
          <div class="setting-item">
            <div class="setting-item-label">{{ $t('outbound') }}</div>
            <select
              class="select select-sm min-w-24"
              v-model="stunOutbound"
              :disabled="stunRunning"
            >
              <option value="">{{ $t('default') }}</option>
              <option
                v-for="tag in outboundTags"
                :key="tag"
                :value="tag"
              >
                {{ tag }}
              </option>
            </select>
          </div>
          <div class="setting-item">
            <button
              v-if="!stunRunning"
              class="btn btn-neutral btn-sm ml-auto"
              @click="startStun"
            >
              {{ $t('startTest') }}
            </button>
            <button
              v-else
              class="btn btn-sm ml-auto"
              @click="cancelStun"
            >
              {{ $t('cancelTest') }}
            </button>
          </div>
        </div>

        <div
          v-if="stunError"
          class="text-error px-1 pt-2 text-sm"
        >
          {{ stunError }}
        </div>
        <div
          v-if="stunResult"
          class="settings-grid mt-2"
        >
          <DataLine :label="$t('externalAddress')">{{ stunResult.externalAddr || '-' }}</DataLine>
          <DataLine :label="$t('latency')">
            {{ stunResult.latencyMs > 0 ? `${stunResult.latencyMs} ms` : '-' }}
          </DataLine>
          <DataLine
            v-if="stunResult.isFinal && !stunResult.natTypeSupported"
            :label="$t('natTypeDetection')"
          >
            {{ $t('notSupportedByServer') }}
          </DataLine>
          <template v-else>
            <DataLine :label="$t('natMapping')">
              <span
                v-if="stunResult.natMapping > 0"
                class="badge badge-sm"
                :class="toneBadge(natMappingTone(stunResult.natMapping))"
              >
                {{ natMappingDescription(stunResult.natMapping) }}
              </span>
              <span
                v-else-if="stunRunning"
                class="loading loading-spinner loading-xs"
              ></span>
              <span v-else>-</span>
            </DataLine>
            <DataLine :label="$t('natFiltering')">
              <span
                v-if="stunResult.natFiltering > 0"
                class="badge badge-sm"
                :class="toneBadge(natFilteringTone(stunResult.natFiltering))"
              >
                {{ natFilteringDescription(stunResult.natFiltering) }}
              </span>
              <span
                v-else-if="stunRunning"
                class="loading loading-spinner loading-xs"
              ></span>
              <span v-else>-</span>
            </DataLine>
          </template>
        </div>
        <div
          v-else-if="stunRunning"
          class="flex items-center gap-2 px-1 pt-2 text-sm opacity-70"
        >
          <span class="loading loading-spinner loading-xs"></span>
          {{ $t('binding') }}
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSingboxClient } from '@/assembly/tools'
import type { NetworkQualityTestProgress, STUNTestProgress } from '@/gen/daemon/started_service_pb'
import { proxyMap } from '@/assembly/proxies'
import { computed, defineComponent, h, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BasicCharts from '@/components/overview/BasicCharts.vue'

const NETWORK_QUALITY_DEFAULT_URL = 'https://mensura.cdn-apple.com/api/v1/gm/config'
const STUN_DEFAULT_SERVER = 'stun.voipgate.com:3478'

const { t } = useI18n()

// A label/value result row in the settings-grid style.
const DataLine = defineComponent({
  props: { label: String },
  setup:
    (props, { slots }) =>
    () =>
      h('div', { class: 'setting-item' }, [
        h('div', { class: 'setting-item-label' }, props.label),
        h('span', { class: 'text-right font-medium break-all' }, slots.default?.()),
      ]),
})

// Value cell with an optional pending spinner and trailing badge slot.
const ResultValue = defineComponent({
  props: { pending: Boolean, value: String },
  setup:
    (props, { slots }) =>
    () =>
      h('span', { class: 'inline-flex items-center gap-2' }, [
        props.pending ? h('span', { class: 'loading loading-spinner loading-xs' }) : null,
        props.value,
        slots.default?.(),
      ]),
})

const AccuracyBadge = defineComponent({
  props: { accuracy: { type: Number, required: true } },
  setup: (props) => () => {
    const map: Record<number, [string, string]> = {
      2: ['accuracyHigh', 'badge-success'],
      1: ['accuracyMedium', 'badge-warning'],
    }
    const [key, cls] = map[props.accuracy] ?? ['accuracyLow', 'badge-error']
    return h('span', { class: `badge badge-xs ${cls}` }, t(key))
  },
})

const client = () => getSingboxClient()
const outboundTags = computed(() => Object.keys(proxyMap.value))

const formatBitrate = (bps: number | bigint): string => {
  const value = Number(bps)
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Gbps`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mbps`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} kbps`
  return `${Math.round(value)} bps`
}

const splitBitrate = (bps: number | bigint): { value: string; unit: string } => {
  if (Number(bps) <= 0) return { value: '-', unit: '' }
  const [value, unit] = formatBitrate(bps).split(' ')
  return { value, unit }
}

type Tone = 'neutral' | 'good' | 'medium' | 'bad'

const toneBadge = (tone: Tone): string =>
  ({ good: 'badge-success', medium: 'badge-warning', bad: 'badge-error', neutral: 'badge-ghost' })[
    tone
  ]

// NAT mapping and filtering use different enum offsets in sing-box.
const natMappingDescription = (v: number): string =>
  ({ 2: 'Endpoint Independent', 3: 'Address Dependent', 4: 'Address and Port Dependent' })[v] ??
  'Unknown'
const natFilteringDescription = (v: number): string =>
  ({ 1: 'Endpoint Independent', 2: 'Address Dependent', 3: 'Address and Port Dependent' })[v] ??
  'Unknown'
const natMappingTone = (v: number): Tone =>
  (({ 2: 'good', 3: 'medium', 4: 'bad' }) as Record<number, Tone>)[v] ?? 'neutral'
const natFilteringTone = (v: number): Tone =>
  (({ 1: 'good', 2: 'medium', 3: 'bad' }) as Record<number, Tone>)[v] ?? 'neutral'

// --- Network Quality ---
const nqConfigURL = ref(NETWORK_QUALITY_DEFAULT_URL)
const nqOutbound = ref('')
const nqSerial = ref(false)
const nqHttp3 = ref(false)
const nqMaxRuntime = ref(20)
const nqRunning = ref(false)
const nqError = ref('')
const nqProgress = ref<NetworkQualityTestProgress>()
const nqFinished = computed(() => nqProgress.value?.isFinal ?? false)
// 折线图历史点: [已用秒数, bps]
const nqDownloadHistory = ref<[number, number][]>([])
const nqUploadHistory = ref<[number, number][]>([])
// 图表时间窗,测试开始时按最长运行时间固定,避免测试中调整设置影响横轴
const nqWindowSec = ref(21)
let nqController: AbortController | null = null

const dlParts = computed(() => splitBitrate(nqProgress.value?.downloadCapacity ?? 0n))
const ulParts = computed(() => splitBitrate(nqProgress.value?.uploadCapacity ?? 0n))
// 末位序列使用 primary 色,与 overview 图表保持下载为主色的约定
const nqChartData = computed(() => [
  { name: t('upload'), data: nqUploadHistory.value },
  { name: t('download'), data: nqDownloadHistory.value },
])

const nqTooltipFormatter = (params: ToolTipParams[]) => {
  // 每个序列只展示一条,防止同一 x 上的多个点在 tooltip 中重复
  const seen = new Set<string>()
  return params
    .filter((item) => !seen.has(item.seriesName) && seen.add(item.seriesName))
    .map((item) => {
      const [sec, bps] = item.data as unknown as [number, number]
      return `
    <div class="flex items-center my-2 gap-1">
      <div class="w-4 h-4 rounded-full" style="background-color: ${item.color}"></div>
      ${item.seriesName}
      (${sec.toFixed(1)} s): ${formatBitrate(bps)}
    </div>`
    })
    .join('\n')
}

// 重新赋值数组以触发响应式更新(push 不会让下游 computed 重算);
// 同一时间点只保留最新值,避免 tooltip 里同一序列出现重复条目
const appendPoint = (points: [number, number][], x: number, y: number): [number, number][] =>
  points.at(-1)?.[0] === x ? [...points.slice(0, -1), [x, y]] : [...points, [x, y]]

const startNetworkQuality = async () => {
  const c = client()
  if (!c) return
  nqRunning.value = true
  nqError.value = ''
  nqProgress.value = undefined
  nqDownloadHistory.value = []
  nqUploadHistory.value = []
  // +1s 余量,收尾时略超 maxRuntime 的点也能完整落在窗口内
  nqWindowSec.value = nqMaxRuntime.value + 1
  nqController = new AbortController()
  try {
    for await (const update of c.client.startNetworkQualityTest(
      {
        configURL: nqConfigURL.value,
        outboundTag: nqOutbound.value,
        http3: nqHttp3.value,
        maxRuntimeSeconds: nqMaxRuntime.value,
        serial: nqSerial.value,
      },
      { signal: nqController.signal },
    )) {
      nqProgress.value = update
      if (update.phase !== 3) {
        const elapsedSec = Number(update.elapsedMs) / 1000
        nqDownloadHistory.value = appendPoint(
          nqDownloadHistory.value,
          elapsedSec,
          Number(update.downloadCapacity),
        )
        nqUploadHistory.value = appendPoint(
          nqUploadHistory.value,
          elapsedSec,
          Number(update.uploadCapacity),
        )
      }
      if (update.error) nqError.value = update.error
      if (update.isFinal) break
    }
  } catch (e) {
    if (!nqController.signal.aborted) nqError.value = String(e)
  } finally {
    nqRunning.value = false
  }
}

const cancelNetworkQuality = () => {
  nqController?.abort()
  nqRunning.value = false
}

// --- STUN ---
const stunServer = ref(STUN_DEFAULT_SERVER)
const stunOutbound = ref('')
const stunRunning = ref(false)
const stunError = ref('')
const stunResult = ref<STUNTestProgress>()
let stunController: AbortController | null = null

const startStun = async () => {
  const c = client()
  if (!c) return
  stunRunning.value = true
  stunError.value = ''
  stunResult.value = undefined
  stunController = new AbortController()
  try {
    for await (const update of c.client.startSTUNTest(
      { server: stunServer.value, outboundTag: stunOutbound.value },
      { signal: stunController.signal },
    )) {
      stunResult.value = update
      if (update.error) stunError.value = update.error
      if (update.isFinal) break
    }
  } catch (e) {
    if (!stunController.signal.aborted) stunError.value = String(e)
  } finally {
    stunRunning.value = false
  }
}

const cancelStun = () => {
  stunController?.abort()
  stunRunning.value = false
}

onBeforeUnmount(() => {
  nqController?.abort()
  stunController?.abort()
})
</script>
