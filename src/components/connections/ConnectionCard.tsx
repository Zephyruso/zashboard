import { blockConnectionByIdAPI, disconnectByIdAPI } from '@/api'
import { useBounceOnVisible } from '@/composables/bouncein'
import { useConnections } from '@/composables/connections'
import {
  CONNECTION_TAB_TYPE,
  CONNECTIONS_TABLE_ACCESSOR_KEY,
  PROXY_CHAIN_DIRECTION,
} from '@/constant'
import {
  getDestinationFromConnection,
  getDestinationTypeFromConnection,
  getHostFromConnection,
  getInboundUserFromConnection,
  getNetworkTypeFromConnection,
  getProcessFromConnection,
} from '@/helper'
import { getIPLabelFromMap } from '@/helper/sourceip'
import { fromNow, prettyBytesHelper } from '@/helper/utils'
import { connectionTabShow } from '@/store/connections'
import { connectionCardLines, proxyChainDirection } from '@/store/settings'
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
import { first, last } from 'lodash-es'
import { defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { JSX } from 'vue/jsx-runtime'
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
    const { t } = useI18n()

    useBounceOnVisible()

    return () => {
      const conn = props.conn
      const metadata = conn.metadata
      const componentMap: Record<CONNECTIONS_TABLE_ACCESSOR_KEY, JSX.Element> = {
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Host]: (
          <span class="text-main w-80 grow truncate">{getHostFromConnection(conn)}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Destination]: (
          <span class="w-80 grow truncate break-all">{getDestinationFromConnection(conn)}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress]: (
          <span class="w-80 grow truncate break-all">{conn.metadata.remoteDestination || '-'}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP]: (
          <span class="w-40 grow truncate break-all">{getIPLabelFromMap(metadata.sourceIP)}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort]: (
          <span class="w-20 grow truncate break-all">{metadata.sourcePort}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost]: (
          <span class="w-80 grow truncate break-all">{metadata.sniffHost || '-'}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Type]: (
          <span class="w-60 grow truncate break-all">{getNetworkTypeFromConnection(conn)}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Rule]: (
          <span class="w-80 grow truncate break-all">
            {conn.rule}
            {conn.rulePayload && <>: {conn.rulePayload}</>}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Process]: (
          <span class="w-60 grow truncate break-all">{getProcessFromConnection(conn)}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Chains]: (
          <span
            class={[
              'flex w-80 grow items-center gap-1 truncate break-all',
              proxyChainDirection.value === PROXY_CHAIN_DIRECTION.REVERSE &&
                'flex-row-reverse justify-end',
            ]}
          >
            {<ProxyName name={last(conn.chains)!} />}
            {last(conn.chains) !== first(conn.chains) && (
              <>
                <ArrowRightCircleIcon class="h-4 w-4 shrink-0"></ArrowRightCircleIcon>
                {<ProxyName name={first(conn.chains)!} />}
              </>
            )}
          </span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound]: (
          <span class="w-60 grow truncate break-all">{conn.chains[0]}</span>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Download]: (
          <div class="flex items-center gap-1 text-xs whitespace-nowrap">
            {prettyBytesHelper(conn.download)}
            <ArrowDownIcon class="text-success h-3 w-3" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Upload]: (
          <div class="flex items-center gap-1 text-xs whitespace-nowrap">
            {prettyBytesHelper(conn.upload)}
            <ArrowUpIcon class="text-info h-3 w-3" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed]: (
          <div class="flex items-center gap-1 text-xs whitespace-nowrap">
            {prettyBytesHelper(conn.downloadSpeed)}/s
            <ArrowDownCircleIcon class="text-success h-4 w-4" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed]: (
          <div class="flex items-center gap-1 text-xs whitespace-nowrap">
            {prettyBytesHelper(conn.uploadSpeed)}/s
            <ArrowUpCircleIcon class="text-info h-4 w-4" />
          </div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime]: (
          <div class="gap-1 whitespace-nowrap">{fromNow(conn.start)}</div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType]: (
          <div class="gap-1 whitespace-nowrap">{getDestinationTypeFromConnection(conn)}</div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser]: (
          <div class="gap-1 whitespace-nowrap">{getInboundUserFromConnection(conn)}</div>
        ),
        [CONNECTIONS_TABLE_ACCESSOR_KEY.Close]: (() => {
          const closeButton = (
            <button
              class="btn btn-circle btn-xs"
              aria-label={t('disconnectConnection')}
              title={t('disconnectConnection')}
              onClick={(e) => {
                e.stopPropagation()
                void disconnectByIdAPI(conn.id).catch(() => {})
              }}
            >
              <XMarkIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          )

          if (metadata.smartBlock === 'normal') {
            const degradeButton = (
              <button
                class="btn btn-circle btn-xs"
                aria-label={t('blockConnection')}
                title={t('blockConnection')}
                onClick={(e) => {
                  e.stopPropagation()
                  void blockConnectionByIdAPI(conn.id).catch(() => {})
                }}
              >
                <NoSymbolIcon
                  class="h-4 w-4"
                  aria-hidden="true"
                />
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
        })(),
      }
      return (
        <div
          class={[
            'scroller-item connection-row hover:bg-base-content/[0.04] flex cursor-pointer flex-col gap-1 px-3 py-2',
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
                  return componentMap[key]
                })}
            </div>
          ))}
        </div>
      )
    }
  },
})
