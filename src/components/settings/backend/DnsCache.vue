<!--
  dae 的 DNS 缓存查看器(GET /api/dns/cache)。只读 —— dae v0.1.0 没有清空缓存的
  端点,那是 Clash 通道 /cache/dns/flush 的事,由 can('dnsFlush') 分开门控。

  域名过滤交给后端做(dae 侧是部分匹配),而不是拉全量回来前端筛:缓存条目数可以
  上千,limit 本来就是服务端截断的。
-->
<template>
  <div class="flex w-full flex-col gap-3">
    <div class="flex w-full flex-wrap items-center gap-3">
      <div class="setting-item-label max-sm:w-full max-sm:flex-none">
        {{ $t('DNSCache') }}
      </div>
      <form
        class="join ml-auto w-96 max-w-full max-sm:w-full"
        @submit.prevent="fetchCache"
      >
        <TextInput
          v-model="domainFilter"
          class="join-item min-w-0 flex-1"
          placeholder="Domain Name"
          :clearable="true"
        />
        <button
          type="submit"
          class="btn join-item btn-sm"
          :aria-label="$t('DNSCache')"
        >
          <ArrowPathIcon :class="['h-4 w-4', isLoading && 'animate-spin']" />
        </button>
      </form>
    </div>
    <div
      v-if="entries.length"
      class="bg-base-200/30 max-h-96 overflow-y-auto rounded-sm"
    >
      <div
        v-for="(entry, index) in entries"
        :key="`${entry.domain}-${entry.type}-${entry.answer}-${index}`"
        class="border-base-300/30 flex items-center justify-between gap-4 p-2 not-last:border-b"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="bg-base-200 text-base-content/70 rounded-full px-2 py-0.5 text-[11px]">
              {{ entry.type }}
            </span>
            <span class="text-base-content truncate text-sm">
              {{ entry.domain }}
            </span>
          </div>
          <div class="text-base-content/50 mt-1 text-xs">
            TTL {{ entry.ttl }} · {{ fromNow(entry.deadline) }}
          </div>
        </div>
        <div class="text-base-content max-w-[50%] text-right text-sm leading-5 break-all">
          {{ entry.answer }}
        </div>
      </div>
    </div>
    <div
      v-if="total !== null"
      class="text-base-content/50 text-xs"
    >
      {{ $t('DNSCacheTotal', { count: total }) }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { fetchDaeDNSCacheAPI } from '@/assembly/config'
import { notifyRequestError } from '@/helper/requestError'
import { fromNow } from '@/helper/utils'
import type { DaeDNSCache } from '@/types'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import TextInput from '../../common/TextInput.vue'

// dae 侧缺省 100。给大一点,再多就不是「看一眼缓存」该干的事了。
const ENTRY_LIMIT = 500

const domainFilter = ref('')
const entries = ref<DaeDNSCache['entries']>([])
const total = ref<number | null>(null)
const isLoading = ref(false)

const fetchCache = async () => {
  if (isLoading.value) return

  isLoading.value = true

  try {
    const domain = domainFilter.value.trim()
    const { data } = await fetchDaeDNSCacheAPI({
      domain: domain || undefined,
      limit: ENTRY_LIMIT,
    })

    entries.value = data.entries ?? []
    total.value = data.total ?? 0
  } catch (e) {
    // 用户点的按钮,失败要说一声。
    notifyRequestError(e)
  } finally {
    isLoading.value = false
  }
}
</script>
