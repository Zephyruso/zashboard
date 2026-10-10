import {
  ArrowsRightLeftIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CubeTransparentIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  SwatchIcon,
} from '@heroicons/vue/24/outline'

export const IS_APPLE_DEVICE = /Mac|iPod|iPhone|iPad/.test(navigator.platform)

export const GLOBAL = 'GLOBAL'
export const TEST_URL = 'https://www.gstatic.com/generate_204'
export const IPV6_TEST_URL = 'https://ipv6.google.com/generate_204'
export const NOT_CONNECTED = 0
export enum LANG {
  EN_US = 'en-US',
  ZH_CN = 'zh-CN',
  ZH_TW = 'zh-TW',
  RU_RU = 'ru-RU',
}

export enum FONTS {
  MI_SANS = 'MiSans',
  SARASA_UI = 'SarasaUi',
  PING_FANG = 'PingFang',
  FIRA_SANS = 'FiraSans',
  SYSTEM_UI = 'SystemUI',
}

export enum EMOJIS {
  TWEMOJI = 'twemoji',
  NOTO_COLOR_EMOJI = 'noto-color-emoji',
}

export enum CONNECTIONS_TABLE_ACCESSOR_KEY {
  Close = 'close',
  Type = 'type',
  Process = 'process',
  Host = 'host',
  Rule = 'rule',
  Chains = 'chains',
  Outbound = 'outbound',
  DlSpeed = 'dlSpeed',
  UlSpeed = 'ulSpeed',
  Download = 'dl',
  Upload = 'ul',
  ConnectTime = 'connectTime',
  SourceIP = 'sourceIP',
  SourcePort = 'sourcePort',
  SniffHost = 'sniffHost',
  Destination = 'destination',
  DestinationType = 'destinationType',
  GeoIP = 'geoip',
  RemoteAddress = 'remoteAddress',
  InboundUser = 'inboundUser',
}

export const CONNECTION_SEARCHABLE_KEYS = Object.values(CONNECTIONS_TABLE_ACCESSOR_KEY).filter(
  (key) => key !== CONNECTIONS_TABLE_ACCESSOR_KEY.Close,
)

export const CONNECTION_GROUPABLE_KEYS = [
  CONNECTIONS_TABLE_ACCESSOR_KEY.Type,
  CONNECTIONS_TABLE_ACCESSOR_KEY.Process,
  CONNECTIONS_TABLE_ACCESSOR_KEY.Host,
  CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost,
  CONNECTIONS_TABLE_ACCESSOR_KEY.Rule,
  CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
  CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound,
  CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP,
  CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort,
  CONNECTIONS_TABLE_ACCESSOR_KEY.Destination,
  CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType,
  CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP,
  CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress,
  CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser,
] as const

export type ConnectionGroupableKey = (typeof CONNECTION_GROUPABLE_KEYS)[number]

export const isConnectionGroupableKey = (value: unknown): value is ConnectionGroupableKey =>
  CONNECTION_GROUPABLE_KEYS.includes(value as ConnectionGroupableKey)

