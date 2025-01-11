<template>
  <div class="relative flex h-28 flex-col gap-1 rounded-lg bg-base-200/40 p-2">
    <div>
      <span
        class="tooltip tooltip-bottom inline-block w-24 text-left"
        :data-tip="$t('chinaIP')"
        >speedtest.cn</span
      >
      : {{ speedtestcnIP.location }}
      <template v-if="showIP">
        <span class="text-xs">({{ speedtestcnIP.ip }})</span>
      </template>
    </div>
    <div>
      <span
        class="tooltip tooltip-bottom inline-block w-24 text-left"
        :data-tip="$t('chinaIP')"
        >ipip.net</span
      >
      : {{ ipipnetIP.location }}
      <template v-if="showIP">
        <span class="text-xs">({{ ipipnetIP.ip }})</span>
      </template>
    </div>
    <div>
      <span
        class="tooltip tooltip-bottom inline-block w-24 text-left"
        :data-tip="$t('globalIP')"
        >api.ip.sb</span
      >
      : {{ ipsbIP.location }}
      <template v-if="showIP">
        <span class="text-xs">({{ ipsbIP.ip }})</span>
      </template>
    </div>
    <div class="absolute bottom-2 right-2 flex items-center gap-2">
      <button
        class="btn btn-circle btn-sm tooltip tooltip-bottom flex items-center justify-center"
        @click="showIP = !showIP"
        :data-tip="$t('ipScreenshotTip')"
      >
        <EyeIcon
          v-if="showIP"
          class="h-4 w-4"
        />
        <EyeSlashIcon
          v-else
          class="h-4 w-4"
        />
      </button>
      <button
        class="btn btn-circle btn-sm"
        @click="getIPs"
      >
        <BoltIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getIPFromIpipnetAPI, getIPFromIpsbAPI, getIPFromSpeedtestcnAPI } from '@/api'
import { autoIPCheck } from '@/store/settings'
import { BoltIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { onMounted, ref } from 'vue'

const showIP = ref(false)

const speedtestcnIP = ref({
  location: '',
  ip: '',
})
const ipsbIP = ref({
  location: '',
  ip: '',
})
const ipipnetIP = ref({
  location: '',
  ip: '',
})

const getIPs = () => {
  getIPFromSpeedtestcnAPI()
    .then((res) => res.json())
    .then(
      (res: {
        code: number
        data: {
          ip: string
          country: string
          province: string
          city: string
          district: string
          isp: string
          operator: string
          countryCode: string
          lon: string
          lat: string
        }
        msg: string
      }) => {
        speedtestcnIP.value = {
          location: `${res.data.country} ${res.data.operator}`,
          ip: res.data.ip,
        }
      },
    )
  getIPFromIpsbAPI().then((res) => {
    ipsbIP.value = {
      location: `${res.country} ${res.asn_organization}`,
      ip: res.ip,
    }
  })
  getIPFromIpipnetAPI().then((res) => {
    res = res.trim()

    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/
    const asnRegex = /来自于：(.*)$/

    const ip = ipRegex.exec(res)?.[0] || ''
    const asn = asnRegex.exec(res)?.[1] || ''

    ipipnetIP.value = {
      location: asn,
      ip,
    }
  })
}

onMounted(() => {
  if (
    autoIPCheck.value &&
    [speedtestcnIP, ipsbIP, ipipnetIP].some((item) => item.value.ip === '')
  ) {
    getIPs()
  }
})
</script>
