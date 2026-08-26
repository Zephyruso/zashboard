// 组装层 · config 门面。持有统一的 configs 状态,按通道转交对应实现。
import { reloadConfigsAPI as clashReloadConfigsAPI } from '@/api/clash'
import { reloadDaeAPI, suspendDaeAPI } from '@/api/dae'
import { Channel, channel } from '@/assembly/backend'
import type { Config } from '@/types'
import { ref } from 'vue'
import * as clash from './clash'
import * as dae from './dae'

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

const backend = () => (channel.value === Channel.Dae ? dae : clash)

export const fetchConfigs = () => backend().fetchConfigs()

export const updateConfigs = (cfg: Record<string, string | boolean | object | number>) =>
  backend().updateConfigs(cfg)

// 重载配置两条通道各有各的端点(Clash: PUT /configs?reload=true;dae: POST /api/reload),
// 故必须走门面分发,不能像下面那批一样直接再导出。
export const reloadConfigsAPI = () =>
  channel.value === Channel.Dae ? reloadDaeAPI() : clashReloadConfigsAPI()

// dae 专属:暂停代理服务。调用点在 composables/backendActions,由 can('suspendService') 门控。
export const suspendServiceAPI = () => suspendDaeAPI()

// DNS 查询两条通道都有,但应答形状不同(Clash 是数字类型码 + Answer,
// dae 是标签 + answers),归一成 DNSAnswer[] 由各方言完成。
export const queryDNS = (domain: string, type: string) => backend().queryDNS(domain, type)

// dae 专属:DNS 缓存只读。Clash 侧没有对应的读取端点(它只有 /cache/dns/flush),
// 故这条不做归一,直接透出,由 can('dnsCache') 门控。
export { fetchDaeDNSCacheAPI } from '@/api/dae'

// 配置 / 缓存维护动作(Clash 专属),经 config 域门面暴露给 view。
// dae v0.1.0 没有清空 DNS 缓存的端点,故 flush 那两条由 can('dnsFlush') 挡住。
export { flushDNSCacheAPI, flushFakeIPAPI, updateConfigsAPI, updateGeoDataAPI } from '@/api/clash'
