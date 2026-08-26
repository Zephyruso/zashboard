// 连接通道。'clash' 走 Clash REST/WS API,'dae' 走 dae 的 REST API
// (全 JSON、无 WebSocket,端点一律带 /api 前缀)。由用户在后端表单里手选,
// 是确定性事实 —— 不做 /version 嗅探,见 assembly/backend.ts 的两条判别轴。
export type BackendType = 'clash' | 'dae'

export type Backend = {
  type: BackendType
  protocol: string
  host: string
  port: string
  secondaryPath: string
  password: string // Clash secret / dae API token,两者都以 Bearer 下发
  uuid: string
  label?: string
  disableUpgradeCore?: boolean
  disableTunMode?: boolean
}

export type Config = {
  port: number
  'socks-port': number
  'redir-port': number
  'tproxy-port': number
  'mixed-port': number
  'allow-lan': boolean
  'bind-address': string
  mode: string
  'mode-list': string[]
  modes: string[]
  'log-level': string
  ipv6: boolean
  tun: {
    enable: boolean
  }
}

export type History = {
  time: string
  delay: number
}[]

export type Proxy = {
  name: string
  type: string
  history: History
  extra: Record<
    string,
    {
      alive: boolean
      history: History
    }
  >
  all?: string[]
  udp?: boolean
  xudp?: boolean
  now: string
  fixed?: string
  icon: string
  hidden?: boolean
  selectable?: boolean
  testUrl?: string
  'dialer-proxy'?: string
  'provider-name'?: string
}

export type SubscriptionInfo = {
  Download?: number
  Upload?: number
  Total?: number
  Expire?: number
}

export type ProxyProvider = {
  subscriptionInfo?: SubscriptionInfo
  name: string
  proxies: Proxy[]
  testUrl: string
  updatedAt: string
  vehicleType: string
}

export type Rule = {
  type: string
  payload: string
  proxy: string
  size: number
  uuid: string
  // sing-box-reFind
  disabled?: boolean
  // mihomo
  index: number
  extra?: {
    disabled: false
    hitAt: string
    hitCount: number
    missAt: string
    missCount: number
  }
}

export type RuleProvider = {
  behavior: string
  format: string
  name: string
  ruleCount: number
  type: string
  updatedAt: string
  vehicleType: string
}

export type ClashConnectionRawMessage = {
  id: string
  download: number
  upload: number
  chains: string[]
  rule: string
  rulePayload: string
  start: string | number
  metadata: {
    destinationGeoIP: string
    destinationIP: string
    destinationIPASN: string
    destinationPort: string
    dnsMode: string
    dscp: number
    host: string
    inboundIP: string
    inboundName: string
    inboundPort: string
    inboundUser: string
    network: string
    process: string
    processPath: string
    remoteDestination: string
    sniffHost: string
    sourceGeoIP: string
    sourceIP: string
    sourceIPASN: string
    sourcePort: string
    specialProxy: string
    specialRules: string
    type: string
    uid: number
    smartBlock: string
  }
}

// dae GET /api/connections 的单条连接。响应把 tcp / udp 分列在两个数组里,
// network 是解析时打上的,不是响应字段。
export type DaeConnectionRawMessage = {
  // 响应里是 uint64,解析时 String() 化,与 clash 的 id: string 对齐 ——
  // store 层拿它当 Map 的键,两条通道必须是同一种类型。
  id: string
  src: string // ip:port
  dst: string // ip:port
  domain: string
  outbound: string
  started: string
  upload_bytes: number
  download_bytes: number
  upload_rate: number
  download_rate: number
  network: 'tcp' | 'udp'
}

export type ConnectionRawMessage = ClashConnectionRawMessage | DaeConnectionRawMessage

export type Connection = ConnectionRawMessage & {
  downloadSpeed: number
  uploadSpeed: number
}

export type Log = {
  type: LOG_LEVEL
  payload: string
}

export type LogWithSeq = Log & { seq: number; time: string }

// 两条通道归一后的 DNS 应答记录,由 assembly/config 的各方言产出。
// type 是**可读标签**(A / AAAA / CNAME / TYPE 65 …)而非数字:Clash 侧返回的是
// 数字类型码,在方言里转成标签;dae 侧本来就是标签。展示层要的一直是标签。
export type DNSAnswer = {
  name: string
  type: string
  ttl: number
  data: string
}

export type DNSQuery = {
  AD: boolean
  CD: boolean
  RA: boolean
  RD: boolean
  TC: boolean
  status: number
  Question: {
    Name: string
    Qtype: number
    Qclass: number
  }[]
  Answer?: {
    TTL: number
    data: string
    name: string
    type: number
  }[]
}

export type SourceIPLabel = {
  key: string
  label: string
  id: string
  scope?: string[]
}

// smart core
export interface NodeRank {
  Name: string
  Rank: string
  Weight: number
}

// honk core —— GET /stats 的用户态运行时快照。
// 该端点还会返回就绪池 / warm 资源 / TCP / Score / UDP-NFQUEUE 等内部计量
// (完整 schema 见 honk 仓库 doc/en/reference/api.md 的「GET /stats」一节),
// 面板只取其中的出站统计,故这里只声明用得到的部分。
export type HonkStats = {
  outbounds: {
    name: string
    totalConns: number
    activeConns: number
    upload: number
    download: number
    errors: number
  }[]
}

// ==========================================================================
// dae REST API
// ==========================================================================
// 与 HonkStats 同样的约定:只声明面板实际用到的字段,
// 完整 schema 见 dae-api 文档 v0.1.0。

export type DaeVersion = {
  version: string
  go_version: string
  build_time: string
}

// GET /api/groups。节点的 alive / latency_ms 直接来自这里,
// 故不再单独打 GET /api/nodes/latency。
export type DaeGroup = {
  name: string
  policy: string
  nodes: {
    name: string
    alive: boolean
    latency_ms: number
  }[]
}

// GET /api/runtime/status。面板只取内存、瞬时速率与累计流量三块。
export type DaeRuntimeStatus = {
  memory: {
    heap_inuse_bytes: number
  }
  rates: {
    upload_rate: number
    download_rate: number
  }
  traffic: {
    upload_bytes: number
    download_bytes: number
  }
}

// GET /api/connections 的原样响应:id 还是 uint64,network 还没打上。
export type DaeConnectionResponseItem = Omit<DaeConnectionRawMessage, 'id' | 'network'> & {
  id: number
}

export type DaeConnections = {
  tcp: DaeConnectionResponseItem[]
  udp: DaeConnectionResponseItem[]
  total_tcp: number
  total_udp: number
}

// GET /api/config。只读,且只有 log_level 能落进面板的 Config。
export type DaeConfig = {
  global?: {
    log_level?: string
  }
}

// POST /api/reload | /api/suspend | /api/nodes/check 的统一响应。
export type DaeActionResult = {
  ok: boolean
  message?: string
  error?: string
}

// GET /api/dns/query。dae 支持一次问多个 type,应答里的类型是标签而非数字码。
export type DaeDNSQuery = {
  domain: string
  types: string[]
  cached: boolean
  upstream: string
  status: string
  elapsed_ms: number
  answers?: {
    name: string
    type: string
    class: string
    ttl: number
    data: string
  }[]
}

// GET /api/dns/cache。dae v0.1.0 只提供读取,没有清空缓存的端点。
export type DaeDNSCache = {
  entries: {
    domain: string
    type: string
    answer: string
    ttl: number
    deadline: string
  }[]
  total: number
}
