<template>
  <div class="bg-base-200/50 relative flex h-28 flex-col gap-1 rounded-lg p-2">
    <div
      class="tooltip tooltip-bottom text-left text-sm"
      data-tip="ipip.net"
    >
      {{ $t('chinaIP') }} :
      {{ showPrivacy ? ipipnetIP.ipWithPrivacy[0] : ipipnetIP.ip[0] }}
      <span
        v-if="ipipnetIP.ip[1]"
        class="text-xs"
      >
        ({{ showPrivacy ? ipipnetIP.ipWithPrivacy[1] : ipipnetIP.ip[1] }})
      </span>
    </div>
    <div
      class="tooltip tooltip-bottom text-left text-sm"
      :data-tip="IPInfoAPI"
    >
      {{ $t('globalIP') }} :
      {{ showPrivacy ? ipsbIP.ipWithPrivacy[0] : ipsbIP.ip[0] }}
      <span
        v-if="ipsbIP.ip[1]"
        class="text-xs"
      >
        ({{ showPrivacy ? ipsbIP.ipWithPrivacy[1] : ipsbIP.ip[1] }})
      </span>
    </div>
    <div class="absolute right-2 bottom-2 flex items-center gap-2">
      <button
        class="btn btn-circle btn-sm flex items-center justify-center"
        @click="showPrivacy = !showPrivacy"
        @mouseenter="handlerShowPrivacyTip"
      >
        <EyeIcon
          v-if="showPrivacy"
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
import { BoltIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { getIPFromIpipnetAPI, getIPInfo } from '@renderer/api/geoip'
import { ipipnetIP, ipsbIP } from '@renderer/composables/overview'
import { useTooltip } from '@renderer/helper/tooltip'
import { autoIPCheck, IPInfoAPI } from '@renderer/store/settings'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const showPrivacy = ref(false)
const { showTip } = useTooltip()
const handlerShowPrivacyTip = (e: Event) => {
  showTip(e, t('ipScreenshotTip'))
}

const getIPs = () => {
  getIPInfo().then((res) => {
    ipsbIP.value = {
      ipWithPrivacy: [`${res.country} ${res.organization}`, res.ip],
      ip: [`${res.country} ${res.organization}`, '***.***.***.***'],
    }
  })
  getIPFromIpipnetAPI().then((res) => {
    ipipnetIP.value = {
      ipWithPrivacy: [res.data.location.join(' '), res.data.ip],
      ip: [`${res.data.location[0]} ** ** **`, '***.***.***.***'],
    }
  })
}

onMounted(() => {
  if (autoIPCheck.value && [ipsbIP, ipipnetIP].some((item) => item.value.ip.length === 0)) {
    getIPs()
  }
})
</script>
