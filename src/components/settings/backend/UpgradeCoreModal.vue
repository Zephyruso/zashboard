<template>
  <DialogWrapper
    v-model="modalValue"
    :title="$t('upgradeCore')"
  >
    <div class="flex flex-col gap-2 p-2">
      <button
        class="btn btn-primary"
        :disabled="isCoreUpgrading && upgradingType !== 'auto'"
        @click="handlerClickUpgradeCore('auto')"
      >
        <span
          v-if="isCoreUpgrading && upgradingType === 'auto'"
          class="loading loading-spinner loading-md"
        ></span>
        {{ $t('upgradeCore') }}
      </button>
      <button
        class="btn"
        :disabled="isCoreUpgrading && upgradingType !== 'release'"
        @click="handlerClickUpgradeCore('release')"
      >
        <span
          v-if="isCoreUpgrading && upgradingType === 'release'"
          class="loading loading-spinner loading-md"
        ></span>

        {{ $t('upgradeToRelease') }}
      </button>
      <button
        class="btn"
        :disabled="isCoreUpgrading && upgradingType !== 'alpha'"
        @click="handlerClickUpgradeCore('alpha')"
      >
        <span
          v-if="isCoreUpgrading && upgradingType === 'alpha'"
          class="loading loading-spinner loading-md"
        ></span>
        {{ $t('upgradeToAlpha') }}
      </button>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { upgradeCoreAPI } from '@/assembly/version'
import { handlerUpgradeSuccess } from '@/helper'
import { fetchConfigs } from '@/assembly/config'
import { fetchProxies } from '@/assembly/proxies'
import { fetchRules } from '@/assembly/rules'
import { ref } from 'vue'
import DialogWrapper from '../../common/DialogWrapper.vue'

const reloadAll = () => {
  fetchConfigs()
  fetchRules()
  fetchProxies()
}

const upgradingType = ref<'release' | 'alpha' | 'auto'>('auto')
const modalValue = defineModel<boolean>()
const isCoreUpgrading = ref(false)
const handlerClickUpgradeCore = async (type: 'release' | 'alpha' | 'auto') => {
  if (isCoreUpgrading.value) return

  upgradingType.value = type
  isCoreUpgrading.value = true
  try {
    await upgradeCoreAPI(type)
    reloadAll()
    modalValue.value = false
    handlerUpgradeSuccess()
    isCoreUpgrading.value = false
  } catch (e) {
    console.error(e)
    isCoreUpgrading.value = false
  }
}
</script>
