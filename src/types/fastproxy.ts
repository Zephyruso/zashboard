export type FastProxyCoreId = 'mihomo' | 'sing-box'

export type FastProxyResourceKind =
  | 'subscription'
  | 'node-set'
  | 'routing-rule-set'
  | 'rule-source-repository'
  | 'sing-box-rule-set'
  | 'mihomo-rule-provider'
  | 'group-set'
  | 'profile'

export type FastProxyOriginType = 'manual' | 'clash-subscription' | 'plain-node'

export type FastProxyMetadata = {
  id: string
  kind: FastProxyResourceKind
  name: string
  description?: string
  originType: FastProxyOriginType
  createdAt: string
  updatedAt: string
}

export type FastProxyManagedInbound = {
  id: string
  enabled: boolean
  tag: string
  kind: string
  listen?: {
    address?: string
    port?: number
  }
  network?: string
  auth?: {
    users?: Array<{ username?: string; password?: string }>
  }
  tun?: {
    address?: string[]
    interfaceName?: string
    device?: string
    stack?: string
    mtu?: number
    autoRoute?: boolean
    autoRedirect?: boolean
    autoDetectInterface?: boolean
    strictRoute?: boolean
    dnsHijack?: string[]
    routeAddress?: string[]
    routeExcludeAddress?: string[]
    routeAddressSet?: string[]
    routeExcludeAddressSet?: string[]
    includeInterface?: string[]
    excludeInterface?: string[]
  }
  raw?: Record<string, unknown>
}

export type FastProxyTLSOptions = {
  enabled?: boolean
  insecure?: boolean
  disable_sni?: boolean
  server_name?: string
  alpn?: string[]
  utls?: {
    enabled?: boolean
    fingerprint?: string
  }
  reality?: {
    enabled?: boolean
    public_key?: string
    short_id?: string
  }
}

export type FastProxyTransportOptions = {
  type?: 'ws' | 'grpc' | 'http' | 'quic' | 'httpupgrade' | string
  path?: string
  headers?: Record<string, unknown>
  host?: string[]
  method?: string
  service_name?: string
  max_early_data?: number
  early_data_header_name?: string
  idle_timeout?: string
  ping_timeout?: string
  permit_without_stream?: boolean
}

export type FastProxyRuleMatchFields = {
  domain?: string[]
  domain_suffix?: string[]
  domain_keyword?: string[]
  domain_regex?: string[]
  geosite?: string[]
  ip_cidr?: string[]
  source_ip_cidr?: string[]
  geoip?: string[]
  source_geoip?: string[]
  port?: string[]
  port_range?: string[]
  source_port?: string[]
  source_port_range?: string[]
  auth_user?: string[]
  inbound?: string[]
  process_path?: string[]
  process_path_regex?: string[]
  process_name?: string[]
  user_id?: string[]
  network?: Array<'tcp' | 'udp' | 'icmp' | string>
  rule_set?: string[]
  invert?: boolean
  [key: string]: unknown
}

export type FastProxyBaseRule = {
  id: string
  action?: string
  outbound?: string
  raw?: string[]
  unsupportedCores?: FastProxyCoreId[]
  unsupportedReason?: string
}

export type FastProxyLogicalRule = FastProxyBaseRule &
  FastProxyRuleMatchFields & {
    type: 'logical'
    mode?: 'and' | 'or' | string
    rules?: FastProxyNormalizedRule[]
  }

export type FastProxyAtomicRule = FastProxyBaseRule &
  FastProxyRuleMatchFields & {
    type?: undefined
    mode?: undefined
    rules?: undefined
  }

export type FastProxyNormalizedNode = {
  id: string
  tag: string
  type: string
  server?: string
  server_port?: number
  source?: string
  network?: 'tcp' | 'udp' | string
  username?: string
  password?: string
  method?: string
  plugin?: string
  plugin_opts?: string
  udp_over_tcp?: boolean | Record<string, unknown>
  version?: '4' | '4a' | '5' | string
  path?: string
  headers?: Record<string, unknown>
  uuid?: string
  security?: string
  alter_id?: number
  flow?: string
  packet_encoding?: string
  global_padding?: boolean
  authenticated_length?: boolean
  up_mbps?: number
  down_mbps?: number
  obfs?: string | Record<string, unknown>
  auth?: string
  auth_str?: string
  congestion_control?: string
  udp_relay_mode?: string
  udp_over_stream?: boolean
  zero_rtt_handshake?: boolean
  heartbeat?: string
  local_address?: string[]
  private_key?: string
  peer_public_key?: string
  pre_shared_key?: string
  reserved?: number[] | string[]
  workers?: number
  mtu?: number
  tls?: FastProxyTLSOptions
  transport?: FastProxyTransportOptions
  raw?: Record<string, unknown>
  [key: string]: unknown
}

export type FastProxyNormalizedRule = FastProxyAtomicRule | FastProxyLogicalRule