export enum TABLE_WIDTH_MODE {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export enum PROXY_SORT_TYPE {
  DEFAULT = 'defaultsort',
  NAME_ASC = 'nameasc',
  NAME_DESC = 'namedesc',
  LATENCY_ASC = 'latencyasc',
  LATENCY_DESC = 'latencydesc',
}

export enum PROXY_PREVIEW_TYPE {
  AUTO = 'auto',
  DOTS = 'dots',
  BAR = 'bar',
}

export enum PROXY_SEARCH_MODE {
  GLOBAL = 'global',
  GROUP = 'group',
}

export enum SPEEDTEST_MODE {
  CORE = 'core',
  DASHBOARD = 'dashboard',
}

export enum FOLDER_MODE {
  AUTO = 'auto',
  ON = 'on',
  OFF = 'off',
}

export const FOLDER_MODE_AUTO_THRESHOLD = 20

export enum CONNECTION_DISPLAY_STYLE {
  AUTO = 'auto',
  CARD = 'card',
  TABLE = 'table',
}

export enum LIST_DISPLAY_STYLE {
  CARD = 'card',
  TABLE = 'table',
}

export enum RULE_TAB_TYPE {
  RULES = 'rules',
  PROVIDER = 'ruleProvider',
  TRACE = 'daeRoutingTrace',
}

export enum PROXY_TAB_TYPE {
  PROXIES = 'proxies',
  PROVIDER = 'proxyProvider',
}

export enum SORT_TYPE {
  HOST = 'host',
  CHAINS = 'chains',
  RULE = 'rule',
  TYPE = 'type',
  CONNECT_TIME = 'connectTime',
  DOWNLOAD = 'download',
  DOWNLOAD_SPEED = 'downloadSpeed',
  UPLOAD = 'upload',
  UPLOAD_SPEED = 'uploadSpeed',
  SOURCE_IP = 'sourceIP',
  INBOUND_USER = 'inboundUser',
}

export enum SORT_DIRECTION {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SORT_VALUE_KIND {
  TEXT = 'text',
  NUMBER = 'number',
  TIME = 'time',
}

export const SORT_TYPE_VALUE_KIND: Record<SORT_TYPE, SORT_VALUE_KIND> = {
  [SORT_TYPE.HOST]: SORT_VALUE_KIND.TEXT,
  [SORT_TYPE.CHAINS]: SORT_VALUE_KIND.TEXT,
  [SORT_TYPE.RULE]: SORT_VALUE_KIND.TEXT,
  [SORT_TYPE.TYPE]: SORT_VALUE_KIND.TEXT,
  [SORT_TYPE.SOURCE_IP]: SORT_VALUE_KIND.TEXT,
  [SORT_TYPE.INBOUND_USER]: SORT_VALUE_KIND.TEXT,
  [SORT_TYPE.CONNECT_TIME]: SORT_VALUE_KIND.TIME,
  [SORT_TYPE.DOWNLOAD]: SORT_VALUE_KIND.NUMBER,
  [SORT_TYPE.DOWNLOAD_SPEED]: SORT_VALUE_KIND.NUMBER,
  [SORT_TYPE.UPLOAD]: SORT_VALUE_KIND.NUMBER,
  [SORT_TYPE.UPLOAD_SPEED]: SORT_VALUE_KIND.NUMBER,
}

export const naturalSortDirection = (sortType: SORT_TYPE) =>
  SORT_TYPE_VALUE_KIND[sortType] === SORT_VALUE_KIND.TEXT ? SORT_DIRECTION.ASC : SORT_DIRECTION.DESC

export const SORT_DIRECTION_LABEL_KEY: Record<SORT_VALUE_KIND, Record<SORT_DIRECTION, string>> = {
  [SORT_VALUE_KIND.TEXT]: {
    [SORT_DIRECTION.ASC]: 'sortAToZ',
    [SORT_DIRECTION.DESC]: 'sortZToA',
  },
  [SORT_VALUE_KIND.NUMBER]: {
    [SORT_DIRECTION.ASC]: 'sortSmallestFirst',
    [SORT_DIRECTION.DESC]: 'sortLargestFirst',
  },
  [SORT_VALUE_KIND.TIME]: {
    [SORT_DIRECTION.ASC]: 'sortOldestFirst',
    [SORT_DIRECTION.DESC]: 'sortNewestFirst',
  },
}

export const SORT_TYPE_GROUPS: { labelKey: string; types: readonly SORT_TYPE[] }[] = [
  {
    labelKey: 'basic',
    types: [
      SORT_TYPE.HOST,
      SORT_TYPE.TYPE,
      SORT_TYPE.RULE,
      SORT_TYPE.CHAINS,
      SORT_TYPE.CONNECT_TIME,
    ],
  },
  {
    labelKey: 'traffic',
    types: [SORT_TYPE.DOWNLOAD_SPEED, SORT_TYPE.UPLOAD_SPEED, SORT_TYPE.DOWNLOAD, SORT_TYPE.UPLOAD],
  },
  {
    labelKey: 'sourceAndDestination',
    types: [SORT_TYPE.SOURCE_IP, SORT_TYPE.INBOUND_USER],
  },
]

export enum CONNECTION_TAB_TYPE {
  ACTIVE = 'activeConnections',
  ALL = 'allConnections',
}

export enum LOG_LEVEL {
  Trace = 'trace',
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Fatal = 'fatal',
  Panic = 'panic',
  Silent = 'silent',
}

export enum TUN_STACK {
  gVisor = 'gVisor',
  System = 'System',
  Mixed = 'Mixed',
  Mips = 'Mips',
}

export enum ROUTE_NAME {
  overview = 'overview',
  proxies = 'proxies',
  connections = 'connections',
  logs = 'logs',
  rules = 'rules',
  settings = 'settings',
  setup = 'setup',
}

export const ROUTE_ICON_MAP = {
  [ROUTE_NAME.overview]: ChartBarIcon,
  [ROUTE_NAME.proxies]: GlobeAltIcon,
  [ROUTE_NAME.connections]: ArrowsRightLeftIcon,
  [ROUTE_NAME.rules]: SwatchIcon,
  [ROUTE_NAME.logs]: DocumentTextIcon,
  [ROUTE_NAME.settings]: Cog6ToothIcon,
  [ROUTE_NAME.setup]: CubeTransparentIcon,
}

export enum TABLE_SIZE {
  SMALL = 'small',
  LARGE = 'large',
}

export enum PROXY_CARD_SIZE {
  SMALL = 'small',
  LARGE = 'large',
}

export enum MIN_PROXY_CARD_WIDTH {
  SMALL = 130,
  LARGE = 145,
}

export enum PROXY_CHAIN_DIRECTION {
  NORMAL = 'normal',
  REVERSE = 'reverse',
}

export enum PROXY_TYPE {
  Direct = 'direct',
  Reject = 'reject',
  RejectDrop = 'rejectdrop',
  Block = 'block',
  Compatible = 'compatible',
  Pass = 'pass',
  PassRule = 'passrule',
  Rematch = 'rematch',
  Dns = 'dns',
  Relay = 'relay',
  Selector = 'selector',
  Fallback = 'fallback',
  URLTest = 'urltest',
  Smart = 'smart',
  LoadBalance = 'loadbalance',
}

export const SIMPLE_CARD_STYLE = [
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Host, CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime],
  [
    CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
    CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Close,
  ],
]

export const DETAILED_CARD_STYLE = [
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Host, CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime],
  [
    CONNECTIONS_TABLE_ACCESSOR_KEY.Type,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
  ],
  [
    CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
    CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Close,
  ],
]

