import { CONNECTIONS_TABLE_ACCESSOR_KEY, PROXY_CHAIN_DIRECTION } from '@/constant'
import type { Connection } from '@/types'
import {
  getDestinationFromConnection,
  getDestinationTypeFromConnection,
  getHostFromConnection,
  getInboundUserFromConnection,
  getNetworkTypeFromConnection,
  getProcessFromConnection,
} from '.'
import { getIPLabelFromMap } from './sourceip'
import { fromNow, prettyBytesHelper } from './utils'

type ConnectionDisplayMode = 'card' | 'table'

type ConnectionDisplayOptions = {
  mode: ConnectionDisplayMode
  proxyChainDirection: PROXY_CHAIN_DIRECTION | string
  showFullProxyChain: boolean
}

const getVisibleChains = (connection: Connection, options: ConnectionDisplayOptions) => {
  let chains = connection.chains

  if ((options.mode === 'card' || !options.showFullProxyChain) && chains.length > 2) {
    chains = [chains[0], chains[chains.length - 1]]
  }

  return options.proxyChainDirection === PROXY_CHAIN_DIRECTION.REVERSE
    ? chains
    : [...chains].reverse()
}

export const getConnectionDisplayValue = (
  connection: Connection,
  key: CONNECTIONS_TABLE_ACCESSOR_KEY,
  options: ConnectionDisplayOptions,
) => {
  switch (key) {
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Type:
      return getNetworkTypeFromConnection(connection)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Process:
      return getProcessFromConnection(connection)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Host:
      return getHostFromConnection(connection)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Rule:
      return connection.rulePayload
        ? `${connection.rule}: ${connection.rulePayload}`
        : connection.rule
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Chains:
      return getVisibleChains(connection, options).join(' → ')
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound:
      return connection.chains[0] || ''
    case CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed:
      return `${prettyBytesHelper(connection.downloadSpeed)}/s`
    case CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed:
      return `${prettyBytesHelper(connection.uploadSpeed)}/s`
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Download:
      return prettyBytesHelper(connection.download)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Upload:
      return prettyBytesHelper(connection.upload)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime:
      return fromNow(connection.start)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP:
      return getIPLabelFromMap(connection.metadata.sourceIP)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort:
      return connection.metadata.sourcePort
    case CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost:
      return connection.metadata.sniffHost || '-'
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Destination:
      return getDestinationFromConnection(connection)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType:
      return getDestinationTypeFromConnection(connection)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress:
      return connection.metadata.remoteDestination || '-'
    case CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser:
      return getInboundUserFromConnection(connection)
    case CONNECTIONS_TABLE_ACCESSOR_KEY.Close:
      return ''
  }
}

export const getConnectionVisibleSearchValues = (
  connection: Connection,
  keys: CONNECTIONS_TABLE_ACCESSOR_KEY[],
  options: ConnectionDisplayOptions,
) => {
  return keys
    .filter((key) => key !== CONNECTIONS_TABLE_ACCESSOR_KEY.Close)
    .map((key) => getConnectionDisplayValue(connection, key, options))
}
