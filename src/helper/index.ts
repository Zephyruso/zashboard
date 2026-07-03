import { NOT_CONNECTED, PROXY_CHAIN_DIRECTION, PROXY_TYPE, ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import { fastProxyRuntimeStatus } from '@/store/fastproxyRepository'
import { timeSaved } from '@/store/overview'
import { hiddenGroupMap, proxyMap } from '@/store/proxies'
import { customThemes, lowLatency, mediumLatency, proxyChainDirection } from '@/store/settings'
import { activeBackendFlavor } from '@/store/setup'
import type { Connection } from '@/types'
import dayjs from 'dayjs'
import * as ipaddr from 'ipaddr.js'
import { head } from 'lodash'
import { computed } from 'vue'
import { prettyBytesHelper } from './utils'

export const isProxyGroup = (name: string) => {
  const proxyNode = proxyMap.value[name]

  if (!proxyNode) {
    return false
  }

  if (proxyNode.all?.length) {
    return true
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
    PROXY_TYPE.Smart,
  ].includes(proxyNode.type.toLowerCase() as PROXY_TYPE)
}

export const getHostFromConnection = (connection: Connection) => {
  const port = connection.metadata.destinationPort
  const host =
    connection.metadata.host || connection.metadata.sniffHost || connection.metadata.destinationIP

  if (host.includes(':')) {
    return `[${host}]:${port}`
  }
  return `${host}:${port}`
}

export const getProcessFromConnection = (connection: Connection) => {
  return (
    connection.metadata.process ||
    connection.metadata.processPath.replace(/^.*[/\\](.*)$/, '$1') ||
    '-'
  )
}

export const getDestinationFromConnection = (connection: Connection) => {
  const finalProxyType = proxyMap.value[head(connection.chains) || '']?.type.toLowerCase()

  if (finalProxyType === PROXY_TYPE.Direct && connection.metadata.remoteDestination) {
    return connection.metadata.remoteDestination
  }

  return connection.metadata.destinationIP || connection.metadata.host
}

export const getDestinationTypeFromConnection = (connection: Connection) => {
  const destination = getDestinationFromConnection(connection)

  if (ipaddr.IPv4.isIPv4(destination)) {
    return 'IPv4'
  } else if (ipaddr.IPv6.isIPv6(destination)) {
    return 'IPv6'
  } else {
    return 'FQDN'
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

export const getInboundUserFromConnection = (connection: Connection) => {
  return (
    connection.metadata.inboundUser ||
    connection.metadata.inboundName ||
    connection.metadata.inboundPort ||
    '-'
  )
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

const runtimePanelRoutes = new Set<string | symbol | undefined>([
  ROUTE_NAME.proxies,
  ROUTE_NAME.connections,
  ROUTE_NAME.rules,
  ROUTE_NAME.logs,
])

const isFastProxyRuntimeRunning = computed(
  () =>
    activeBackendFlavor.value !== 'fastproxy' || fastProxyRuntimeStatus.value?.state === 'running',
)

export const renderRoutes = computed(() => {
  return [
    ROUTE_NAME.home,
    ...[ROUTE_NAME.proxies, ROUTE_NAME.connections, ROUTE_NAME.rules, ROUTE_NAME.logs].filter(
      () => isFastProxyRuntimeRunning.value,
    ),
    ROUTE_NAME.routingRules,
    ROUTE_NAME.configSubscriptions,
    ROUTE_NAME.kernelManagement,
    ROUTE_NAME.configManagement,
    ROUTE_NAME.settings,
  ] as ROUTE_NAME[]
})

export const isRouteAvailable = (routeName: string | symbol | undefined) => {
  if (!routeName) {
    return false
  }

  if (activeBackendFlavor.value === 'fastproxy' && runtimePanelRoutes.has(routeName)) {
    return fastProxyRuntimeStatus.value?.state === 'running'
  }

  return true
}

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

export const applyKsuTheme = () => {
  if (window.ksu) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://mui.kernelsu.org/internal/colors.css'
    document.head.appendChild(link)
  }
}

export const isHiddenGroup = (group: string) => {
  if (Reflect.has(hiddenGroupMap.value, group)) {
    return hiddenGroupMap.value[group]
  }

  return proxyMap.value[group]?.hidden
}

export const handlerUpgradeSuccess = () => {
  showNotification({
    content: 'upgradeSuccess',
    type: 'alert-success',
  })
}
