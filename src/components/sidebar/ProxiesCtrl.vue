<template>
  <div
    :class="twMerge('flex flex-col gap-2 p-2', vertical && 'flex-row')"
    v-if="configs"
  >
    <template v-if="proxyProviederList.length">
      <div
        role="tablist"
        class="tabs-boxed tabs tabs-sm"
        v-if="proxyProviederList.length"
      >
        <a
          role="tab"
          class="tab"
          v-for="type in PROXY_TAB_TYPE"
          :key="type"
          :class="{ 'tab-active': proxiesTabShow === type }"
          @click="proxiesTabShow = type"
        >
          {{ $t(type) }}</a
        >
      </div>
      <div
        class="flex flex-col gap-2"
        v-if="proxiesTabShow === PROXY_TAB_TYPE.PROVIDER"
      >
        <button
          :class="twMerge('btn btn-sm', isUpgrading ? 'animate-pulse' : '')"
          @click="handlerClickUpgradeAllProviders"
        >
          {{ $t('upgradeAllProviders') }}
        </button>
      </div>
    </template>
    <select
      class="select select-bordered select-sm w-full"
      v-model="proxySortType"
    >
      <option
        v-for="type in Object.values(PROXY_SORT_TYPE)"
        :key="type"
        :label="$t(type)"
        :value="type"
      />
    </select>
    <select
      class="select select-bordered select-sm w-full"
      :value="configs.mode"
      @change="handlerModeChange"
    >
      <option
        v-for="mode in modeList"
        :key="mode"
        :label="mode"
        :value="mode"
      />
    </select>
  </div>
</template>

<script setup lang="ts">
import { updateProxyProviderAPI } from '@/api'
import {
  configs,
  proxiesTabShow,
  PROXY_SORT_TYPE,
  PROXY_TAB_TYPE,
  proxySortType,
  updateConfigs,
} from '@/store/config'
import { fetchProxies, proxyProviederList } from '@/store/proxies'
import { twMerge } from 'tailwind-merge'
import { computed, ref } from 'vue'
defineProps<{
  vertical?: boolean
}>()

const isUpgrading = ref(false)
const handlerClickUpgradeAllProviders = async () => {
  if (isUpgrading.value) return
  isUpgrading.value = true
  try {
    await Promise.all(
      proxyProviederList.value.map((provider) => updateProxyProviderAPI(provider.name)),
    )
    await fetchProxies()
    isUpgrading.value = false
  } catch {
    isUpgrading.value = false
  }
}

const modeList = computed(() => {
  return configs.value?.['mode-list'] || ['direct', 'rule', 'global']
})

const handlerModeChange = (e: Event) => {
  const mode = (e.target as HTMLSelectElement).value
  updateConfigs({ mode })
}
</script>
