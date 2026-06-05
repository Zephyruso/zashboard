<template>
  <!-- backend -->
  <div
    v-if="hasVisibleItems"
    class="flex flex-col gap-3 text-sm"
  >
    <div class="flex items-center gap-2 px-1">
      <div class="indicator">

        <a
          class="flex cursor-pointer items-center gap-2 text-lg font-semibold"
          :href="
            isSingBox
              ? 'https://github.com/sagernet/sing-box'
              : MIHOMO_CHANNEL[mihomo?.[0] ?? MIHOMO.Meta].url
          "
          target="_blank"
        >
          {{ $t('backend') }}
          <BackendVersion class="text-sm font-normal" />
        </a>
      </div>
    </div>

    <div
      class="settings-grid"
      v-if="isVisibleActions || isVisibleBackendSwitch || isVisibleDnsQuery"
    >
      <div
        v-if="isVisibleBackendSwitch"
        class="setting-item p-4"
      >
        <BackendSwitch />
      </div>

      <div
        v-if="isVisibleActions"
        class="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-2"
      >
        <template v-if="!isSingBox || displayAllFeatures">

          <button
            class="btn btn-sm"
            @click="handlerClickRestartCore"
          >
            <span
              v-if="isCoreRestarting"
              class="loading loading-spinner loading-md"
            ></span>
            {{ $t('restartCore') }}
          </button>

          <button
            class="btn btn-sm"
            @click="handlerClickReloadConfigs"
          >
            <span
              v-if="isConfigReloading"
              class="loading loading-spinner loading-md"
            ></span>
            {{ $t('reloadConfigs') }}
          </button>

          <button
            class="btn btn-sm"
            @click="handlerClickFlushDNS"
          >
            <span
              v-if="isDNSFlushing"
              class="loading loading-spinner loading-md"
            ></span>
            {{ $t('flushDNSCache') }}
          </button>

          <button
            class="btn btn-sm"
            @click="handlerClickFlushFakeIP"
          >
            <span
              v-if="isFakeIPFlushing"
              class="loading loading-spinner loading-md"
            ></span>
            {{ $t('flushFakeIP') }}
          </button>

        </template>

      </div>

      <div
        v-if="isVisibleDnsQuery"
        class="setting-item flex-col items-start py-3"
      >
        <div class="flex w-full flex-col">
          <div class="settings-section-label">
            {{ $t('DNSQuery') }}
          </div>
          <DnsQuery />
        </div>
      </div>
    </div>

    <div
      v-if="!isSingBox && configs && hasVisibleSettings"
      class="grid"
    >
      <div class="settings-section-label">
        {{ $t('settings') }}
      </div>
      <div class="settings-grid">
        <BackendPortsGrid v-if="isVisiblePorts" />

        <div
          v-if="isVisibleAllowLan"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('allowLan') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs['allow-lan']"
            @change="handlerAllowLanChange"
          />
        </div>

      </div>
    </div>

    <UpgradeCoreModal v-model="showUpgradeCoreModal" />
    <UpdateConfigModal v-model="showUpdateConfigModal" />
  </div>
</template>

<script setup lang="ts">
import {
  flushDNSCacheAPI,
  flushFakeIPAPI,
  flushSmartGroupWeightsAPI,
  isCoreUpdateAvailable,
  isSingBox,
  mihomo,
  reloadConfigsAPI,
  restartCoreAPI,
  updateGeoDataAPI,
} from '@/api'
import BackendVersion from '@/components/common/BackendVersion.vue'
import BackendPortsGrid from '@/components/settings/backend/BackendPortsGrid.vue'
import BackendSwitch from '@/components/settings/backend/BackendSwitch.vue'
import DnsQuery from '@/components/settings/backend/DnsQuery.vue'
import { useIsSettingVisible } from '@/composables/settings'
import { BACKEND_ITEM_KEYS } from '@/config/settingsItems'
import { MIHOMO, MIHOMO_CHANNEL } from '@/constant'
import { showNotification } from '@/helper/notification'
import { configs, fetchConfigs, updateConfigs } from '@/store/config'
import { fetchProxies, hasSmartGroup } from '@/store/proxies'
import { fetchRules } from '@/store/rules'
import { autoUpgradeCore, checkUpgradeCore, displayAllFeatures } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import { computed, ref } from 'vue'
import UpdateConfigModal from './UpdateConfigModal.vue'
import UpgradeCoreModal from './UpgradeCoreModal.vue'

