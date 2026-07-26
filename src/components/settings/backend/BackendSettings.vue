<template>
  <!-- backend -->
  <div
    v-if="hasVisibleItems"
    class="flex flex-col gap-3 text-sm"
  >
    <div class="flex items-center gap-2 px-1">
      <div class="indicator">
        <span
          v-if="isCoreUpdateAvailable"
          class="indicator-item top-1 -right-1 flex"
        >
          <span class="bg-secondary absolute h-2 w-2 animate-ping rounded-full"></span>
          <span class="bg-secondary h-2 w-2 rounded-full"></span>
        </span>
        <a
          class="flex cursor-pointer items-center gap-2 text-lg font-semibold"
          :href="
            isSingBoxCore
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
      v-if="hasVisibleActions || isVisibleBackendSwitch || isVisibleDnsQuery"
    >
      <SettingItem
        :setting-key="k.backend"
        class="p-4"
      >
        <BackendSwitch />
      </SettingItem>

      <template v-if="!isSingboxBackend">
        <SettingItem
          :setting-key="k.upgradeCore"
          :when="canShowCoreActions && !activeBackend?.disableUpgradeCore"
        >
          <div class="setting-item-label">
            {{ $t('upgradeCore') }}
          </div>
          <button
            class="btn btn-neutral btn-sm"
            @click="showUpgradeCoreModal = true"
          >
            <ArrowUpCircleIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.restartCore"
          :when="canShowCoreActions"
        >
          <div class="setting-item-label">
            {{ $t('restartCore') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handlerClickRestartCore"
          >
            <span
              v-if="isCoreRestarting"
              class="loading loading-spinner h-4 w-4"
            ></span>
            <ArrowPathRoundedSquareIcon
              v-else
              class="h-4 w-4"
            />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.reloadConfigs"
          :when="canShowCoreActions"
        >
          <div class="setting-item-label">
            {{ $t('reloadConfigs') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handlerClickReloadConfigs"
          >
            <span
              v-if="isConfigReloading"
              class="loading loading-spinner h-4 w-4"
            ></span>
            <ArrowPathIcon
              v-else
              class="h-4 w-4"
            />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.updateConfigs"
          :when="canShowCoreActions && !isSingBoxCore"
        >
          <div class="setting-item-label">
            {{ $t('updateConfigs') }}
          </div>
          <button
            class="btn btn-sm"
            @click="showUpdateConfigModal = true"
          >
            <PencilSquareIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.updateGeoDatabase"
          :when="canShowCoreActions"
        >
          <div class="setting-item-label">
            {{ $t('updateGeoDatabase') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handlerClickUpdateGeo"
          >
            <span
              v-if="isGeoUpdating"
              class="loading loading-spinner h-4 w-4"
            ></span>
            <ArrowDownTrayIcon
              v-else
              class="h-4 w-4"
            />
          </button>
        </SettingItem>
        <SettingItem :setting-key="k.flushDNSCache">
          <div class="setting-item-label">
            {{ $t('flushDNSCache') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handleFlushDNSCache"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem :setting-key="k.flushFakeIP">
          <div class="setting-item-label">
            {{ $t('flushFakeIP') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handleFlushFakeIP"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.flushSmartWeights"
          :when="hasSmartGroup"
        >
          <div class="setting-item-label">
            {{ $t('flushSmartWeights') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handleFlushSmartWeights"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </SettingItem>
      </template>

      <SettingItem
        :setting-key="k.DNSQuery"
        :when="!isSingboxBackend"
        class="py-3"
      >
        <div class="flex w-full flex-col">
          <div class="settings-section-label">
            {{ $t('DNSQuery') }}
          </div>
          <DnsQuery />
        </div>
      </SettingItem>
    </div>

    <div
      v-if="!isSingBoxCore && configs && hasVisibleSettings"
      class="grid"
    >
      <div class="settings-section-label">
        {{ $t('settings') }}
      </div>
      <div class="settings-grid">
        <SettingItem
          :setting-key="k.ports"
          class="py-3"
        >
          <div class="flex w-full flex-col">
            <BackendPortsGrid />
          </div>
        </SettingItem>
        <SettingItem
          :setting-key="k.tunMode"
          :when="!!configs?.tun && !activeBackend?.disableTunMode"
        >
          <div class="setting-item-label">
            {{ $t('tunMode') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs!.tun.enable"
            @change="hanlderTunModeChange"
          />
        </SettingItem>
        <SettingItem
          :setting-key="k.allowLan"
          :when="!!configs"
        >
          <div class="setting-item-label">
            {{ $t('allowLan') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs!['allow-lan']"
            @change="handlerAllowLanChange"
          />
        </SettingItem>
        <template v-if="!activeBackend?.disableUpgradeCore">
          <SettingItem :setting-key="k.checkCoreUpgrade">
            <div class="setting-item-label">
              {{ $t('checkCoreUpgrade') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="checkUpgradeCore"
              @change="handlerCheckUpgradeCoreChange"
            />
          </SettingItem>
          <SettingItem
            :setting-key="k.autoUpgradeCore"
            :when="checkUpgradeCore"
          >
            <div class="setting-item-label">
              {{ $t('autoUpgradeCore') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="autoUpgradeCore"
            />
          </SettingItem>
        </template>
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
  reloadConfigsAPI,
  updateGeoDataAPI,
} from '@/assembly/config'
import { isCoreUpdateAvailable, isSingBoxCore, mihomo, restartCoreAPI } from '@/assembly/version'
import BackendVersion from '@/components/common/BackendVersion.vue'
import BackendPortsGrid from '@/components/settings/backend/BackendPortsGrid.vue'
import BackendSwitch from '@/components/settings/backend/BackendSwitch.vue'
import DnsQuery from '@/components/settings/backend/DnsQuery.vue'
import { isSingboxBackend } from '@/assembly/backend'
import SettingItem from '@/components/settings/SettingItem.vue'
import { isSettingVisible, useIsSettingVisible } from '@/composables/settings'
import { BACKEND_ITEM_KEYS } from '@/config/settingsItems'
import { MIHOMO, MIHOMO_CHANNEL } from '@/constant'
import { showNotification } from '@/helper/notification'
import { fetchProxies, flushSmartGroupWeightsAPI } from '@/assembly/proxies'
import { configs, fetchConfigs, updateConfigs } from '@/assembly/config'
import { hasSmartGroup } from '@/assembly/proxies'
import { fetchRules } from '@/assembly/rules'
import { autoUpgradeCore, checkUpgradeCore, displayAllFeatures } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  ArrowUpCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
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
const isVisibleDnsQuery = useIsSettingVisible(k.DNSQuery)
const canShowTunMode = computed(
  () => isVisibleTunMode.value && !activeBackend.value?.disableTunMode,
)

/** sing-box 内核下只保留 flush 类操作，除非用户开启了「显示全部功能」 */
const canShowCoreActions = computed(() => !isSingBoxCore.value || displayAllFeatures.value)

/** 当前后端/内核下实际可渲染的操作项 */
const renderableActionKeys = computed(() => {
  if (isSingboxBackend.value) return []

  const keys: string[] = []

  if (canShowCoreActions.value) {
    if (!activeBackend.value?.disableUpgradeCore) keys.push(k.upgradeCore)
    keys.push(k.restartCore, k.reloadConfigs)
    if (!isSingBoxCore.value) keys.push(k.updateConfigs)
    keys.push(k.updateGeoDatabase)
  }
  keys.push(k.flushDNSCache, k.flushFakeIP)
  if (hasSmartGroup.value) keys.push(k.flushSmartWeights)

  return keys
})

const hasVisibleActions = computed(() => renderableActionKeys.value.some(isSettingVisible))

const hasVisibleItems = computed(() => {
  return (
    isVisibleBackendSwitch.value ||
    hasVisibleSettings.value ||
    hasVisibleActions.value ||
    isVisibleDnsQuery.value
  )
})

const hasVisibleSettings = computed(() => {
  return (
    !isSingBoxCore.value &&
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
