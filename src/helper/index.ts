import { proxiesFilter } from '@/composables/proxies'
import {
  NOT_CONNECTED,
  PROXY_CHAIN_DIRECTION,
  PROXY_SORT_TYPE,
  PROXY_TYPE,
  ROUTE_NAME,
} from '@/constant'
import { timeSaved } from '@/store/overview'
import { getLatencyByName, proxyMap } from '@/store/proxies'
import {
  customThemes,
  hideUnavailableProxies,
  language,
  lowLatency,
  mediumLatency,
  proxyChainDirection,
  proxySortType,
  sourceIPLabelList,
  splitOverviewPage,
} from '@/store/settings'
import type { Backend, Connection } from '@/types'
import dayjs from 'dayjs'
import prettyBytes, { type Options } from 'pretty-bytes'
import { computed, watch } from 'vue'

export const prettyBytesHelper = (bytes: number, opts?: Options) => {
  return prettyBytes(bytes, {
    binary: false,
    ...opts,
  })
}

export const fromNow = (timestamp: string) => {
  return dayjs(timestamp).locale(language.value).fromNow()
}

export const isProxyGroup = (name: string) => {
  const proxyNode = proxyMap.value[name]

  if (!proxyNode) {
    return false
  }

  return [
    PROXY_TYPE.Dns,
    PROXY_TYPE.Compatible,
    PROXY_TYPE.Direct,
    PROXY_TYPE.Reject,
    PROXY_TYPE.RejectDrop,
    PROXY_TYPE.Pass,
    PROXY_TYPE.Fallback,
    PROXY_TYPE.URLTest,
    PROXY_TYPE.LoadBalance,
    PROXY_TYPE.Selector,
  ].includes(proxyNode.type.toLowerCase() as PROXY_TYPE)
}

export const sortAndFilterProxyNodes = (proxies: string[], groupName?: string) => {
  const latencyMap = new Map<string, number>()
  const getLatencyForSort = (name: string) => {
    if (isProxyGroup(name)) {
      return -1
    }
    const latency = latencyMap.get(name)!

    return latency === 0 ? Infinity : latency
  }

  proxies = [...proxies]
  proxies.forEach((name) => {
    latencyMap.set(name, getLatencyByName(name, groupName))
  })

  if (hideUnavailableProxies.value) {
    proxies = proxies.filter((name) => {
      return isProxyGroup(name) || latencyMap.get(name)! > 0
    })
  }

  if (proxiesFilter.value) {
    proxies = proxies.filter((name) => {
      return name.toLowerCase().includes(proxiesFilter.value.toLowerCase())
    })
  }

  switch (proxySortType.value) {
    case PROXY_SORT_TYPE.DEFAULT:
      return proxies
    case PROXY_SORT_TYPE.NAME_ASC:
      return proxies.sort((prev, next) => prev.localeCompare(next))
    case PROXY_SORT_TYPE.NAME_DESC:
      return proxies.sort((prev, next) => next.localeCompare(prev))
    case PROXY_SORT_TYPE.LATENCY_ASC:
      return proxies.sort((prev, next) => getLatencyForSort(prev) - getLatencyForSort(next))
    case PROXY_SORT_TYPE.LATENCY_DESC:
      return proxies.sort((prev, next) => getLatencyForSort(next) - getLatencyForSort(prev))
  }
}

const CACHE_SIZE = 256
const ipLabelCache = new Map<string, string>()
const sourceIPMap = new Map<string, string>()
const sourceIPRegexList: { regex: RegExp; label: string }[] = []

const preprocessSourceIPList = () => {
  ipLabelCache.clear()
  sourceIPMap.clear()
  sourceIPRegexList.length = 0

  for (const { key, label } of sourceIPLabelList.value) {
    if (key.startsWith('/')) {
      sourceIPRegexList.push({ regex: new RegExp(key.slice(1), 'i'), label })
    } else {
      sourceIPMap.set(key, label)
    }
  }
}

const cacheResult = (ip: string, label: string) => {
  ipLabelCache.set(ip, label)

  if (ipLabelCache.size > CACHE_SIZE) {
    const firstKey = ipLabelCache.keys().next().value

    if (firstKey) {
      ipLabelCache.delete(firstKey)
    }
  }

  return label
}

watch(sourceIPLabelList, preprocessSourceIPList, { immediate: true, deep: true })

