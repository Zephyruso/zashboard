// api 层 · dae REST API 的纯请求函数。
//
// dae 的端点一律带 /api 前缀,前缀写在各函数的路径里而不是 baseURL 上 ——
// baseURL 由 api/http.ts 的拦截器从 activeBackend 拼出(含用户配置的
// secondaryPath,反代场景要用),这里再动一次就把那层覆盖掉了。
//
// 鉴权与 Clash 通道完全一致(Authorization: Bearer <password>),所以拦截器
// 不必分通道;401 打开后端编辑框的处理也天然复用。
//
// dae **没有 WebSocket**,连接与运行时统计都靠轮询,轮询的生命周期归 assembly 管,
// 本层只出请求。
import type { ProbeResult } from '@/helper/connectivity'
import { getUrlFromBackend } from '@/helper/utils'
import type {
  Backend,
  DaeActionResult,
  DaeConfig,
  DaeConnections,
  DaeDNSCache,
  DaeDNSQuery,
  DaeGroup,
  DaeRuntimeStatus,
  DaeVersion,
} from '@/types'
import axios from 'axios'

export const fetchDaeVersionAPI = () => axios.get<DaeVersion>('/api/version')

// 节点的 alive / latency_ms 已经挂在组里,故不再单独打 GET /api/nodes/latency。
export const fetchDaeGroupsAPI = () => axios.get<DaeGroup[]>('/api/groups')

// 全量触发一次延迟检测。dae 没有单节点 / 单组测速端点,只有这一个开关。
export const checkDaeNodesAPI = () => axios.post<DaeActionResult>('/api/nodes/check')

// limit 缺省是 100,对连接页来说太少;dae 侧就是一次截断,给大一点由前端自己筛。
export const fetchDaeConnectionsAPI = (limit: number) =>
  axios.get<DaeConnections>('/api/connections', {
    params: { type: 'all', limit },
  })

export const fetchDaeRuntimeStatusAPI = () => axios.get<DaeRuntimeStatus>('/api/runtime/status')

export const fetchDaeConfigAPI = () => axios.get<DaeConfig>('/api/config')

// axios 默认把数组序列化成 `type[]=A`,而 dae 认的是重复键 `type=A&type=AAAA`
// (见 dns-query 文档的 type 参数)。这里自己拼,别把方括号打过去。
const serializeRepeatedParams = (params: Record<string, unknown>) => {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue

    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)))
    } else {
      search.append(key, String(value))
    }
  }

  return search.toString()
}

// dae 支持一次问多个记录类型。
export const queryDaeDNSAPI = (params: { domain: string; type: string[]; upstream?: string }) =>
  axios.get<DaeDNSQuery>('/api/dns/query', {
    params,
    paramsSerializer: { serialize: serializeRepeatedParams },
  })

// 只读。dae v0.1.0 没有清空 DNS 缓存的端点 —— 那是 Clash 通道的 /cache/dns/flush。
export const fetchDaeDNSCacheAPI = (params: { domain?: string; limit: number }) =>
  axios.get<DaeDNSCache>('/api/dns/cache', { params })

export const reloadDaeAPI = () => axios.post<DaeActionResult>('/api/reload')

export const suspendDaeAPI = () => axios.post<DaeActionResult>('/api/suspend')

// 连通性探测。与 probeClashChannel 同一套结构与失败分类,只是打的端点不同:
// 打的就是面板实际在用的那条 API(/api/version),所以它通了就是真通了。
export const probeDaeChannel = async (
  backend: Backend,
  timeout: number,
  signal?: AbortSignal,
): Promise<ProbeResult> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const onAbort = () => controller.abort()

  signal?.addEventListener('abort', onAbort, { once: true })

  const startAt = Date.now()
  const latency = () => Date.now() - startAt

  try {
    const res = await fetch(`${getUrlFromBackend(backend)}/api/version`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backend.password}`,
      },
      signal: controller.signal,
    })

    if (res.ok) return { ok: true, latency: latency() }

    return {
      ok: false,
      latency: latency(),
      kind: res.status === 401 ? 'unauthorized' : 'http',
      message: `HTTP ${res.status}`,
    }
  } catch (e) {
    // 外部取消(切走了 / 组件卸载)不是失败,但调用方已经不看结果了,归入超时即可。
    return {
      ok: false,
      latency: latency(),
      kind: controller.signal.aborted ? 'timeout' : 'network',
      message: e instanceof Error ? e.message : String(e),
    }
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onAbort)
  }
}
