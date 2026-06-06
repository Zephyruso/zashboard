<template>
  <DialogWrapper
    v-model="modalValue"
    :title="$t('upgradeCore')"
  >
    <div class="flex flex-col gap-2 p-2">
      <button
        class="btn btn-primary"
        :disabled="isCoreUpgrading"
        :aria-busy="isCoreUpgrading && upgradingType === 'auto'"
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
        :disabled="isCoreUpgrading"
        :aria-busy="isCoreUpgrading && upgradingType === 'release'"
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
        :disabled="isCoreUpgrading"
        :aria-busy="isCoreUpgrading && upgradingType === 'alpha'"
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
import { isRequestCanceled, upgradeCoreAPI } from '@/api'
import { handlerUpgradeSuccess } from '@/helper'
import { fetchConfigs } from '@/store/config'
import { fetchProxies } from '@/store/proxies'
import { fetchRules } from '@/store/rules'
import { onBeforeUnmount, ref } from 'vue'
import DialogWrapper from '../../common/DialogWrapper.vue'

const reloadAll = () => {
  fetchConfigs()
  fetchRules()
  fetchProxies()
}

const upgradingType = ref<'release' | 'alpha' | 'auto'>('auto')
const modalValue = defineModel<boolean>()
const isCoreUpgrading = ref(false)
let isUnmounted = false
let upgradeSequence = 0
let upgradeAbortController: AbortController | undefined

const handlerClickUpgradeCore = async (type: 'release' | 'alpha' | 'auto') => {
  if (isCoreUpgrading.value) return

  const sequence = ++upgradeSequence
  const controller = new AbortController()

  upgradeAbortController?.abort()
  upgradeAbortController = controller
  upgradingType.value = type
  isCoreUpgrading.value = true
  try {
    await upgradeCoreAPI(type, controller.signal)

    if (isUnmounted || sequence !== upgradeSequence || controller.signal.aborted) return

    reloadAll()
    modalValue.value = false
    handlerUpgradeSuccess()
  } catch (error) {
    if (isRequestCanceled(error)) return
    console.error(error)
  } finally {
    if (upgradeAbortController === controller) {
      upgradeAbortController = undefined
    }
    if (!isUnmounted && sequence === upgradeSequence) {
      isCoreUpgrading.value = false
    }
  }
}

onBeforeUnmount(() => {
  isUnmounted = true
  upgradeSequence++
  upgradeAbortController?.abort()
  upgradeAbortController = undefined
})
</script>
