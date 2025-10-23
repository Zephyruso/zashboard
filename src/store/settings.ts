import {
  CONNECTIONS_TABLE_ACCESSOR_KEY,
  DETAILED_CARD_STYLE,
  EMOJIS,
  FONTS,
  GLOBAL,
  IP_INFO_API,
  IS_APPLE_DEVICE,
  LANG,
  PROXY_CARD_SIZE,
  PROXY_CHAIN_DIRECTION,
  PROXY_COUNT_MODE,
  PROXY_PREVIEW_TYPE,
  PROXY_SORT_TYPE,
  TABLE_SIZE,
  TABLE_WIDTH_MODE,
  TEST_URL,
  type THEME,
} from '@/constant'
import { getMinCardWidth, isPreferredDark } from '@/helper/utils'
import type { SourceIPLabel } from '@/types'
import { useStorage } from '@vueuse/core'
import { computed } from 'vue'

// global
export const defaultTheme = useStorage<string>('config/default-theme', 'light')
export const darkTheme = useStorage<string>('config/dark-theme', 'dark')
export const autoTheme = useStorage<boolean>('config/auto-theme', true)
export const theme = computed(() => {
  if (autoTheme.value && isPreferredDark.value) {
    return darkTheme.value
  }
  return defaultTheme.value
})

export const customThemes = useStorage<THEME[]>('config/custom-themes', [])

export const language = useStorage<LANG>(
  'config/language',
  Object.values(LANG).includes(navigator.language as LANG)
    ? (navigator.language as LANG)
    : LANG.EN_US,
)

const fontConfig = useStorage<FONTS>('config/font', FONTS.MI_SANS)
export const font = computed({
  get: () => {
    return fontConfig.value
  },
  set: (val) => {
    fontConfig.value = val
  },
})
export const emoji = useStorage<EMOJIS>(
  'config/emoji',
  IS_APPLE_DEVICE ? EMOJIS.TWEMOJI : EMOJIS.NOTO_COLOR_EMOJI,
)
export const customBackgroundURL = useStorage('config/custom-background-image', '')
export const dashboardTransparent = useStorage('config/dashboard-transparent', 90)
export const autoUpgrade = useStorage('config/auto-upgrade', false)
export const checkUpgradeCore = useStorage('config/check-upgrade-core', true)
export const autoUpgradeCore = useStorage('config/auto-upgrade-core', false)
export const swipeInPages = useStorage('config/swipe-in-pages', true)
export const swipeInTabs = useStorage('config/swipe-in-tabs', false)
export const disablePullToRefresh = useStorage('config/disable-pull-to-refresh', true)
export const displayAllFeatures = useStorage('config/display-all-features', false)
export const blurIntensity = useStorage('config/blur-intensity', 10)
export const scrollAnimationEffect = useStorage('config/scroll-animation-effect', true)
export const IPInfoAPI = useStorage('config/geoip-info-api', IP_INFO_API.IPSB)
export const autoDisconnectIdleUDP = useStorage('config/auto-disconnect-idle-udp', false)
export const autoDisconnectIdleUDPTime = useStorage('config/auto-disconnect-idle-udp-time', 300)
export const autoSystemProxy = useStorage('config/auto-system-proxy', false)

// overview
export const splitOverviewPage = useStorage('config/split-overview-page', false)
export const showIPAndConnectionInfo = useStorage('config/show-ip-and-connection-info', true)
export const autoIPCheck = useStorage('config/auto-ip-check', true)
export const autoConnectionCheck = useStorage('config/auto-connection-check', true)
export const showStatisticsWhenSidebarCollapsed = useStorage(
  'config/show-statistics-when-sidebar-collapsed',
  true,
)
export const numberOfChartsInSidebar = useStorage<1 | 2 | 3>(
  'config/number-of-charts-in-sidebar',
  2,
)
export const displayConnectionTopology = useStorage('config/display-connection-topology', true)

