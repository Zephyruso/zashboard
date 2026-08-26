// dae REST 后端的 config 组装。GET /api/config 是只读的,且形状与 Clash 的
// /configs 完全不同(端口 / TUN / allow-lan 这些概念在 dae 里不由 API 表达),
// 只有 log_level 能对上。其余字段留在 defaultConfig,对应的 UI 由
// can('configPatch') 与 can('modeSwitch') 挡住。
import { fetchDaeConfigAPI, queryDaeDNSAPI } from '@/api/dae'
import type { DNSAnswer } from '@/types'
import { configs, defaultConfig } from './index'

export const fetchConfigs = async () => {
  const { data } = await fetchDaeConfigAPI()

  configs.value = {
    ...defaultConfig,
    'log-level': data?.global?.log_level ?? '',
  }
}

// 签名与 Clash 侧保持一致,门面才能对着两者的联合调用。
export const updateConfigs = async (cfg: Record<string, string | boolean | object | number>) => {
  throw new Error(`dae backend does not support updating configs: ${Object.keys(cfg).join(', ')}`)
}

// dae 的应答里类型本来就是标签,直接透出。
// dae 支持一次问多个 type,但归一后的接口只问一个 —— 两条通道的表单是同一个,
// 多类型查询等有独立 UI 时再放出来。
export const queryDNS = async (domain: string, type: string): Promise<DNSAnswer[]> => {
  const { data } = await queryDaeDNSAPI({ domain, type: [type] })

  return (data.answers ?? []).map((answer) => ({
    name: answer.name,
    type: answer.type,
    ttl: answer.ttl,
    data: answer.data,
  }))
}
