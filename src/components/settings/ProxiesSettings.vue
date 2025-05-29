<template>
  <div class="card">
    <div class="card-title px-4 pt-4">
      {{ $t('proxies') }}
    </div>
    <div class="card-body">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex w-full items-center gap-2">
          <span> {{ $t('speedtestUrl') }} </span>
          <TextInput
            v-model="speedtestUrl"
            class="w-36 flex-1 sm:max-w-80"
            :clearable="true"
          />
        </div>
        <div class="flex w-full items-center gap-2">
          <span> {{ $t('speedtestTimeout') }} </span>
          <input
            v-model="speedtestTimeout"
            type="number"
            class="input input-sm w-20"
          />
          ms
        </div>
        <div class="flex items-center gap-2">
          <span> {{ $t('lowLatencyDesc') }} </span>
          <input
            v-model="lowLatency"
            type="number"
            class="input input-sm w-20"
          />
          ms
        </div>
        <div class="flex items-center gap-2">
          <span> {{ $t('mediumLatencyDesc') }} </span>
          <input
            v-model="mediumLatency"
            type="number"
            class="input input-sm w-20"
          />
          ms
        </div>
        <div class="flex w-full items-center gap-2">
          <span> {{ $t('independentLatencyTest') }} </span>
          <input
            v-model="independentLatencyTest"
            class="toggle"
            type="checkbox"
          />
          <QuestionMarkCircleIcon
            class="h-4 w-4"
            @mouseenter="independentLatencyTestTip"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('ipv6Test') }}
          <input
            v-model="IPv6test"
            class="toggle"
            type="checkbox"
          />
        </div>
      </div>
      <div class="divider" />
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex items-center gap-2">
          {{ $t('twoColumnProxyGroup') }}
          <input
            v-model="twoColumnProxyGroup"
            class="toggle"
            type="checkbox"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyPreviewType') }}
          <select
            v-model="proxyPreviewType"
            class="select select-sm min-w-24"
          >
            <option
              v-for="opt in Object.values(PROXY_PREVIEW_TYPE)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyCountMode') }}
          <select
            v-model="proxyCountMode"
            class="select select-sm min-w-24"
          >
            <option
              v-for="opt in Object.values(PROXY_COUNT_MODE)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyCardSize') }}
          <select
            v-model="proxyCardSize"
            class="select select-sm min-w-24"
            @change="handlerProxyCardSizeChange"
          >
            <option
              v-for="opt in Object.values(PROXY_CARD_SIZE)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          {{ $t('displayGlobalByMode') }}
          <input
            v-model="displayGlobalByMode"
            class="toggle"
            type="checkbox"
          />
        </div>
        <div
          v-if="displayGlobalByMode && isSingBox"
          class="flex items-center gap-2"
        >
          {{ $t('customGlobalNode') }}
          <select
            v-model="customGlobalNode"
            class="select select-sm min-w-24"
          >
            <option
              v-for="opt in Object.keys(proxyMap)"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          {{ $t('truncateProxyName') }}
          <input
            v-model="truncateProxyName"
            class="toggle"
            type="checkbox"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyGroupIconSize') }}
          <input
            v-model="proxyGroupIconSize"
            type="number"
            class="input input-sm w-20"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyGroupIconMargin') }}
          <input
            v-model="proxyGroupIconMargin"
            type="number"
            class="input input-sm w-20"
          />
        </div>
      </div>
      <div class="divider" />
      <IconSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { isSingBox } from '@renderer/api'
import { PROXY_CARD_SIZE, PROXY_COUNT_MODE, PROXY_PREVIEW_TYPE } from '@renderer/constant'
import { useTooltip } from '@renderer/helper/tooltip'
import { getMinCardWidth } from '@renderer/helper/utils'
import { proxyMap } from '@renderer/store/proxies'
import {
  customGlobalNode,
  displayGlobalByMode,
  independentLatencyTest,
  IPv6test,
  lowLatency,
  mediumLatency,
  minProxyCardWidth,
  proxyCardSize,
  proxyCountMode,
  proxyGroupIconMargin,
  proxyGroupIconSize,
  proxyPreviewType,
  speedtestTimeout,
  speedtestUrl,
  truncateProxyName,
  twoColumnProxyGroup,
} from '@renderer/store/settings'
import { useI18n } from 'vue-i18n'
import TextInput from '../common/TextInput.vue'
import IconSettings from './IconSettings.vue'

const { showTip } = useTooltip()
const { t } = useI18n()
const independentLatencyTestTip = (e: Event) => {
  return showTip(e, t('independentLatencyTestTip'))
}

const handlerProxyCardSizeChange = () => {
  minProxyCardWidth.value = getMinCardWidth(proxyCardSize.value)
}
</script>