export const getIPLabelFromMap = (ip: string) => {
  if (!ip) return ip === '' ? 'Inner' : ''

  if (ipLabelCache.has(ip)) {
    return ipLabelCache.get(ip)!
  }

  const isIPv6 = ip.includes(':')

  if (isIPv6) {
    for (const [key, label] of sourceIPMap.entries()) {
      if (ip.endsWith(key)) {
        return cacheResult(ip, label)
      }
    }
  } else if (sourceIPMap.has(ip)) {
    return cacheResult(ip, sourceIPMap.get(ip)!)
  }

  for (const { regex, label } of sourceIPRegexList) {
    if (regex.test(ip)) {
      return cacheResult(ip, label)
    }
  }

  return cacheResult(ip, ip)
}

export const getHostFromConnection = (connection: Connection) => {
  return `${connection.metadata.host || connection.metadata.sniffHost || connection.metadata.destinationIP}:${
    connection.metadata.destinationPort
  }`
}

export const getProcessFromConnection = (connection: Connection) => {
  return (
    connection.metadata.process ||
    connection.metadata.processPath.replace(/^.*[/\\](.*)$/, '$1') ||
    '-'
  )
}

export const getDestinationFromConnection = (connection: Connection) => {
  return connection.metadata.destinationIP || connection.metadata.host
}

export const getDestinationTypeFromConnection = (connection: Connection) => {
  const destinationIP = connection.metadata.destinationIP

  if (!destinationIP) {
    return 'FQDN'
  } else if (destinationIP.includes(':')) {
    return 'IPv6'
  } else {
    return 'IPv4'
  }
}

export const getChainsStringFromConnection = (connection: Connection) => {
  const chains = [...connection.chains]

  if (proxyChainDirection.value === PROXY_CHAIN_DIRECTION.NORMAL) {
    chains.reverse()
  }

  return chains.join('')
}

export const getNetworkTypeFromConnection = (connection: Connection) => {
  return `${connection.metadata.type} | ${connection.metadata.network}`
}

export const getToolTipForParams = (
  params: ToolTipParams,
  config: {
    suffix: string
    binary: boolean
  },
) => {
  const { suffix = '', binary = false } = config

  // fake data
  if (params.data.name < timeSaved + 1) {
    return ``
  }
  return `
    <div class="flex items-center my-2 gap-1">
      <div class="w-4 h-4 rounded-full" style="background-color: ${params.color}"></div>
      ${params.seriesName}
      (${dayjs(params.data.name).format('HH:mm:ss')}): ${prettyBytesHelper(params.data.value, {
        binary: binary,
      })}${suffix}
    </div>`
}

export const exportSettings = () => {
  const settings: Record<string, string | null> = {}

  for (const key in localStorage) {
    if (key.startsWith('config/') || key.startsWith('setup/')) {
      settings[key] = localStorage.getItem(key)
    }
  }

  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'zashboard-settings'
  a.click()
  URL.revokeObjectURL(url)
}

export const getUrlFromBackend = (end: Omit<Backend, 'uuid'>) => {
  return `${end.protocol}://${end.host}:${end.port}${end.secondaryPath || ''}`
}

export const getColorForLatency = (latency: number) => {
  if (latency === NOT_CONNECTED) {
    return ''
  } else if (latency < lowLatency.value) {
    return 'text-green-500'
  } else if (latency < mediumLatency.value) {
    return 'text-yellow-500'
  } else {
    return 'text-red-500'
  }
}

export const renderRoutes = computed(() => {
  return Object.values(ROUTE_NAME).filter((r) => {
    return ![ROUTE_NAME.setup, !splitOverviewPage.value && ROUTE_NAME.overview].includes(r)
  })
})

export const applyCustomThemes = () => {
  document.querySelectorAll('.custom-theme').forEach((style) => {
    style.remove()
  })
  customThemes.value.forEach((theme) => {
    const style = document.createElement('style')
    const styleString = Object.entries(theme)
      .filter(([key]) => !['prefersdark', 'default', 'name', 'type', 'id'].includes(key))
      .map(([key, value]) => `${key}:${value}`)
      .join(';')

    style.innerHTML = `[data-theme="${theme.name}"] {
      ${styleString} 
    }`

    style.className = `custom-theme ${theme.name}`
    document.head.appendChild(style)
  })
}
