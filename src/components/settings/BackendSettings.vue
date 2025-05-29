<template>
  <!-- backend -->
  <div class="card">
    <div class="card-title px-4 pt-4">
      <div class="indicator">
        <span
          v-if="isCoreUpdateAvailable"
          class="indicator-item top-1 -right-1 flex"
        >
          <span class="bg-secondary absolute h-2 w-2 animate-ping rounded-full" />
          <span class="bg-secondary h-2 w-2 rounded-full" />
        </span>
        <a
          class="flex cursor-pointer items-center gap-2"
          :href="
            isSingBox
              ? 'https://github.com/sagernet/sing-box'
              : 'https://github.com/metacubex/mihomo'
          "
          target="_blank"
        >
          {{ $t('backend') }}
          <BackendVersion class="text-sm font-normal" />
        </a>
      </div>
    </div>
    <div class="card-body gap-4">
      <template v-if="(!isSingBox || displayAllFeatures) && configs">
        <div class="divider" />
        <div class="grid max-w-3xl grid-cols-2 gap-2 lg:grid-cols-3">
          <div
            v-for="portConfig in portList"
            :key="portConfig.key"
            class="flex items-center gap-2"
          >
            <span class="shrink-0"> {{ $t(portConfig.label) }} </span>
            <input
              v-model="configs[portConfig.key as keyof Config]"
              class="input input-sm w-20 sm:w-24"
              type="number"
              @change="
                updateConfigs({ [portConfig.key]: Number(configs[portConfig.key as keyof Config]) })
              "
            />
          </div>
        </div>
        <div class="grid max-w-3xl grid-cols-2 gap-2 lg:grid-cols-4">
          <div
            v-if="configs?.tun"
            class="flex items-center gap-2"
          >
            {{ $t('tunMode') }}
            <input
              v-model="configs.tun.enable"
              class="toggle"
              type="checkbox"
              @change="hanlderTunModeChange"
            />
          </div>
          <div class="flex items-center gap-2">
            {{ $t('allowLan') }}
            <input
              v-model="configs['allow-lan']"
              class="toggle"
              type="checkbox"
              @change="handlerAllowLanChange"
            />
          </div>
          <template v-if="!activeBackend?.disableUpgradeCore">
            <div class="flex items-center gap-2">
              {{ $t('checkUpgrade') }}
              <input
                v-model="checkUpgradeCore"
                class="toggle"
                type="checkbox"
                @change="handlerCheckUpgradeCoreChange"
              />
            </div>
            <div
              v-if="checkUpgradeCore"
              class="flex items-center gap-2"
            >
              {{ $t('autoUpgrade') }}
              <input
                v-model="autoUpgradeCore"
                class="toggle"
                type="checkbox"
              />
            </div>
          </template>
        </div>
      </template>

      <div
        v-if="version"
        class="grid max-w-3xl grid-cols-2 gap-2 md:grid-cols-3 xl:max-w-6xl xl:grid-cols-6"
      >
        <template v-if="!isSingBox || displayAllFeatures">
          <button
            v-if="!activeBackend?.disableUpgradeCore"
            :class="twMerge('btn btn-primary btn-sm', isCoreUpgrading ? 'animate-pulse' : '')"
            @click="handlerClickUpgradeCore"
          >
            {{ $t('upgradeCore') }}
          </button>
          <button
            :class="twMerge('btn btn-sm', isCoreRestarting ? 'animate-pulse' : '')"
            @click="handlerClickRestartCore"
          >
            {{ $t('restartCore') }}
          </button>
          <button
            :class="twMerge('btn btn-sm', isConfigReloading ? 'animate-pulse' : '')"
            @click="handlerClickReloadConfigs"
          >
            {{ $t('reloadConfigs') }}
          </button>
          <button
            :class="twMerge('btn btn-sm', isGeoUpdating ? 'animate-pulse' : '')"
            @click="handlerClickUpdateGeo"
          >
            {{ $t('updateGeoDatabase') }}
          </button>
        </template>
        <button
          class="btn btn-sm"
          @click="flushFakeIPAPI"
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
      <div class="divider" />
      <DnsQuery />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  flushFakeIPAPI,
  flushSmartGroupWeightsAPI,
  isCoreUpdateAvailable,
  isSingBox,
  reloadConfigsAPI,
  restartCoreAPI,
  updateGeoDataAPI,
  upgradeCoreAPI,
  version,
} from '@renderer/api'
import BackendVersion from '@renderer/components/common/BackendVersion.vue'
import DnsQuery from '@renderer/components/settings/DnsQuery.vue'
import { handlerUpgradeSuccess } from '@renderer/helper'
import { configs, fetchConfigs, updateConfigs } from '@renderer/store/config'
import { fetchProxies, hasSmartGroup } from '@renderer/store/proxies'
import { fetchRules } from '@renderer/store/rules'
import { autoUpgradeCore, checkUpgradeCore, displayAllFeatures } from '@renderer/store/settings'
import { activeBackend } from '@renderer/store/setup'
import type { Config } from '@renderer/types'
import { twMerge } from 'tailwind-merge'
import { ref } from 'vue'

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
  } catch {
    isCoreRestarting.value = false
  }
}

const isCoreUpgrading = ref(false)
const handlerClickUpgradeCore = async () => {
  if (isCoreUpgrading.value) return
  isCoreUpgrading.value = true
  try {
    await upgradeCoreAPI()
    reloadAll()
    handlerUpgradeSuccess()
    isCoreUpgrading.value = false
  } catch (e) {
    console.error(e)
    isCoreUpgrading.value = false
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
</script>