export type FastProxyNormalizedGroup = {
  id: string
  tag: string
  type: string
  outbounds?: string[]
  raw?: Record<string, unknown>
}

export type FastProxyNormalizedConfig = {
  nodes?: FastProxyNormalizedNode[]
  rules?: FastProxyNormalizedRule[]
  groups?: FastProxyNormalizedGroup[]
  extras?: Record<string, unknown>
}

export type FastProxySubscriptionFetchOptions = {
  sourceInput?: string
  userAgent?: string
}

export type FastProxySubscriptionAutoUpdate = {
  enabled?: boolean
  intervalMinutes?: number
}

export type FastProxySubscriptionSyncStatus = {
  lastSyncedAt?: string
  lastSyncError?: string
}

export type FastProxySubscriptionResource = FastProxyMetadata & {
  sourceUrl?: string
  revision?: string
  fetch?: FastProxySubscriptionFetchOptions
  autoUpdate?: FastProxySubscriptionAutoUpdate
  sync?: FastProxySubscriptionSyncStatus
}

export type FastProxyNodeSetResource = FastProxyMetadata & {
  nodes?: FastProxyNormalizedNode[]
}

export type FastProxyNodeSetFile = {
  fileName: string
  nodeSet: FastProxyNodeSetResource
}

export type FastProxyNodeCachePage = {
  nodes: FastProxyNormalizedNode[]
  offset: number
  limit: number
  total: number
  nextOffset: number
  hasMore: boolean
}

export type FastProxyOperationEvent = {
  id?: number
  severity: string
  eventType: string
  resourceType?: string
  resourceId?: string
  profileId?: string
  core?: FastProxyCoreId
  message: string
  errorCode?: string
  context?: Record<string, unknown>
  createdAt: string
}

export type FastProxyOperationEventPage = {
  events: FastProxyOperationEvent[]
  offset: number
  limit: number
  total: number
  nextOffset: number
  hasMore: boolean
}

export type FastProxyRuleSourceRepositoryPage = {
  items: FastProxyRuleSourceRepository[]
  offset: number
  limit: number
  total: number
  nextOffset: number
  hasMore: boolean
}

export type FastProxyHealthCheckSample = {
  id?: number
  nodeId: string
  checkType: string
  latencyMs: number
  success: boolean
  errorSummary?: string
  checkedAt: string
}

export type FastProxyRuleSetResource = FastProxyMetadata & {
  ruleCards?: FastProxyRoutingRuleCard[]
  rules?: FastProxyNormalizedRule[]
  supportedCores?: FastProxyCoreId[]
}

export type FastProxyRoutingRuleTarget = {
  id: string
  name: string
  type: 'group' | 'node' | string
}

export type FastProxyRoutingRuleLeaf = {
  condition: string
  id: string
  sourceRule?: FastProxyNormalizedRule
  target: string
  unsupportedCores?: FastProxyCoreId[]
  unsupportedReason?: string
  value: string | string[]
}

export type FastProxyRoutingRuleCard = {
  enabled: boolean
  id: string
  name: string
  outboundTarget?: FastProxyRoutingRuleTarget | null
  rules?: FastProxyRoutingRuleLeaf[]
  sourceRule?: FastProxyNormalizedRule
  sourceSignature?: string
}

export type FastProxyRuleSourceCoreMapping = {
  core: FastProxyCoreId
  ref: string
  rootPath?: string
}

export type FastProxyRuleSourceRepository = FastProxyMetadata & {
  provider: 'github'
  owner: string
  repository: string
  builtIn?: boolean
  coreMappings?: FastProxyRuleSourceCoreMapping[]
  supportedCores?: FastProxyCoreId[]
}

export type FastProxyRuleSourceTreeEntry = {
  name: string
  path: string
  type: string
}

export type FastProxyRuleSourceTree = {
  repositoryId: string
  core: FastProxyCoreId
  ref: string
  path?: string
  entries?: FastProxyRuleSourceTreeEntry[]
}

export type FastProxyRuleSourceSelectableFile = {
  name: string
  path: string
  kind: FastProxyResourceKind
  format?: string
  behavior?: string
}

export type FastProxyRuleSourceSelectableFiles = {
  repositoryId: string
  core: FastProxyCoreId
  ref: string
  refreshedAt: string
  files?: FastProxyRuleSourceSelectableFile[]
}

export type FastProxyRuleSourceIndexFile = {
  core: FastProxyCoreId
  path: string
  logicalPath: string
  name: string
  kind: FastProxyResourceKind
  format?: string
  behavior?: string
  rawUrl: string
}

export type FastProxyRuleSourceIndexEntry = {
  logicalPath: string
  name: string
  files: Partial<Record<FastProxyCoreId, FastProxyRuleSourceIndexFile>>
}

export type FastProxyRuleSourceIndexDirectory = {
  name: string
  path: string
}

