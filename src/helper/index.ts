import { capabilities } from '@/assembly/backend'
import { connectionAccessor } from '@/assembly/connections'
import { hiddenGroupMap, proxyMap } from '@/assembly/proxies'
import { NOT_CONNECTED, PROXY_CHAIN_DIRECTION, PROXY_TYPE, ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import {
  customThemes,
  lowLatency,
  mediumLatency,
  proxyChainDirection,
  splitOverviewPage,
} from '@/store/settings'
import type { Connection } from '@/types'
import dayjs from 'dayjs'
import * as ipaddr from 'ipaddr.js'
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

// 以下 getConnectionXxx 均委托给 assembly 层「按当前后端动态选用」的访问器,
// view / store 直接读取这些 view 友好的派生值,无需感知后端差异。
export const getConnectionChains = (connection: Connection) =>
  connectionAccessor().chains(connection)

export const getConnectionDownload = (connection: Connection) =>
  connectionAccessor().download(connection)

export const getConnectionUpload = (connection: Connection) =>
  connectionAccessor().upload(connection)

export const getConnectionStart = (connection: Connection) => connectionAccessor().start(connection)

export const getConnectionRule = (connection: Connection) => connectionAccessor().rule(connection)

export const getConnectionRulePayload = (connection: Connection) =>
  connectionAccessor().rulePayload(connection)

export const getConnectionSourceIP = (connection: Connection) =>
  connectionAccessor().sourceIP(connection)

export const getConnectionSourcePort = (connection: Connection) =>
  connectionAccessor().sourcePort(connection)

export const getConnectionNetwork = (connection: Connection) =>
  connectionAccessor().network(connection)

export const getConnectionSmartBlock = (connection: Connection) =>
  connectionAccessor().smartBlock(connection)

export const getConnectionHostname = (connection: Connection) =>
  connectionAccessor().hostname(connection)

export const getHostFromConnection = (connection: Connection) =>
  connectionAccessor().host(connection)

export const getProcessFromConnection = (connection: Connection) =>
  connectionAccessor().process(connection)

export const getDestinationFromConnection = (connection: Connection) =>
  connectionAccessor().destination(connection)

export const getNetworkTypeFromConnection = (connection: Connection) =>
  connectionAccessor().networkType(connection)

export const getInboundUserFromConnection = (connection: Connection) =>
  connectionAccessor().inboundUser(connection)

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
  const chains = [...getConnectionChains(connection)]

  if (proxyChainDirection.value === PROXY_CHAIN_DIRECTION.NORMAL) {
    chains.reverse()
  }

  return chains.join('')
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
  if (params.data.init) {
    return ``
  }
  return `
    <div class="flex items-center my-2 gap-1">
      <div class="w-4 h-4 rounded-full" style="background-color: ${params.color}"></div>
      ${params.seriesName}
      (${dayjs(params.data.name).format('HH:mm:ss')}): ${prettyBytesHelper(params.data.value[1], {
        binary: binary,
      })}${suffix}
    </div>`
}

export const getColorForLatency = (latency: number) => {
  if (latency === NOT_CONNECTED) {
    return ''
  } else if (latency < lowLatency.value) {
    return 'text-low-latency'
  } else if (latency < mediumLatency.value) {
    return 'text-medium-latency'
  } else {
    return 'text-high-latency'
  }
}

export const renderRoutes = computed(() => {
  const caps = capabilities.value
  // capability gate per route; routes not listed here are always shown
  const routeCapable: Partial<Record<ROUTE_NAME, boolean>> = {
    [ROUTE_NAME.rules]: caps.rules,
    [ROUTE_NAME.tools]: caps.tools,
  }
  return Object.values(ROUTE_NAME).filter((r) => {
    if (r === ROUTE_NAME.setup) return false
    if (!splitOverviewPage.value && r === ROUTE_NAME.overview) return false
    if (r in routeCapable && routeCapable[r] === false) return false
    return true
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
