<template>
  <select
    v-model="sourceIPFilter"
    class="join-item select select-sm"
  >
    <option :value="null">
      {{ $t('allSourceIP') }}
    </option>
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
import { connections, sourceIPFilter } from '@/store/connections'
import * as ipaddr from 'ipaddr.js'
import { isEqual, uniq } from 'lodash-es'
import { computed, ref, watch } from 'vue'

const sourceIPs = computed(() => {
  return uniq(connections.value.map((conn) => conn.metadata.sourceIP)).sort((a, b) => {
    if (!ipaddr.isValid(a)) return -1
    if (!ipaddr.isValid(b)) return 1

    const preIP = ipaddr.parse(a)
    const nextIP = ipaddr.parse(b)

    const isPreIPv4 = preIP.kind() === 'ipv4'
    const isNextIPv4 = nextIP.kind() === 'ipv4'

    if (!isPreIPv4 && isNextIPv4) return 1
    if (!isNextIPv4 && isPreIPv4) return -1

    const preIPBytes = preIP.toByteArray()
    const nextIPBytes = nextIP.toByteArray()

    for (let i = 0; i < preIPBytes.length; i++) {
      if (preIPBytes[i] !== nextIPBytes[i]) {
        return preIPBytes[i] - nextIPBytes[i]
      }
    }
    return 0
  })
})
const sourceIPOpts = ref<{ label: string; value: string[] }[]>([])

// do not use computed here for firefox
watch(
  sourceIPs,
  (value, oldValue) => {
    if (isEqual(value, oldValue)) return
    sourceIPOpts.value = []

    sourceIPs.value.forEach((ip) => {
      const label = getIPLabelFromMap(ip)
      const index = sourceIPOpts.value.findIndex((opt) => opt.label === label)

      if (index === -1) {
        sourceIPOpts.value.push({
          label,
          value: [ip],
        })
      } else {
        sourceIPOpts.value[index].value.push(ip)
      }
    })

    if (sourceIPFilter.value !== null) {
      const currentLabel = getIPLabelFromMap(sourceIPFilter.value[0])
      const current = sourceIPOpts.value.find((opt) => opt.label === currentLabel)

      if (!current) {
        sourceIPOpts.value.unshift({
          label: currentLabel,
          value: sourceIPFilter.value,
        })
      } else if (!isEqual(current.value, sourceIPFilter.value)) {
        sourceIPFilter.value = current.value
      }
    }
  },
  {
    immediate: true,
  },
)
</script>