export type FastProxyRuleSourceIndex = {
  repositoryId: string
  owner: string
  repository: string
  path?: string
  refs: Partial<Record<FastProxyCoreId, string>>
  refreshedAt?: string
  offset?: number
  limit?: number
  total?: number
  nextOffset?: number
  hasMore?: boolean
  directories?: FastProxyRuleSourceIndexDirectory[]
  entries?: FastProxyRuleSourceIndexEntry[]
}

export type FastProxyRuleAssetSourceMode = 'repository-file' | 'remote' | 'local'

export type FastProxySingBoxRuleSetResource = FastProxyMetadata & {
  tag: string
  sourceMode: FastProxyRuleAssetSourceMode
  repositoryId?: string
  ref?: string
  path?: string
  url?: string
  localPath?: string
  format?: string
  updateInterval?: string
}

export type FastProxyMihomoRuleProviderResource = FastProxyMetadata & {
  provider: string
  sourceMode: FastProxyRuleAssetSourceMode
  repositoryId?: string
  ref?: string
  path?: string
  url?: string
  localPath?: string
  behavior?: string
  format?: string
  interval?: string
}

export type FastProxySingBoxRuleSetPage = {
  items: FastProxySingBoxRuleSetResource[]
  offset: number
  limit: number
  total: number
  nextOffset: number
  hasMore: boolean
}

export type FastProxyMihomoRuleProviderPage = {
  items: FastProxyMihomoRuleProviderResource[]
  offset: number
  limit: number
  total: number
  nextOffset: number
  hasMore: boolean
}

export type FastProxyGroupSetResource = FastProxyMetadata & {
  groups?: FastProxyNormalizedGroup[]
}

export type FastProxyProfileResource = FastProxyMetadata & {
  selectedCore: FastProxyCoreId
  subscriptionIds?: string[]
  nodeSetIds?: string[]
  ruleSetIds?: string[]
  groupSetIds?: string[]
}

export type FastProxyGlobalDNSServer = {
  id: string
  name: string
  role: string
  protocol: string
  address: string
  port?: string
  path?: string
  detour?: string
  clientSubnet?: string
  skipCertVerify?: boolean
}

export type FastProxyGlobalDNSRule = {
  id: string
  matcher: string
  value: string
  serverName?: string
  strategy?: string
  clientSubnet?: string
}

export type FastProxyGlobalConfigFieldValue =
  | string
  | boolean
  | number
  | null
  | string[]
  | Record<string, unknown>

export type FastProxyGlobalConfig = {
  fields?: Record<string, FastProxyGlobalConfigFieldValue>
  dnsServers?: FastProxyGlobalDNSServer[]
  dnsRules?: FastProxyGlobalDNSRule[]
  inbounds?: FastProxyManagedInbound[]
  updatedAt?: string
}

export type FastProxyRuntimeStatus = {
  core?: FastProxyCoreId
  selectedCore?: FastProxyCoreId
  state: 'stopped' | 'starting' | 'running' | 'failed' | string
  startedAt?: string
  error?: string
  pendingRestart?: boolean
}

export type FastProxyRepositoryBootstrap = {
  profiles: FastProxyProfileResource[]
  subscriptions: FastProxySubscriptionResource[]
  nodeSets: FastProxyNodeSetResource[]
  routingRuleSets: FastProxyRuleSetResource[]
  ruleSourceRepositories: FastProxyRuleSourceRepository[]
  ruleSourceIndexes?: FastProxyRuleSourceIndex[]
  singBoxRuleSets: FastProxySingBoxRuleSetResource[]
  mihomoRuleProviders: FastProxyMihomoRuleProviderResource[]
  groupSets: FastProxyGroupSetResource[]
  config: FastProxyGlobalConfig
}

export type FastProxyBootstrapPayload = {
  dataDir: string
}

export type FastProxyCoreInventory = {
  cores: FastProxyCoreInventoryItem[]
}

export type FastProxyCoreInventoryItem = {
  core: FastProxyCoreId
  binaryName: string
  configured: boolean
  configuredPath?: string
  cached: boolean
  cachedPath?: string
  cachedVersion?: string
  firstStartAction: 'use-local' | 'download'
}

export type FastProxyCoreUpdateInfo = {
  core: FastProxyCoreId
  currentVersion?: string
  latestVersion: string
  updateAvailable: boolean
  cached: boolean
  assetName: string
  assetUrl: string
}

export type FastProxyRuntimeResource = {
  name: string
  path: string
  size: number
  updatedAt: string
}

export type FastProxyRuntimeResourceInventory = {
  resources: FastProxyRuntimeResource[]
}

export type FastProxyGitHubTokenSetting = {
  configured: boolean
  source?: 'saved' | 'environment'
}

export type FastProxyImportResult = {
  diagnostics?: {
    warnings?: string[]
  }
  subscription?: FastProxySubscriptionResource
  nodeSet?: FastProxyNodeSetResource
  ruleSet?: FastProxyRuleSetResource
  groupSet?: FastProxyGroupSetResource
}
