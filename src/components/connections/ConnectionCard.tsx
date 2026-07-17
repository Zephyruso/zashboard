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
import { first, last } from 'lodash-es'
import { computed, defineComponent } from 'vue'
import type { JSX } from 'vue/jsx-runtime'
import HighlightText from '../common/HighlightText.vue'
import ProxyName from '../proxies/ProxyName.vue'

// 渲染上下文:每张卡每次 render 只分配这一个对象 + 一个 highlighted 闭包。
// 原实现每次 render 重建 23 键 componentMap(数十个闭包),实际只用其中 6-8 个。
type CardRenderContext = {
  conn: Connection
  chains: string[]
  filter: string
  direction: PROXY_CHAIN_DIRECTION | string
  highlighted: (key: CONNECTIONS_TABLE_ACCESSOR_KEY) => JSX.Element
}

const cardRenderers: Record<
  CONNECTIONS_TABLE_ACCESSOR_KEY,
  (ctx: CardRenderContext) => JSX.Element
> = {
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Host]: (ctx) => (
    <span class="text-main w-80 grow truncate">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Host)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Destination]: (ctx) => (
    <span class="w-80 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Destination)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress]: (ctx) => (
    <span class="w-80 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP]: (ctx) => (
    <span class="w-80 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP]: (ctx) => (
    <span class="w-40 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort]: (ctx) => (
    <span class="w-20 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost]: (ctx) => (
    <span class="w-80 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Type]: (ctx) => (
    <span class="w-60 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Type)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Rule]: (ctx) => (
    <span class="w-80 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Rule)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Process]: (ctx) => (
    <span class="w-60 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Process)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Chains]: (ctx) => (
    <span
      class={[
        'flex w-80 grow items-center gap-1 truncate break-all',
        ctx.direction === PROXY_CHAIN_DIRECTION.REVERSE && 'flex-row-reverse justify-end',
      ]}
    >
      {
        <ProxyName
          name={last(ctx.chains)!}
          filter={ctx.filter}
        />
      }
      {last(ctx.chains) !== first(ctx.chains) && (
        <>
          <ArrowRightCircleIcon class="h-4 w-4 shrink-0"></ArrowRightCircleIcon>
          {
            <ProxyName
              name={first(ctx.chains)!}
              filter={ctx.filter}
            />
          }
        </>
      )}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound]: (ctx) => (
    <span class="w-60 grow truncate break-all">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound)}
    </span>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Download]: (ctx) => (
    <div class="flex items-center text-xs whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Download)}
      <ArrowDownIcon class="text-success ml-1 h-3 w-3" />
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Upload]: (ctx) => (
    <div class="flex items-center text-xs whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Upload)}
      <ArrowUpIcon class="text-info ml-1 h-3 w-3" />
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed]: (ctx) => (
    <div class="flex items-center text-xs whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed)}
      <ArrowDownCircleIcon class="text-success ml-1 h-4 w-4" />
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed]: (ctx) => (
    <div class="flex items-center text-xs whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed)}
      <ArrowUpCircleIcon class="text-info ml-1 h-4 w-4" />
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime]: (ctx) => (
    <div class="whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime)}
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType]: (ctx) => (
    <div class="whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType)}
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser]: (ctx) => (
    <div class="whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser)}
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol]: (ctx) => (
    <div class="whitespace-nowrap">{ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol)}</div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType]: (ctx) => (
    <div class="whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType)}
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound]: (ctx) => (
    <div class="whitespace-nowrap">
      {ctx.highlighted(CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound)}
    </div>
  ),
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Close]: (ctx) => {
    const closeButton = (
      <button
        class="btn btn-circle btn-xs"
        onClick={(e) => {
          e.stopPropagation()
          disconnectByIdAPI(ctx.conn.id)
        }}
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
    )

    if (getConnectionSmartBlock(ctx.conn) === 'normal') {
      const degradeButton = (
        <button
          class="btn btn-circle btn-xs"
          onClick={(e) => {
            e.stopPropagation()
            blockConnectionByIdAPI(ctx.conn.id)
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

    // Close 键的过滤按依赖缓存,不再每行每拍重跑
    const visibleLines = computed(() =>
      connectionCardLines.value.map((line) =>
        line.filter(
          (key) =>
            key !== CONNECTIONS_TABLE_ACCESSOR_KEY.Close ||
            connectionTabShow.value !== CONNECTION_TAB_TYPE.CLOSED,
        ),
      ),
    )

    return () => {
      const conn = props.conn
      const displayOptions = {
        mode: 'card' as const,
        proxyChainDirection: proxyChainDirection.value,
        showFullProxyChain: showFullProxyChain.value,
      }
      const ctx: CardRenderContext = {
        conn,
        chains: getConnectionChains(conn),
        filter: connectionFilter.value,
        direction: proxyChainDirection.value,
        highlighted: (key) => (
          <HighlightText
            text={getConnectionDisplayValue(conn, key, displayOptions)}
            filter={ctx.filter}
          />
        ),
      }

      return (
        <div
          class={[
            'scroller-item text-base-content/65 flex cursor-pointer flex-col gap-1 px-3 py-2',
          ]}
          onClick={() => handlerInfo(conn)}
        >
          {visibleLines.value.map((line) => (
            <div class="flex h-5 items-center gap-1 text-sm">
              {line.map((key) => cardRenderers[key](ctx))}
            </div>
          ))}
        </div>
      )
    }
  },
})
