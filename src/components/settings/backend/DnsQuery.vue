<template>
  <div class="flex w-full flex-col gap-3">
    <div class="flex w-full flex-wrap items-center gap-3">
      <div class="setting-item-label max-sm:w-full max-sm:flex-none">
        {{ $t('DNSQuery') }}
      </div>
      <form
        class="join ml-auto w-96 max-w-full max-sm:w-full"
        @submit.prevent="query"
      >
        <TextInput
          v-model="form.name"
          class="join-item min-w-0 flex-1"
          placeholder="Domain Name"
          :clearable="true"
          :menus="dnsQueryNameHistory"
          :menus-deleteable="true"
          @update:menus="updateDnsQueryNameHistory"
        />
        <TextInput
          v-model="form.type"
          class="join-item w-20"
          placeholder="Type"
          :menus="['A', 'AAAA', 'HTTPS']"
        />
        <button
          type="submit"
          class="btn join-item btn-sm"
          :aria-label="$t('DNSQuery')"
        >
          <MagnifyingGlassIcon class="h-4 w-4" />
        </button>
      </form>
    </div>
    <div
      v-if="resultList?.length"
      class="bg-base-200/30 max-h-96 overflow-y-auto rounded-sm"
    >
      <div
        v-for="(item, index) in resultList"
        :key="`${item.name}-${item.type}-${item.data}-${index}`"
        class="border-base-300/30 flex items-center justify-between gap-4 p-2 not-last:border-b"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="bg-base-200 text-base-content/70 rounded-full px-2 py-0.5 text-[11px]">
              {{ item.type }}
            </span>
            <span class="text-base-content truncate text-sm">
              {{ item.name }}
            </span>
          </div>
          <div class="text-base-content/50 mt-1 text-xs">TTL {{ item.ttl }}</div>
        </div>
        <div class="text-base-content max-w-[50%] text-right text-sm leading-5 break-all">
          {{ item.data }}
        </div>
      </div>
    </div>
    <div
      v-if="details"
      class="text-base-content/70 flex flex-wrap gap-x-3 gap-y-1 text-xs"
    >
      <div
        v-if="details?.country"
        class="mr-3 flex items-center gap-1"
      >
        <MapPinIcon class="h-4 w-4 shrink-0" />
        <template v-if="details?.city && details?.city !== details?.country">
          {{ details?.city }},
        </template>
        <template v-else-if="details?.region && details?.region !== details?.country">
          {{ details?.region }},
        </template>
        {{ details?.country }}
      </div>
      <div class="flex items-center gap-1">
        <ServerIcon class="h-4 w-4 shrink-0" />
        {{ details?.organization }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { queryDNS } from '@/assembly/config'
import { getIPInfo, type IPInfo } from '@/api/geoip'
import { notifyRequestError } from '@/helper/requestError'
import { useStorage } from '@/helper/storage'
import type { DNSAnswer } from '@/types'
import { MagnifyingGlassIcon, MapPinIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { reactive, ref } from 'vue'
import TextInput from '../../common/TextInput.vue'

const form = reactive({
  name: 'www.google.com',
  type: 'A',
})
const details = ref<IPInfo | null>(null)
const resultList = ref<DNSAnswer[]>([])
const dnsQueryNameHistory = useStorage<string[]>('cache/dns-query-name-history', [])
const updateDnsQueryNameHistory = (history: string[]) => {
  dnsQueryNameHistory.value = history
}

const saveQueryName = (name: string) => {
  const queryName = name.trim()

  if (!queryName) {
    return
  }

  const nextHistory = dnsQueryNameHistory.value.filter((item) => item !== queryName)

  nextHistory.unshift(queryName)
  dnsQueryNameHistory.value = nextHistory.slice(0, 8)
}

const query = async () => {
  saveQueryName(form.name)

  try {
    // 两条通道的应答已在 assembly/config 的方言里归一成 DNSAnswer[]。
    resultList.value = await queryDNS(form.name, form.type)

    const ipAnswer = resultList.value.find(({ type }) => type === 'A' || type === 'AAAA')

    details.value = ipAnswer ? await getIPInfo(ipAnswer.data) : null
  } catch (e) {
    notifyRequestError(e)
  }
}
</script>
