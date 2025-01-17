<template>
  <div class="relative flex h-28 flex-col gap-1 rounded-lg bg-base-200/40 p-2">
    <div
      class="tooltip tooltip-bottom text-left text-sm"
      data-tip="ipip.net"
    >
      {{ $t('chinaIP') }} : {{ ipipnetIP.location }}
      <span
        class="text-xs"
        v-if="ipipnetIP.ip"
      >
        <template v-if="showIP"> ({{ ipipnetIP.ip }}) </template>
        <template v-else> (***.***.***.***) </template>
      </span>
    </div>
    <div
      class="tooltip tooltip-bottom text-left text-sm"
      data-tip="api.ip.sb"
    >
      {{ $t('globalIP') }} : {{ ipsbIP.location }}
      <span
        class="text-xs"
        v-if="ipsbIP.ip"
      >
        <template v-if="showIP"> ({{ ipsbIP.ip }}) </template>
        <template v-else> (***.***.***.***) </template>
      </span>
    </div>
    <div class="absolute bottom-2 right-2 flex items-center gap-2">
      <button
        class="btn btn-circle btn-sm flex items-center justify-center"
        @click="showIP = !showIP"
        @mouseenter="handlerShowIPTip"
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
import { getIPFromIpipnetAPI, getIPFromIpsbAPI } from '@/api'
import { ipipnetIP, ipsbIP } from '@/composables/overview'
import { useTooltip } from '@/helper/tooltip'
import { autoIPCheck } from '@/store/settings'
import { BoltIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const showIP = ref(false)
const { showTip } = useTooltip()
const handlerShowIPTip = (e: Event) => {
  showTip(e, t('ipScreenshotTip'))
}

const getIPs = () => {
  getIPFromIpsbAPI().then((res) => {
    ipsbIP.value = {
      location: `${res.country} ${res.asn_organization}`,
      ip: res.ip,
    }
  })
  getIPFromIpipnetAPI().then((res) => {
    ipipnetIP.value = {
      location: res.data.location.join(' '),
      ip: res.data.ip,
    }
  })
}

onMounted(() => {
  if (autoIPCheck.value && [ipsbIP, ipipnetIP].some((item) => item.value.ip === '')) {
    getIPs()
  }
})
</script>
