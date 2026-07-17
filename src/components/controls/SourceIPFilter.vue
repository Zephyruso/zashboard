<template>
  <select
    class="join-item select select-sm"
    v-model="sourceIPFilter"
  >
    <option :value="null">{{ $t('all') }}</option>
    <option
      v-for="opt in sourceIPOpts"
      :key="opt.value.join(',')"
      :value="opt.value"
    >
      {{ opt.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { getIPLabelFromMap } from '@/helper/sourceip'
import { getConnectionSourceIP } from '@/helper'
import { connections, sourceIPFilter } from '@/store/connections'
import * as ipaddr from 'ipaddr.js'
import { isEqual, uniq } from 'lodash'
import { computed, ref, watch } from 'vue'

// IP 解析缓存:比较器里每次比较 2 次 isValid + 2 次 parse + 2 次 toByteArray,
// 等效每比较 4-6 次完整字符串解析
const parsedIPBytes = new Map<string, number[] | null>()
const ipBytes = (ip: string) => {
  let bytes = parsedIPBytes.get(ip)

  if (bytes === undefined) {
    try {
      bytes = ipaddr.parse(ip).toByteArray()
    } catch {
      bytes = null
    }
    if (parsedIPBytes.size > 512) {
      parsedIPBytes.clear()
    }
    parsedIPBytes.set(ip, bytes)
  }
  return bytes
}

// 集合签名短路:源 IP 集合只在设备增减时才变,每拍全量重排 + 下游深比较是纯白算;
// 返回缓存引用可让下游 watch 完全不触发
let lastSignature = ''
let lastSorted: string[] = []
const sourceIPs = computed(() => {
  const unique = uniq(connections.value.map(getConnectionSourceIP))
  const signature = [...unique].sort().join(',')

  if (signature === lastSignature) {
    return lastSorted
  }

  const sorted = [...unique].sort((a, b) => {
    const aBytes = ipBytes(a)
    const bBytes = ipBytes(b)

    if (!aBytes) return -1
    if (!bBytes) return 1

    const isAIPv4 = aBytes.length === 4
    const isBIPv4 = bBytes.length === 4

    if (!isAIPv4 && isBIPv4) return 1
    if (!isBIPv4 && isAIPv4) return -1

    for (let i = 0; i < aBytes.length; i++) {
      if (aBytes[i] !== bBytes[i]) {
        return aBytes[i] - bBytes[i]
      }
    }
    return 0
  })

  lastSignature = signature
  lastSorted = sorted

  return sorted
})
const sourceIPOpts = ref<{ label: string; value: string[] }[]>([])

// do not use computed here for firefox
watch(
  sourceIPs,
  (value, oldValue) => {
    if (isEqual(value, oldValue)) return
    const options: { label: string; value: string[] }[] = []

    value.forEach((ip) => {
      const label = getIPLabelFromMap(ip)
      const index = options.findIndex((opt) => opt.label === label)

      if (index === -1) {
        options.push({
          label,
          value: [ip],
        })
      } else {
        options[index].value.push(ip)
      }
    })

    if (sourceIPFilter.value !== null) {
      const currentLabel = getIPLabelFromMap(sourceIPFilter.value[0])
      const current = options.find((opt) => opt.label === currentLabel)

      if (!current) {
        options.unshift({
          label: currentLabel,
          value: sourceIPFilter.value,
        })
      } else if (!isEqual(current.value, sourceIPFilter.value)) {
        sourceIPFilter.value = current.value
      }
    }

    sourceIPOpts.value = options
  },
  {
    immediate: true,
  },
)
</script>
