import {
  blockConnectionByIdAPI,
  disconnectByIdAPI,
  getConnectionDisplayValue,
} from '@/assembly/connections'
import { useBounceOnVisible } from '@/composables/bouncein'
import { useConnections } from '@/composables/connections'
import {
  CONNECTION_TAB_TYPE,
  CONNECTIONS_TABLE_ACCESSOR_KEY,
  PROXY_CHAIN_DIRECTION,
} from '@/constant'
import { getConnectionChains, getConnectionSmartBlock } from '@/helper'
import { connectionFilter, connectionTabShow } from '@/store/connections'
import { connectionCardLines, proxyChainDirection, showFullProxyChain } from '@/store/settings'
import type { Connection } from '@/types'
import {
  ArrowDownCircleIcon,
  ArrowDownIcon,
  ArrowRightCircleIcon,
  ArrowUpCircleIcon,
  ArrowUpIcon,
  NoSymbolIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { first, last } from 'lodash'
import { defineComponent } from 'vue'
import type { JSX } from 'vue/jsx-runtime'
import HighlightText from '../common/HighlightText.vue'
import ProxyName from '../proxies/ProxyName.vue'

export default defineComponent<{
  conn: Connection
}>({
  props: {
    conn: Object,
  },
  name: 'ConnectionCard',
  setup(props) {
    const { handlerInfo } = useConnections()

    useBounceOnVisible()

    return () => {
      const conn = props.conn
      const chains = getConnectionChains(conn)
      const displayOptions = {
        mode: 'card' as const,
        proxyChainDirection: proxyChainDirection.value,
        showFullProxyChain: showFullProxyChain.value,
      }
      const highlightedText = (key: CONNECTIONS_TABLE_ACCESSOR_KEY) => (
        <HighlightText
          text={getConnectionDisplayValue(conn, key, displayOptions)}
          filter={connectionFilter.value}
        />
      )
      const componentMap: Record<CONNECTIONS_TABLE_ACCESSOR_KEY, () => JSX.Element> = {
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Host]: () => (
          <span class="text-main w-80 grow truncate">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Host)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Destination]: () => (
          <span class="w-80 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Destination)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress]: () => (
          <span class="w-80 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP]: () => (
          <span class="w-80 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP]: () => (
          <span class="w-40 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort]: () => (
          <span class="w-20 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost]: () => (
          <span class="w-80 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Type]: () => (
          <span class="w-60 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Type)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Rule]: () => (
          <span class="w-80 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Rule)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Process]: () => (
          <span class="w-60 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Process)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Chains]: () => (
          <span
            class={[
              'flex w-80 grow items-center gap-1 truncate break-all',
              proxyChainDirection.value === PROXY_CHAIN_DIRECTION.REVERSE &&
                'flex-row-reverse justify-end',
            ]}
          >
            {
              <ProxyName
                name={last(chains)!}
                filter={connectionFilter.value}
              />
            }
            {last(chains) !== first(chains) && (
              <>
                <ArrowRightCircleIcon class="h-4 w-4 shrink-0"></ArrowRightCircleIcon>
                {
                  <ProxyName
                    name={first(chains)!}
                    filter={connectionFilter.value}
                  />
                }
              </>
            )}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound]: () => (
          <span class="w-60 grow truncate break-all">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound)}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Download]: () => (
          <div class="flex items-center text-xs whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Download)}
            <ArrowDownIcon class="text-success ml-1 h-3 w-3" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Upload]: () => (
          <div class="flex items-center text-xs whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Upload)}
            <ArrowUpIcon class="text-info ml-1 h-3 w-3" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed]: () => (
          <div class="flex items-center text-xs whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed)}
            <ArrowDownCircleIcon class="text-success ml-1 h-4 w-4" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed]: () => (
          <div class="flex items-center text-xs whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed)}
            <ArrowUpCircleIcon class="text-info ml-1 h-4 w-4" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime]: () => (
          <div class="whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime)}
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType]: () => (
          <div class="whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType)}
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser]: () => (
          <div class="whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser)}
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol]: () => (
          <div class="whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol)}
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType]: () => (
          <div class="whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType)}
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound]: () => (
          <div class="whitespace-nowrap">
            {highlightedText(CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound)}
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Close]: () => {
          const closeButton = (
            <button
              class="btn btn-circle btn-xs"
              onClick={(e) => {
                e.stopPropagation()
                disconnectByIdAPI(conn.id)
              }}
            >
              <XMarkIcon class="h-4 w-4" />
            </button>
          )

          if (getConnectionSmartBlock(conn) === 'normal') {
            const degradeButton = (
              <button
                class="btn btn-circle btn-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  blockConnectionByIdAPI(conn.id)
                }}
              >
                <NoSymbolIcon class="h-4 w-4" />
              </button>
            )
            return (
              <div class="flex gap-1">
                {degradeButton}
                {closeButton}
              </div>
            )
          }
          return closeButton
        },
      }
      return (
        <div
          class={[
            'scroller-item text-base-content/65 flex cursor-pointer flex-col gap-1 px-3 py-2',
          ]}
          onClick={() => handlerInfo(conn)}
        >
          {connectionCardLines.value.map((line) => (
            <div class="flex h-5 items-center gap-1 text-sm">
              {line
                .filter(
                  (key) =>
                    key !== CONNECTIONS_TABLE_ACCESSOR_KEY.Close ||
                    connectionTabShow.value !== CONNECTION_TAB_TYPE.CLOSED,
                )
                .map((key) => {
                  return componentMap[key]()
                })}
            </div>
          ))}
        </div>
      )
    }
  },
})
