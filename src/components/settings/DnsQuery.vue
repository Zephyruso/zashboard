<template>
  <div class="join w-96 max-sm:w-full">
    <TextInput
      v-model="form.name"
      type="text"
      name="name"
      placeholder="Domain Name"
    />
    <select
      v-model="form.type"
      class="join-item select select-bordered select-sm"
    >
      <option value="A">A</option>
      <option value="AAAA">AAAA</option>
      <option value="MX">MX</option>
    </select>
    <button
      class="btn join-item btn-sm"
      @click="query"
    >
      {{ $t('DNSQuery') }}
    </button>
  </div>
  <div class="flex max-h-96 flex-col gap-1 overflow-y-auto">
    <div
      class="flex gap-1"
      v-for="item in resultList"
      :key="item.data"
    >
      <div>{{ item.name }}</div>
      :
      <div>{{ item.data }}</div>
    </div>
  </div>
  <div
    v-if="details"
    class="flex gap-1"
  >
    {{ details?.ip }}: AS{{ details?.asn }}
    {{ details?.asn_organization }}
    {{ details?.country }}
  </div>
</template>

<script lang="ts" setup>
import { getIPFromIpsbAPI, queryDNSAPI, type GlobalIPType } from '@/api'
import type { DNSQuery } from '@/types'
import { reactive, ref } from 'vue'
import TextInput from '../common/TextInput.vue'

const form = reactive({
  name: 'www.google.com',
  type: 'A',
})
const details = ref<GlobalIPType | null>(null)

const resultList = ref<DNSQuery['Answer']>([])
const query = async () => {
  const { data } = await queryDNSAPI(form)

  resultList.value = data.Answer

  if (resultList.value?.length) {
    details.value = await getIPFromIpsbAPI(resultList.value[0].data)
  } else {
    details.value = null
  }
}
</script>
