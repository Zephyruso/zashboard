// 组装层 · config 门面。持有统一的 configs 状态,按后端类型路由到 clash / singbox 实现。
import { isSingboxBackend } from '@/assembly/backend'
import type { Config } from '@/types'
import { ref } from 'vue'

export const defaultConfig: Config = {
  port: 0,
  'socks-port': 0,
  'redir-port': 0,
  'tproxy-port': 0,
  'mixed-port': 0,
  'allow-lan': false,
  'bind-address': '',
  mode: '',
  'mode-list': [],
  modes: [],
  'log-level': '',
  ipv6: false,
  tun: {
    enable: false,
  },
}

export const configs = ref<Config>({ ...defaultConfig })

// 按需动态加载后端实现,避免 clash 后端下也实例化 sing-box gRPC。
const load = () => (isSingboxBackend.value ? import('./singbox') : import('./clash'))

export const fetchConfigs = async () => (await load()).fetchConfigs()

export const updateConfigs = async (cfg: Record<string, string | boolean | object | number>) =>
  (await load()).updateConfigs(cfg)

// 配置 / 缓存 / DNS 维护动作(Clash 专属),经 config 域门面暴露给 view。
export {
  flushDNSCacheAPI,
  flushFakeIPAPI,
  queryDNSAPI,
  reloadConfigsAPI,
  updateConfigsAPI,
  updateGeoDataAPI,
} from '@/api/clash'