// proxies
export const collapseGroupMap = useStorage<Record<string, boolean>>('config/collapse-group-map', {})
export const displayFinalOutbound = useStorage('config/show-seleted-for-now-node', false)
export const twoColumnProxyGroup = useStorage('config/two-columns', false)
export const speedtestUrl = useStorage<string>('config/speedtest-url', TEST_URL)
export const independentLatencyTest = useStorage('config/independent-latency-test', false)
export const speedtestTimeout = useStorage<number>('config/speedtest-timeout', 5000)
export const proxySortType = useStorage<PROXY_SORT_TYPE>(
  'config/proxy-sort-type',
  PROXY_SORT_TYPE.DEFAULT,
)
export const automaticDisconnection = useStorage('config/automatic-disconnection', true)
export const truncateProxyName = useStorage('config/truncate-proxy-name', true)
export const proxyPreviewType = useStorage('config/proxy-preview-type', PROXY_PREVIEW_TYPE.AUTO)
export const hideUnavailableProxies = useStorage('config/hide-unavailable-proxies', false)
export const lowLatency = useStorage('config/low-latency', 400)
export const mediumLatency = useStorage('config/medium-latency', 800)
export const IPv6test = useStorage('config/ipv6-test', false)
export const proxyCardSize = useStorage<PROXY_CARD_SIZE>(
  'config/proxy-card-size',
  PROXY_CARD_SIZE.LARGE,
)
export const minProxyCardWidth = useStorage<number>(
  'config/min-proxy-card-width',
  getMinCardWidth(proxyCardSize.value),
)
export const manageHiddenGroup = useStorage('config/manage-hidden-group-mode', false)

export const displayGlobalByMode = useStorage('config/display-global-by-mode', false)
export const customGlobalNode = useStorage('config/custom-global-node-name', GLOBAL)

export const proxyGroupIconSize = useStorage('config/proxy-group-icon-size', 24)
export const proxyGroupIconMargin = useStorage('config/proxy-group-icon-margin', 6)
export const proxyCountMode = useStorage('config/proxies-count-mode', PROXY_COUNT_MODE.ALIVE_TOTAL)
export const iconReflectList = useStorage<
  {
    icon: string
    name: string
    uuid: string
  }[]
>('config/icon-reflect-list', [])
export const groupProxiesByProvider = useStorage('config/group-proxies-by-provider', false)
export const useSmartGroupSort = useStorage('config/use-smart-group-sort', false)
export const groupTestUrls = useStorage<
  {
    name: string
    url: string
    uuid: string
  }[]
>('config/group-test-urls', [])

// connections
export const useConnectionCard = useStorage('config/use-connecticon-card', window.innerWidth < 640)
export const proxyChainDirection = useStorage(
  'config/proxy-chain-direction',
  PROXY_CHAIN_DIRECTION.NORMAL,
)
export const tableSize = useStorage<TABLE_SIZE>('config/connecticon-table-size', TABLE_SIZE.SMALL)
export const tableWidthMode = useStorage('config/table-width-mode', TABLE_WIDTH_MODE.AUTO)
export const connectionTableColumns = useStorage<CONNECTIONS_TABLE_ACCESSOR_KEY[]>(
  'config/connection-table-columns',
  [
    CONNECTIONS_TABLE_ACCESSOR_KEY.Close,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Host,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Type,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
    CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
    CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
    CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime,
  ],
)
export const connectionCardLines = useStorage<CONNECTIONS_TABLE_ACCESSOR_KEY[][]>(
  'config/connection-card-lines',
  DETAILED_CARD_STYLE,
)

export const sourceIPLabelList = useStorage<SourceIPLabel[]>('config/source-ip-label-list', [])

// rules
export const displayNowNodeInRule = useStorage('config/display-now-node-in-rule', true)
export const displayLatencyInRule = useStorage('config/display-latency-in-rule', true)

// logs
export const logRetentionLimit = useStorage<number>('config/log-retention-limit', 1000)
export const logSearchHistory = useStorage<string[]>('config/log-search-history', [])
