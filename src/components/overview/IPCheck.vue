<template>
  <div class="bg-base-200/30 flex flex-col rounded-xl p-4">
    <div class="flex items-center justify-between">
      <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
        {{ $t('networkInfo') }}
      </div>
      <div class="flex gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          :aria-label="t('ipScreenshotTip')"
          @click="showPrivacy = !showPrivacy"
          @mouseenter="handlerShowPrivacyTip"
        >
          <EyeIcon
            v-if="showPrivacy"
            class="h-3.5 w-3.5"
          />
          <EyeSlashIcon
            v-else
            class="h-3.5 w-3.5"
          />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          :aria-label="t('refresh')"
          :disabled="isCheckingIP"
          :aria-busy="isCheckingIP"
          @click="getIPs"
        >
          <span
            v-if="isCheckingIP"
            class="loading loading-spinner loading-xs"
          ></span>
          <BoltIcon
            v-else
            class="h-3.5 w-3.5"
          />
        </button>
      </div>
    </div>

    <div class="mt-3 flex flex-col gap-3">
      <!-- China IP -->
      <div>
        <div class="text-base-content/60 text-xs">ipip.net</div>
        <div class="mt-0.5 text-sm font-medium">
          <template
            v-if="ipForChina.ip[0] === t('getting') || ipForChina.ip[0] === t('testFailed')"
          >
            <span
              :class="
                ipForChina.ip[0] === t('testFailed') ? 'text-state-danger' : 'text-base-content/40'
              "
            >
              {{ ipForChina.ip[0] }}
            </span>
          </template>
          <template v-else>
            {{ showPrivacy ? ipForChina.ipWithPrivacy[0] : ipForChina.ip[0] }}
            <span
              v-if="ipForChina.ip[1]"
              class="text-base-content/60 text-xs"
            >
              ({{ showPrivacy ? ipForChina.ipWithPrivacy[1] : ipForChina.ip[1] }})
            </span>
          </template>
        </div>
      </div>

      <div class="border-base-content/5 border-t" />

      <!-- Global IP -->
      <div>
        <div class="text-base-content/60 text-xs">{{ IPInfoAPI }}</div>
        <div class="mt-0.5 text-sm font-medium">
          <template
            v-if="ipForGlobal.ip[0] === t('getting') || ipForGlobal.ip[0] === t('testFailed')"
          >
            <span
              :class="
                ipForGlobal.ip[0] === t('testFailed') ? 'text-state-danger' : 'text-base-content/40'
              "
            >
              {{ ipForGlobal.ip[0] }}
            </span>
          </template>
          <template v-else>
            {{ showPrivacy ? ipForGlobal.ipWithPrivacy[0] : ipForGlobal.ip[0] }}
            <span
              v-if="ipForGlobal.ip[1]"
              class="text-base-content/60 text-xs"
            >
              ({{ showPrivacy ? ipForGlobal.ipWithPrivacy[1] : ipForGlobal.ip[1] }})
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getIPFromIpipnetAPI, getIPInfo } from '@/api/geoip'
import { ipForChina, ipForGlobal } from '@/composables/overview'
import { useTooltip } from '@/helper/tooltip'
import { autoIPCheck, IPInfoAPI } from '@/store/settings'
import { BoltIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const showPrivacy = ref(false)
const isCheckingIP = ref(false)
const { showTip } = useTooltip()
const handlerShowPrivacyTip = (e: Event) => {
  showTip(e, t('ipScreenshotTip'))
}

const QUERYING_IP_INFO = {
  ip: [t('getting'), ''],
  ipWithPrivacy: [t('getting'), ''],
}

const FAILED_IP_INFO = {
  ip: [t('testFailed'), ''],
  ipWithPrivacy: [t('testFailed'), ''],
}

let ipCheckController: AbortController | undefined
let ipCheckSeq = 0

const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError'
}

const getIPs = () => {
  ipCheckController?.abort()
  const controller = new AbortController()
  const checkSeq = ++ipCheckSeq
  ipCheckController = controller
  isCheckingIP.value = true

  ipForChina.value = {
    ...QUERYING_IP_INFO,
  }
  ipForGlobal.value = {
    ...QUERYING_IP_INFO,
  }

  const isCurrentCheck = () => checkSeq === ipCheckSeq && ipCheckController === controller

  const globalIPTask = getIPInfo('', controller.signal)
    .then((res) => {
      if (!isCurrentCheck()) return
      ipForGlobal.value = {
        ipWithPrivacy: [`${res.country} ${res.organization}`, res.ip],
        ip: [`${res.country} ${res.organization}`, '***.***.***.***'],
      }
    })
    .catch((error) => {
      if (!isCurrentCheck() || isAbortError(error)) return
      ipForGlobal.value = {
        ...FAILED_IP_INFO,
      }
    })

  const chinaIPTask = getIPFromIpipnetAPI(controller.signal)
    .then((res) => {
      if (!isCurrentCheck()) return
      ipForChina.value = {
        ipWithPrivacy: [res.data.location.join(' '), res.data.ip],
        ip: [`${res.data.location[0]} ** ** **`, '***.***.***.***'],
      }
    })
    .catch((error) => {
      if (!isCurrentCheck() || isAbortError(error)) return
      ipForChina.value = {
        ...FAILED_IP_INFO,
      }
    })

  void Promise.allSettled([globalIPTask, chinaIPTask]).then(() => {
    if (!isCurrentCheck()) return
    isCheckingIP.value = false
    ipCheckController = undefined
  })
}

watch(IPInfoAPI, () => {
  if ([ipForChina, ipForGlobal].some((item) => item.value.ip.length !== 0)) {
    getIPs()
  }
})

onMounted(() => {
  if (autoIPCheck.value && [ipForChina, ipForGlobal].some((item) => item.value.ip.length === 0)) {
    getIPs()
  }
})

onBeforeUnmount(() => {
  ipCheckController?.abort()
  ipCheckSeq += 1
  ipCheckController = undefined
})
</script>
