import { sourceIPLabelList } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import * as ipaddr from 'ipaddr.js'
import { watch } from 'vue'

const CACHE_SIZE = 256
const ipLabelCache = new Map<string, string>()
const sourceIPMap = new Map<string, string>()
const sourceIPRegexList: { regex: RegExp; label: string }[] = []
type CIDREntry = { cidr: [ipaddr.IPv4 | ipaddr.IPv6, number]; label: string }
const sourceIPCIDRList: CIDREntry[] = []

const preprocessSourceIPList = () => {
  ipLabelCache.clear()
  sourceIPMap.clear()
  sourceIPRegexList.length = 0
  sourceIPCIDRList.length = 0

  for (const { key, label, scope } of sourceIPLabelList.value) {
    if (scope && !scope.includes(activeBackend.value?.uuid as string)) {
      continue
    }

    if (key.startsWith('/')) {
      try {
        sourceIPRegexList.push({ regex: new RegExp(key.slice(1), 'i'), label })
      } catch {
        // Ignore invalid custom regex labels instead of breaking all labels.
      }
      continue
    }

    if (key.includes('/')) {
      try {
        const cidr = ipaddr.parseCIDR(key)
        sourceIPCIDRList.push({ cidr, label })
        continue
      } catch {
        // 无效 CIDR，忽略
      }
    }

    sourceIPMap.set(key, label)
  }
}

const cacheResult = (ip: string, label: string) => {
  ipLabelCache.set(ip, label)

  if (ipLabelCache.size > CACHE_SIZE) {
    const firstKey = ipLabelCache.keys().next().value

    if (firstKey) {
      ipLabelCache.delete(firstKey)
    }
  }

  return label
}

watch(() => [sourceIPLabelList.value, activeBackend.value], preprocessSourceIPList, {
  immediate: true,
  deep: true,
})

export const getIPLabelFromMap = (ip: string) => {
  if (!ip) return ip === '' ? 'Inner' : ''

  if (ipLabelCache.has(ip)) {
    return ipLabelCache.get(ip)!
  }

  const isValidIP = ipaddr.isValid(ip)
  const addr = isValidIP ? ipaddr.parse(ip) : null

  if (addr?.kind() === 'ipv6') {
    for (const [key, label] of sourceIPMap.entries()) {
      if (ip.endsWith(key)) {
        return cacheResult(ip, label)
      }
    }
  }

  if (sourceIPMap.has(ip)) {
    return cacheResult(ip, sourceIPMap.get(ip)!)
  }

  for (const { regex, label } of sourceIPRegexList) {
    if (regex.test(ip)) {
      return cacheResult(ip, label)
    }
  }

  if (addr) {
    for (const { cidr, label } of sourceIPCIDRList) {
      if (addr.match(cidr)) {
        return cacheResult(ip, label)
      }
    }
  }

  return cacheResult(ip, ip)
}