const k = BACKEND_ITEM_KEYS
const isVisibleBackendSwitch = useIsSettingVisible(k.backend)
const isVisiblePorts = useIsSettingVisible(k.ports)
const isVisibleTunMode = useIsSettingVisible(k.tunMode)
const isVisibleAllowLan = useIsSettingVisible(k.allowLan)
const isVisibleCheckUpgrade = useIsSettingVisible(k.checkCoreUpgrade)
const isVisibleAutoUpgrade = useIsSettingVisible(k.autoUpgradeCore)
const isVisibleActions = useIsSettingVisible(k.actions)
const isVisibleDnsQuery = useIsSettingVisible(k.DNSQuery)
const canShowTunMode = computed(
  () => isVisibleTunMode.value && !activeBackend.value?.disableTunMode,
)

const hasVisibleItems = computed(() => {
  return (
    isVisibleBackendSwitch.value ||
    hasVisibleSettings.value ||
    isVisibleActions.value ||
    isVisibleDnsQuery.value
  )
})

const hasVisibleSettings = computed(() => {
  return (
    !isSingBox.value &&
    !!configs.value &&
    (isVisiblePorts.value ||
      (configs.value.tun && canShowTunMode.value) ||
      isVisibleAllowLan.value ||
      (!activeBackend.value?.disableUpgradeCore &&
        (isVisibleCheckUpgrade.value || (checkUpgradeCore.value && isVisibleAutoUpgrade.value))))
  )
})

const reloadAll = () => {
  fetchConfigs()
  fetchRules()
  fetchProxies()
}

const showUpgradeCoreModal = ref(false)
const showUpdateConfigModal = ref(false)

const isCoreRestarting = ref(false)
const handlerClickRestartCore = async () => {
  if (isCoreRestarting.value) return
  isCoreRestarting.value = true
  try {
    await restartCoreAPI()
    setTimeout(() => {
      reloadAll()
    }, 500)
    isCoreRestarting.value = false
    showNotification({
      content: 'restartCoreSuccess',
      type: 'alert-success',
    })
  } catch {
    isCoreRestarting.value = false
  }
}

const isConfigReloading = ref(false)
const handlerClickReloadConfigs = async () => {
  if (isConfigReloading.value) return
  isConfigReloading.value = true
  try {
    await reloadConfigsAPI()
    reloadAll()
    isConfigReloading.value = false
    showNotification({
      content: 'reloadConfigsSuccess',
      type: 'alert-success',
    })
  } catch {
    isConfigReloading.value = false
  }
}

const isDNSFlushing = ref(false)
const handlerClickFlushDNS = async () => {
  if (isDNSFlushing.value) return
  isDNSFlushing.value = true
  try {
    await flushDNSCacheAPI()
    showNotification({
      content: 'flushDNSCacheSuccess',
      type: 'alert-success',
    })
  } finally {
    isDNSFlushing.value = false
  }
}

const isFakeIPFlushing = ref(false)
const handlerClickFlushFakeIP = async () => {
  if (isFakeIPFlushing.value) return
  isFakeIPFlushing.value = true
  try {
    await flushFakeIPAPI()
    showNotification({
      content: 'flushFakeIPSuccess',
      type: 'alert-success',
    })
  } finally {
    isFakeIPFlushing.value = false
  }
}

const isGeoUpdating = ref(false)
const handlerClickUpdateGeo = async () => {
  if (isGeoUpdating.value) return
  isGeoUpdating.value = true
  try {
    await updateGeoDataAPI()
    reloadAll()
    isGeoUpdating.value = false
    showNotification({
      content: 'updateGeoSuccess',
      type: 'alert-success',
    })
  } catch {
    isGeoUpdating.value = false
  }
}

const handlerCheckUpgradeCoreChange = () => {
  if (!checkUpgradeCore.value) {
    autoUpgradeCore.value = false
    isCoreUpdateAvailable.value = false
  }
}

const hanlderTunModeChange = async () => {
  await updateConfigs({ tun: { enable: configs.value?.tun.enable } })
}
const handlerAllowLanChange = async () => {
  await updateConfigs({ ['allow-lan']: configs.value?.['allow-lan'] })
}

const handleFlushDNSCache = async () => {
  await flushDNSCacheAPI()
  showNotification({
    content: 'flushDNSCacheSuccess',
    type: 'alert-success',
  })
}

const handleFlushFakeIP = async () => {
  await flushFakeIPAPI()
  showNotification({
    content: 'flushFakeIPSuccess',
    type: 'alert-success',
  })
}

const handleFlushSmartWeights = async () => {
  await flushSmartGroupWeightsAPI()
  showNotification({
    content: 'flushSmartWeightsSuccess',
    type: 'alert-success',
  })
}
</script>