export const ALL_THEME = [
  'light',
  'dark',
  'light-neutral',
  'dark-neutral',
  ...(window.ksu ? ['light-monet', 'dark-monet'] : []),
  'halloween',
  'forest',
  'dracula',
  'night',
  'dim',
  'nord',
  'sunset',
  'abyss',
  'cupcake',
  'dark-daisyui5',
]

export const DEFAULT_THEME = {
  name: 'custom',
  id: '',
  '--border': '1px',
  '--color-base-100': '#ffffff',
  '--color-base-200': '#fcfcfc',
  '--color-base-300': '#f2f2f2',
  '--color-base-content': '#2d2d33',
  '--color-primary': '#5a3cd2',
  '--color-primary-content': '#f3efff',
  '--color-secondary': '#ea4c5a',
  '--color-secondary-content': '#fff1f2',
  '--color-accent': '#49c6c1',
  '--color-accent-content': '#285e66',
  '--color-neutral': '#1e1e1f',
  '--color-neutral-content': '#ececec',
  '--color-info': '#5b90ff',
  '--color-info-content': '#273c66',
  '--color-success': '#44c07a',
  '--color-success-content': '#1d472f',
  '--color-warning': '#e5a300',
  '--color-warning-content': '#705322',
  '--color-error': '#d13a30',
  '--color-error-content': '#551d1d',
  '--depth': '0',
  '--noise': '0',
  '--radius-box': '1rem',
  '--radius-field': '0.5rem',
  '--radius-selector': '1rem',
  '--size-field': '0.25rem',
  '--size-selector': '0.25rem',
  'color-scheme': 'dark',
  default: false,
  prefersdark: false,
}

export type THEME = Record<string, string>

export enum IP_INFO_API {
  IPIP = 'ipip.net',
  IPSB = 'ip.sb',
  IPWHOIS = 'ipwho.is',
  IPAPI = 'ipapi.is',
}

export const GEOIP_COUNTRY_DATABASE_URL =
  'https://testingcf.jsdelivr.net/gh/P3TERX/GeoLite.mmdb@download/GeoLite2-Country.mmdb'
export const GEOIP_ASN_DATABASE_URL =
  'https://testingcf.jsdelivr.net/gh/P3TERX/GeoLite.mmdb@download/GeoLite2-ASN.mmdb'

export enum SETTINGS_MENU_KEY {
  general = 'generalSettings',
  backend = 'backendSettings',
  proxies = 'proxySettings',
  connections = 'connectionSettings',
  overview = 'overviewSettings',
}

export enum OVERVIEW_CARD {
  ChartsCard = 'ChartsCard',
  NetworkCard = 'NetworkCard',
  ProviderTrafficOverview = 'ProviderTrafficOverview',
  TopologyCharts = 'TopologyCharts',
  EarthGlobeCard = 'EarthGlobeCard',
  ConnectionHistory = 'ConnectionHistory',
  RuleHitCountCard = 'RuleHitCountCard',
  HonkStatsCard = 'HonkStatsCard',
}

export enum MIHOMO {
  Meta = 'meta',
  Alpha = 'alpha',
  Smart = 'smart',
}

export const MIHOMO_CHANNEL: Record<MIHOMO, { url: string; check_update_url: string }> = {
  [MIHOMO.Meta]: {
    url: 'https://github.com/metacubex/mihomo',
    check_update_url: 'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest',
  },
  [MIHOMO.Alpha]: {
    url: 'https://github.com/metacubex/mihomo',
    check_update_url:
      'https://api.github.com/repos/MetaCubeX/mihomo/releases/tags/Prerelease-Alpha',
  },
  [MIHOMO.Smart]: {
    url: 'https://github.com/vernesong/mihomo',
    check_update_url:
      'https://api.github.com/repos/vernesong/mihomo/releases/tags/Prerelease-Alpha',
  },
}
