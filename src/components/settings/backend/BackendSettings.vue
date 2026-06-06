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
            v-if="!activeBackend?.disableUpgradeCore"
            type="button"
            class="btn btn-neutral btn-sm"
            @click="showUpgradeCoreModal = true"
          >
            {{ $t('upgradeCore') }}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="isCoreRestarting"
            :aria-busy="isCoreRestarting"
            @click="handlerClickRestartCore"
          >
            <span
              v-if="isCoreRestarting"
              class="loading loading-spinner loading-md"
            ></span>
            {{ $t('restartCore') }}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="isConfigReloading"
            :aria-busy="isConfigReloading"
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
            type="button"
            class="btn btn-sm"
            @click="showUpdateConfigModal = true"
          >
            {{ $t('updateConfigs') }}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="isGeoUpdating"
            :aria-busy="isGeoUpdating"
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
          type="button"
          class="btn btn-sm"
          :disabled="isFlushingDNSCache"
          :aria-busy="isFlushingDNSCache"
          @click="handleFlushDNSCache"
        >
          {{ $t('flushDNSCache') }}
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :disabled="isFlushingFakeIP"
          :aria-busy="isFlushingFakeIP"
          @click="handleFlushFakeIP"
        >
          {{ $t('flushFakeIP') }}
        </button>
        <button
          v-if="hasSmartGroup"
          type="button"
          class="btn btn-sm"
          :disabled="isFlushingSmartWeights"
          :aria-busy="isFlushingSmartWeights"
          @click="handleFlushSmartWeights"
        >
          {{ $t('flushSmartWeights') }}
        </button>
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
          v-if="configs?.tun && canShowTunMode"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('tunMode') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            :aria-label="$t('tunMode')"
            :disabled="isTunModeUpdating"
            :aria-busy="isTunModeUpdating"
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
            :aria-label="$t('allowLan')"
            :disabled="isAllowLanUpdating"
            :aria-busy="isAllowLanUpdating"
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
              {{ $t('checkCoreUpgrade') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              :aria-label="$t('checkCoreUpgrade')"
              v-model="checkUpgradeCore"
              @change="handlerCheckUpgradeCoreChange"
            />
          </div>
          <div
            v-if="checkUpgradeCore && isVisibleAutoUpgrade"
            class="setting-item"
          >
            <div class="setting-item-label">
              {{ $t('autoUpgradeCore') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              :aria-label="$t('autoUpgradeCore')"
              v-model="autoUpgradeCore"
            />
          </div>
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
  flushSmartGroupWeightsAPI,
  isCoreUpdateAvailable,
  isRequestCanceled,
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
import { activeBackend, activeUuid } from '@/store/setup'
import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
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

type BackendActionKey =
  | 'restartCore'
  | 'reloadConfigs'
  | 'updateGeo'
  | 'flushDNSCache'
  | 'flushFakeIP'
  | 'flushSmartWeights'
  | 'tunMode'
  | 'allowLan'

const actionControllers = new Map<BackendActionKey, AbortController>()
const actionSequences = new Map<BackendActionKey, number>()
let isUnmounted = false
let restartCoreReloadTimer: ReturnType<typeof setTimeout> | undefined

const startAction = (key: BackendActionKey) => {
  const sequence = (actionSequences.get(key) ?? 0) + 1
  const controller = new AbortController()

  actionControllers.get(key)?.abort()
  actionControllers.set(key, controller)
  actionSequences.set(key, sequence)

  return { controller, sequence }
}

const isCurrentAction = (key: BackendActionKey, sequence: number, controller: AbortController) => {
  return (
    !isUnmounted &&
    actionControllers.get(key) === controller &&
    actionSequences.get(key) === sequence &&
    !controller.signal.aborted
  )
}

const finishAction = (
  key: BackendActionKey,
  sequence: number,
  controller: AbortController,
  loading: Ref<boolean>,
) => {
  const shouldReset = isCurrentAction(key, sequence, controller)

  if (actionControllers.get(key) === controller) {
    actionControllers.delete(key)
  }

  if (shouldReset) {
    loading.value = false
  }
}

const runBackendAction = async (
  key: BackendActionKey,
  loading: Ref<boolean>,
  request: (signal: AbortSignal) => Promise<unknown>,
  onSuccess?: () => void,
) => {
  if (loading.value) return

  const { controller, sequence } = startAction(key)

  loading.value = true
  try {
    await request(controller.signal)

    if (!isCurrentAction(key, sequence, controller)) return

    onSuccess?.()
  } catch (error) {
    if (isRequestCanceled(error)) return
    // error handled by axios interceptor
  } finally {
    finishAction(key, sequence, controller, loading)
  }
}

const isCoreRestarting = ref(false)
const handlerClickRestartCore = async () => {
  await runBackendAction('restartCore', isCoreRestarting, restartCoreAPI, () => {
    if (restartCoreReloadTimer) {
      clearTimeout(restartCoreReloadTimer)
    }

    restartCoreReloadTimer = setTimeout(() => {
      if (isUnmounted) return
      reloadAll()
    }, 500)

    showNotification({
      content: 'restartCoreSuccess',
      type: 'alert-success',
    })
  })
}

const isConfigReloading = ref(false)
const handlerClickReloadConfigs = async () => {
  await runBackendAction('reloadConfigs', isConfigReloading, reloadConfigsAPI, () => {
    reloadAll()
    showNotification({
      content: 'reloadConfigsSuccess',
      type: 'alert-success',
    })
  })
}

const isGeoUpdating = ref(false)
const handlerClickUpdateGeo = async () => {
  await runBackendAction('updateGeo', isGeoUpdating, updateGeoDataAPI, () => {
    reloadAll()
    showNotification({
      content: 'updateGeoSuccess',
      type: 'alert-success',
    })
  })
}

const handlerCheckUpgradeCoreChange = () => {
  if (!checkUpgradeCore.value) {
    autoUpgradeCore.value = false
    isCoreUpdateAvailable.value = false
  }
}

const isTunModeUpdating = ref(false)
const hanlderTunModeChange = async () => {
  if (isTunModeUpdating.value) return

  const backendUuid = activeUuid.value
  const nextValue = !!configs.value?.tun.enable
  const previousValue = !nextValue

  const { controller, sequence } = startAction('tunMode')

  isTunModeUpdating.value = true
  try {
    await updateConfigs({ tun: { enable: nextValue } }, controller.signal)
  } catch (error) {
    if (isRequestCanceled(error)) return
    if (
      isCurrentAction('tunMode', sequence, controller) &&
      activeUuid.value === backendUuid &&
      configs.value?.tun
    ) {
      configs.value.tun.enable = previousValue
    }
  } finally {
    finishAction('tunMode', sequence, controller, isTunModeUpdating)
  }
}
const isAllowLanUpdating = ref(false)
const handlerAllowLanChange = async () => {
  if (isAllowLanUpdating.value) return

  const backendUuid = activeUuid.value
  const nextValue = !!configs.value?.['allow-lan']
  const previousValue = !nextValue

  const { controller, sequence } = startAction('allowLan')

  isAllowLanUpdating.value = true
  try {
    await updateConfigs({ ['allow-lan']: nextValue }, controller.signal)
  } catch (error) {
    if (isRequestCanceled(error)) return
    if (isCurrentAction('allowLan', sequence, controller) && activeUuid.value === backendUuid) {
      configs.value['allow-lan'] = previousValue
    }
  } finally {
    finishAction('allowLan', sequence, controller, isAllowLanUpdating)
  }
}

const isFlushingDNSCache = ref(false)
const handleFlushDNSCache = async () => {
  await runBackendAction('flushDNSCache', isFlushingDNSCache, flushDNSCacheAPI, () => {
    showNotification({
      content: 'flushDNSCacheSuccess',
      type: 'alert-success',
    })
  })
}

const isFlushingFakeIP = ref(false)
const handleFlushFakeIP = async () => {
  await runBackendAction('flushFakeIP', isFlushingFakeIP, flushFakeIPAPI, () => {
    showNotification({
      content: 'flushFakeIPSuccess',
      type: 'alert-success',
    })
  })
}

const isFlushingSmartWeights = ref(false)
const handleFlushSmartWeights = async () => {
  await runBackendAction(
    'flushSmartWeights',
    isFlushingSmartWeights,
    flushSmartGroupWeightsAPI,
    () => {
      showNotification({
        content: 'flushSmartWeightsSuccess',
        type: 'alert-success',
      })
    },
  )
}

onBeforeUnmount(() => {
  isUnmounted = true
  actionSequences.forEach((sequence, key) => {
    actionSequences.set(key, sequence + 1)
  })
  actionControllers.forEach((controller) => controller.abort())
  actionControllers.clear()

  if (restartCoreReloadTimer) {
    clearTimeout(restartCoreReloadTimer)
    restartCoreReloadTimer = undefined
  }
})
</script>
