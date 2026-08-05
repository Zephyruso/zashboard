// 组装层 · 版本与升级。
// fetchVersionAPI 按通道选择 Clash /version 或 sing-box gRPC getVersion,
// 并把结果统一成 { data: { version } } 形状。
// 版本字符串是 core 轴(assembly/backend.ts)的唯一来源:这里探测完成后写入 core,
// 后端切换的瞬间先重置为 'unknown',避免沿用上一个后端的结论。
import { fetchClashVersion, restartCoreAPI, upgradeCoreAPI, upgradeUIAPI } from '@/api/clash'
import HonkLogo from '@/assets/images/honk.svg'
import MetacubexLogo from '@/assets/images/metacubex.jpg'
import SingBoxLogo from '@/assets/images/sing-box.svg'
import { MIHOMO, MIHOMO_CHANNEL } from '@/constant'
import { autoUpgradeCore, autoUpgradeDashboard, checkUpgradeCore } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import type { Backend } from '@/types'
import { computed, nextTick, ref, watch } from 'vue'
import { apiVersion, can, Channel, channel, core, Core, resetCore } from './backend'

export const version = ref()
export const isCoreUpdateAvailable = ref(false)
export const zashboardVersion = ref(__APP_VERSION__)

// sing-box 内核启动时刻(ms epoch);0 表示未知 / 当前后端无此能力。
// 仅 sing-box API(GetStartedAt)提供,Clash /version 无运行时长。
export const startedAt = ref(0)

// honk 的 /version 返回 "honk <semver>"(见 honk-core/src/clash_api.rs 的 version handler)。
const detectCore = (versionString: string): Core => {
  if (!versionString) return Core.Unknown
  if (versionString.includes('sing-box')) return Core.Singbox
  if (/\bhonk\b/i.test(versionString)) return Core.Honk
  return Core.Mihomo
}

// 内核品牌的展示信息(logo / 官网链接)。纯展示,不是能力门控,故允许 view 使用。
export const coreBrand = computed(() => {
  switch (core.value) {
    case Core.Singbox:
      return { logo: SingBoxLogo, url: 'https://github.com/sagernet/sing-box' }
    case Core.Honk:
      return { logo: HonkLogo, url: 'https://github.com/Glassyiris/honk' }
    default:
      return {
        logo: MetacubexLogo,
        url: MIHOMO_CHANNEL[mihomo.value?.[0] ?? MIHOMO.Meta].url,
      }
  }
})

export const mihomo = computed<[MIHOMO, string] | undefined>(() => {
  if (core.value !== Core.Mihomo) return undefined

  const match = /(alpha-smart|alpha|beta|meta)-?(\w+)/.exec(version.value)
  switch (match?.[1]) {
    case 'alpha':
      return [MIHOMO.Alpha, match[2] ?? version.value]
    case 'alpha-smart':
      return [MIHOMO.Smart, match[2] ?? version.value]
    case 'meta':
      return [MIHOMO.Meta, match[2] ?? version.value]
    default:
      return [MIHOMO.Meta, version.value]
  }
})

const fetchSingboxVersion = async () => {
  const { getSingboxClient } = await import('@/api/singbox/client')
  const client = getSingboxClient()?.client
  if (!client) return { data: { version: 'sing-box' } }
  const v = await client.getVersion({})
  apiVersion.value = v.apiVersion
  const version = v.version.includes('sing-box') ? v.version : `sing-box ${v.version}`
  return { data: { version } }
}

export const fetchVersionAPI = () =>
  channel.value === Channel.Singbox ? fetchSingboxVersion() : fetchClashVersion()

const fetchSingboxStartedAt = async (): Promise<number> => {
  const { getSingboxClient } = await import('@/api/singbox/client')
  const client = getSingboxClient()?.client
  if (!client) return 0
  try {
    const res = await client.getStartedAt({})
    return Number(res.startedAt)
  } catch {
    return 0
  }
}

const probeBackend = async (backend: Backend) => {
  const { data } = await fetchVersionAPI()

  // 探测期间用户可能又切了后端,过期结果直接丢弃。
  if (activeBackend.value?.uuid !== backend.uuid) return

  version.value = data?.version || ''
  core.value = detectCore(version.value)
  startedAt.value = can('startedAt') ? await fetchSingboxStartedAt() : 0

  if (!can('coreUpdateCheck') || !checkUpgradeCore.value || backend.disableUpgradeCore) return

  isCoreUpdateAvailable.value = await fetchBackendUpdateAvailableAPI()

  if (isCoreUpdateAvailable.value && autoUpgradeCore.value) {
    upgradeCoreAPI('auto')
  }
}

// 当前后端的内核探测。core 未就绪前依赖它的判断都不可信,
// 需要等结论的调用方(如登录后的设置同步)用 coreReady() 等待。
let probe: Promise<void> = Promise.resolve()

export const coreReady = async () => {
  // 先让 activeBackend 的 watcher 跑完,确保拿到的是新后端的探测,而非上一次的残留。
  await nextTick()
  await probe
}

watch(
  activeBackend,
  (val) => {
    resetCore()
    version.value = ''
    startedAt.value = 0
    isCoreUpdateAvailable.value = false

    probe = val ? probeBackend(val).catch(() => {}) : Promise.resolve()
  },
  { immediate: true },
)

const CACHE_DURATION = 1000 * 60 * 60

interface CacheEntry<T> {
  timestamp: number
  version: string
  data: T
}

async function fetchWithLocalCache<T>(url: string, version: string): Promise<T> {
  const cacheKey = 'cache/' + url
  const cacheRaw = localStorage.getItem(cacheKey)

  if (cacheRaw) {
    try {
      const cache: CacheEntry<T> = JSON.parse(cacheRaw)
      const now = Date.now()

      if (now - cache.timestamp < CACHE_DURATION && cache.version === version) {
        return cache.data
      } else {
        localStorage.removeItem(cacheKey)
      }
    } catch (e) {
      console.warn('Failed to parse cache for', url, e)
    }
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
  }

  const data: T = await response.json()
  const newCache: CacheEntry<T> = {
    timestamp: Date.now(),
    version,
    data,
  }

  localStorage.setItem(cacheKey, JSON.stringify(newCache))
  return data
}

export const fetchIsUIUpdateAvailable = async () => {
  const { tag_name } = await fetchWithLocalCache<{ tag_name: string }>(
    'https://api.github.com/repos/Zephyruso/zashboard/releases/latest',
    zashboardVersion.value,
  )

  return Boolean(tag_name && tag_name !== `v${zashboardVersion.value}`)
}

const check = async (url: string, versionNumber: string) => {
  const { assets } = await fetchWithLocalCache<{ assets: { name: string }[] }>(url, versionNumber)
  const alreadyLatest = assets.some(({ name }) => name.includes(versionNumber))

  return !alreadyLatest
}

export const fetchBackendUpdateAvailableAPI = async () => {
  return await check(
    MIHOMO_CHANNEL[mihomo.value?.[0] ?? MIHOMO.Meta].check_update_url,
    mihomo.value?.[1] ?? version.value,
  )
}

// 仪表盘(UI)更新检查,迁自 composables/settings.ts 的 useSettings。
export const isUIUpdateAvailable = ref(false)

export const checkUIUpdate = async () => {
  isUIUpdateAvailable.value = await fetchIsUIUpdateAvailable()
  if (isUIUpdateAvailable.value && autoUpgradeDashboard.value) {
    upgradeUIAPI()
  }
}

// 内核 / UI 维护动作(Clash 专属,无后端分支),经版本域门面暴露给 view。
export { restartCoreAPI, upgradeCoreAPI, upgradeUIAPI }
