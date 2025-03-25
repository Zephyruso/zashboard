const en = {
  setup: 'Setup',
  overview: 'Overview',
  proxies: 'Proxies',
  rules: 'Rules',
  connections: 'Connections',
  logs: 'Logs',
  protocol: 'Protocol',
  host: 'Host',
  port: 'Port',
  password: 'Password',
  submit: 'Submit',
  cancel: 'Cancel',
  download: 'Download',
  upload: 'Upload',
  downloadSpeed: 'Download Speed',
  uploadSpeed: 'Upload Speed',
  memoryUsage: 'Memory',
  version: 'Version',
  noContent: 'No Content',
  flushFakeIP: 'Flush Fake IP',
  chains: 'Chains',
  sortBy: 'Sort By',
  rule: 'Rule',
  sourceIP: 'Source IP',
  activeConnections: 'Active',
  closedConnections: 'Closed',
  logLevel: 'Log Level',
  twoColumnProxyGroup: 'Two-Column Proxy Group',
  type: 'Type',
  process: 'Process',
  connectTime: 'Time',
  sourcePort: 'Source Port',
  destination: 'Final Destination',
  destinationType: 'Dest Type',
  inboundUser: 'Inbound User',
  dl: 'DL',
  ul: 'UL',
  dlSpeed: 'DL Speed',
  ulSpeed: 'UL Speed',
  settings: 'Settings',
  speedtestUrl: 'Speedtest URL',
  speedtestTimeout: 'Speedtest Timeout',
  connectionStyle: 'Connection Style',
  card: 'Card',
  table: 'Table',
  customTableColumns: 'Custom Table Columns',
  customCardLines: 'Custom Card Lines',
  close: 'Close',
  defaultTheme: 'Default Theme',
  darkTheme: 'Dark Theme',
  proxyProvider: 'Proxy Provider',
  ruleProvider: 'Rule Provider',
  expire: 'Expire',
  noExpire: 'Null',
  updated: 'Updated',
  upgradeUI: 'Upgrade Dashboard',
  updateAllProviders: 'Update All Providers',
  reloadConfigs: 'Reload Configs',
  mode: 'Mode',
  proxySortType: 'Proxy Sort Type',
  defaultsort: 'Configs Order',
  nameasc: 'Name Asc',
  namedesc: 'Name Desc',
  latencydesc: 'Latency Desc',
  latencyasc: 'Latency Asc',
  language: 'Language',
  automaticDisconnection: 'Automatic Disconnection',
  backend: 'Backend',
  tunMode: 'Tun Mode',
  upgradeCore: 'Upgrade Core',
  updateGeoDatabase: 'Update Geo',
  truncateProxyName: 'Truncate Proxy Name',
  sourceIPLabels: 'Source IP Labels',
  proxyPreviewType: 'Proxies Preview Type',
  auto: 'Auto',
  dots: 'Dots',
  bar: 'Bar',
  exportSettings: 'Export Settings',
  importSettings: 'Import Settings',
  unavailableProxy: 'Hide Unavailable Proxies',
  protocolTips:
    'You are trying to connect to an HTTP backend, but zashboard is provided via HTTPS. This may cause connection errors. Please allow insecure content in your browser settings or use the HTTP version of the zashboard, such as http://board.zash.run.place.',
  global: 'Global',
  direct: 'Direct',
  lowLatencyDesc: 'Yellow Threshold',
  mediumLatencyDesc: 'Red Threshold',
  fonts: 'Fonts',
  unauthorizedTip: 'Unauthorized, please login again.',
  restartCore: 'Restart Core',
  checkUpgrade: 'Check For Upgrade',
  autoUpgrade: 'Auto Upgrade',
  secondaryPath: 'Secondary Path',
  secondaryPathTip: 'If present, start with a "/", otherwise leave it empty.',
  logRetentionLimit: 'Log Retention Limit',
  DNSQuery: 'DNS Query',
  currentBackendUnavailable:
    'The current backend is unavailable. Would you like to switch to another backend?',
  confirm: 'Confirm',
  backendSwitchTo: 'Automatic Switch to {backend}',
  ipv6Test: 'IPv6 Test',
  socksPort: 'Socks Port',
  httpPort: 'HTTP Port',
  mixedPort: 'Mixed Port',
  redirPort: 'Redir Port',
  tproxyPort: 'TProxy Port',
  tableSize: 'Table Size',
  proxyCardSize: 'Proxy Card Size',
  small: 'Small',
  normal: 'Normal',
  large: 'Large',
  autoIPCheckWhenStart: 'Auto IP Check When Start',
  autoConnectionCheckWhenStart: 'Auto Connection Check When Start',
  chinaIP: 'China IP',
  globalIP: 'Global IP',
  networkInfo: 'Network Info',
  autoSwitchTheme: 'Auto Switch Theme',
  customBackgroundURL: 'Background URL',
  splitOverviewPage: 'Split Overview Page',
  manageHiddenGroup: 'Manage Hidden Groups',
  showIPAndConnectionInfo: 'Display IP and Connection Info',
  transparent: 'Transparent',
  iconSize: 'Icon Size',
  iconMarginRight: 'Icon Margin Right',
  allowLan: 'Allow LAN',
  proxyChainDirection: 'Proxy Chain Direction',
  reverse: 'Reverse',
  sniffHost: 'Sniff Host',
  ipScreenshotTip: 'Please make sure to hide the IP when taking screenshots.',
  showStatisticsWhenSidebarCollapsed: 'Display Statistics When Sidebar Collapsed',
  totalConnections: 'Total Connections',
  mostDownloadHost: 'Most Download Host',
  mostUploadHost: 'Most Upload Host',
  mostDownloadSourceIP: 'Most Download Source IP',
  mostUploadSourceIP: 'Most Upload Source IP',
  mostDownloadProxy: 'Most Download Proxy',
  mostUploadProxy: 'Most Upload Proxy',
  manual: 'Manual',
  tableWidthMode: 'Table Width Mode',
  testFinishedTip: '{number} Test Finished',
  updateFinishedTip: '{number} Update Finished',
  independentLatencyTest: 'Independent Latency Test',
  independentLatencyTestTip:
    "Enabling Independent Latency Test will attempt to use the URLs specified in the configuration file instead of the zashboard's URL settings during the latency test. Latency will be displayed independently based on the URLs set in the policy groups.",
  search: 'Search',
  allSourceIP: 'All Source IPs',
  importing: 'Importing',
  hideConnection: 'Hide Connection',
  hideConnectionRegex: 'Hide Connection Regex',
  hideConnectionTip:
    'You can use a case-insensitive regular expression to match and hide unwanted connections.',
  loadBalance: 'Load Balance',
  label: 'Label',
  optional: 'Optional',
  swipeInTabs: 'Swipe to Switch Between Tabs',
  simpleCardPreset: 'Simple Preset',
  detailedCardPreset: 'Detailed Preset',
  refresh: 'Refresh',
  reset: 'Reset',
  minProxyCardWidth: 'Proxy Card Min Width',
  displayGlobalByMode: 'Display GLOBAL By Mode',
  proxyCountMode: 'Proxies Count Mode',
  filteredTotal: 'Filtered Total',
  total: 'Total',
  aliveTotal: 'Alive / Total',
  displaySelectedNode: 'Display Selected Node',
  displayLatencyNumber: 'Display Latency',
  tipForFixed:
    'The current policy group is locked to the current node. Perform a speedtest to restore the urltest/fallback behavior.',
  remoteAddress: 'Remote Address',
  themeName: 'Theme Name',
  save: 'Save',
  moreDetails: 'More Details',
  customIcon: 'Custom Icon',
}

export type LANG_MESSAGE = typeof en
export default en
