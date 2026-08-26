// Clash REST 后端的 config 组装:拉取 /configs、PATCH /configs,写入门面状态;
// 以及 /dns/query 的应答归一。
import { getConfigsAPI, patchConfigsAPI, queryDNSAPI } from '@/api/clash'
import type { DNSAnswer } from '@/types'
import { configs } from './index'

export const fetchConfigs = async () => {
  configs.value = (await getConfigsAPI()).data
}

export const updateConfigs = async (cfg: Record<string, string | boolean | object | number>) => {
  await patchConfigsAPI(cfg)
  fetchConfigs()
}

// Clash 的应答用数字类型码。展示层要的是标签,转换就近放在方言里 ——
// 这是 Clash 协议的内部细节,不该漏给 view。表里没有的按 RFC 惯例写成 TYPE n。
const DNS_TYPE_LABELS: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  65: 'HTTPS',
}

export const queryDNS = async (domain: string, type: string): Promise<DNSAnswer[]> => {
  const { data } = await queryDNSAPI({ name: domain, type })

  return (data.Answer ?? []).map((answer) => ({
    name: answer.name,
    type: DNS_TYPE_LABELS[answer.type] ?? `TYPE ${answer.type}`,
    ttl: answer.TTL,
    data: answer.data,
  }))
}
