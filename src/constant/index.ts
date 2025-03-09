import {
  ArrowsRightLeftIcon,
  Cog6ToothIcon,
  CubeTransparentIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  SwatchIcon,
} from '@heroicons/vue/24/outline'

export const IPV6_TEST_URL = 'https://ipv6.google.com/generate_204'
export const NOT_CONNECTED = 0
export enum LANG {
  EN_US = 'en-US',
  ZH_CN = 'zh-CN',
  RU_RU = 'ru-RU',
}

export enum FONTS {
  MI_SANS = 'MiSans',
  SARASA_UI = 'SarasaUi',
  PING_FANG = 'PingFang',
  FIRA_SANS = 'FiraSans',
  SYSTEM_UI = 'SystemUI',
}

export enum CONNECTIONS_TABLE_ACCESSOR_KEY {
  Close = 'close',
  Type = 'type',
  Process = 'process',
  Host = 'host',
  Rule = 'rule',
  Chains = 'chains',
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
  RemoteAddress = 'proxyNodeAddress',
}

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

export enum RULE_TAB_TYPE {
  RULES = 'rules',
  PROVIDER = 'ruleProvider',
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
}

export enum SORT_DIRECTION {
  ASC = 'asc',
  DESC = 'desc',
}

export enum CONNECTION_TAB_TYPE {
  ACTIVE = 'activeConnections',
  CLOSED = 'closedConnections',
}

export enum LOG_LEVEL {
  Info = 'info',
  Error = 'error',
  Warning = 'warning',
  Debug = 'debug',
  Silent = 'silent',
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
  [ROUTE_NAME.overview]: CubeTransparentIcon,
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
  Compatible = 'compatible',
  Pass = 'pass',
  Dns = 'dns',
  Selector = 'selector',
  Fallback = 'fallback',
  URLTest = 'urltest',
  LoadBalance = 'loadbalance',
}

export enum PROXY_COUNT_MODE {
  FILTERED_TOTAL = 'filteredTotal',
  TOTAL = 'total',
  ALIVE_TOTAL = 'aliveTotal',
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
