<template>
  <!-- backend -->
  <div
    v-if="hasVisibleItems"
    class="flex flex-col gap-2 p-4 text-sm"
  >
    <div class="settings-title">
      <div class="indicator">
        <span
          v-if="isCoreUpdateAvailable"
          class="indicator-item top-1 -right-1 flex"
        >
          <span class="bg-secondary absolute h-2 w-2 animate-ping rounded-full"></span>
          <span class="bg-secondary h-2 w-2 rounded-full"></span>
        </span>
        <a
          class="flex cursor-pointer items-center gap-2"
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
    <BackendSwitch v-if="isVisibleBackendSwitch" />

    <div
      v-if="isVisibleActions"
      class="divider"
    >
      {{ $t('actions') }}
    </div>

    <div
      v-if="isVisibleActions"
      class="grid max-w-3xl gap-3 gap-y-3"
      :style="`grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));`"
    >
      <template v-if="!isSingBox || displayAllFeatures">
        <button
          v-if="!activeBackend?.disableUpgradeCore"
          class="btn btn-primary btn-sm"
          @click="showUpgradeCoreModal = true"
        >
          {{ $t('upgradeCore') }}
        </button>
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
          v-if="!isSingBox"
          class="btn btn-sm"
          @click="showUpdateConfigModal = true"
        >
          {{ $t('updateConfigs') }}
        </button>
        <button
          class="btn btn-sm"
          @click="handlerClickUpdateGeo"
        >
          <span
            v-if="isGeoUpdating"
            class="loading loading-spinner loading-md"
          ></span>
          {{ $t('updateGeoDatabase') }}
        </button>
      </template>
      <button
        class="btn btn-sm"
        @click="handleFlushDNSCache"
      >
        {{ $t('flushDNSCache') }}
      </button>
      <button
        class="btn btn-sm"
        @click="handleFlushFakeIP"
      >
        {{ $t('flushFakeIP') }}
      </button>
      <button
        v-if="hasSmartGroup"
        class="btn btn-sm"
        @click="flushSmartGroupWeightsAPI"
      >
        {{ $t('flushSmartWeights') }}
      </button>
    </div>

    <template v-if="!isSingBox && configs && isVisiblePorts">
      <div class="divider">{{ $t('settings') }}</div>
      <div
        class="grid max-w-3xl gap-2 gap-x-6"
        :style="`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));`"
      >
        <div
          class="setting-item"
          v-for="portConfig in portList"
          :key="portConfig.key"
        >
          <div class="setting-item-label">
            {{ $t(portConfig.label) }}
          </div>
          <input
            class="input input-sm w-20 sm:w-24"
            type="number"
            v-model="configs[portConfig.key as keyof Config]"
            @change="
              updateConfigs({ [portConfig.key]: Number(configs[portConfig.key as keyof Config]) })
            "
          />
        </div>
      </div>
      <div
        class="grid max-w-3xl gap-2 gap-x-6"
        :style="`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));`"
      >
        <div
          v-if="configs?.tun && isVisibleTunMode"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('tunMode') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs.tun.enable"
            @change="hanlderTunModeChange"
          />
        </div>
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
        <template v-if="!activeBackend?.disableUpgradeCore">
          <div
            v-if="isVisibleCheckUpgrade"
            class="setting-item"
          >
            <div class="setting-item-label">
              {{ $t('checkUpgrade') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="checkUpgradeCore"
              @change="handlerCheckUpgradeCoreChange"
            />
          </div>
          <div
            v-if="checkUpgradeCore && isVisibleAutoUpgrade"
            class="setting-item"
          >
            <div class="setting-item-label">
              {{ $t('autoUpgrade') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="autoUpgradeCore"
            />
          </div>
        </template>
      </div>
    </template>
    <DnsQuery v-if="isVisibleDnsQuery" />

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
import BackendSwitch from '@/components/settings/BackendSwitch.vue'
import DnsQuery from '@/components/settings/DnsQuery.vue'
import { useIsSettingVisible } from '@/composables/settings'
import { BACKEND_ITEM_KEYS } from '@/config/settingsItems'
import { MIHOMO, MIHOMO_CHANNEL } from '@/constant'
import { showNotification } from '@/helper/notification'
import { configs, fetchConfigs, updateConfigs } from '@/store/config'
import { fetchProxies, hasSmartGroup } from '@/store/proxies'
import { fetchRules } from '@/store/rules'
import { autoUpgradeCore, checkUpgradeCore, displayAllFeatures } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import type { Config } from '@/types'
import { computed, ref } from 'vue'
import UpdateConfigModal from './UpdateConfigModal.vue'
import UpgradeCoreModal from './UpgradeCoreModal.vue'

const k = BACKEND_ITEM_KEYS
const isVisibleBackendSwitch = useIsSettingVisible(k.backend)
const isVisiblePorts = useIsSettingVisible(k.ports)
const isVisibleTunMode = useIsSettingVisible(k.tunMode)
const isVisibleAllowLan = useIsSettingVisible(k.allowLan)
const isVisibleCheckUpgrade = useIsSettingVisible(k.checkUpgrade)
const isVisibleAutoUpgrade = useIsSettingVisible(k.autoUpgrade)
const isVisibleActions = useIsSettingVisible(k.actions)
const isVisibleDnsQuery = useIsSettingVisible(k.DNSQuery)

const hasVisibleItems = computed(() => {
  return (
    isVisibleBackendSwitch.value ||
    (!isSingBox.value && configs.value && isVisiblePorts.value) ||
    (!isSingBox.value && configs.value?.tun && isVisibleTunMode.value) ||
    (!isSingBox.value && configs.value && isVisibleAllowLan.value) ||
    (!isSingBox.value &&
      configs.value &&
      !activeBackend.value?.disableUpgradeCore &&
      isVisibleCheckUpgrade.value) ||
    (!isSingBox.value &&
      configs.value &&
      !activeBackend.value?.disableUpgradeCore &&
      checkUpgradeCore.value &&
      isVisibleAutoUpgrade.value) ||
    isVisibleActions.value ||
    isVisibleDnsQuery.value
  )
})

const portList = [
  {
    label: 'mixedPort',
    key: 'mixed-port',
  },
  {
    label: 'httpPort',
    key: 'port',
  },
  {
    label: 'socksPort',
    key: 'socks-port',
  },
  {
    label: 'redirPort',
    key: 'redir-port',
  },
  {
    label: 'tproxyPort',
    key: 'tproxy-port',
  },
]

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
</script>
