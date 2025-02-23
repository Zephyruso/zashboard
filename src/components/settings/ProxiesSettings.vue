<template>
  <div class="card card-compact">
    <div class="card-title px-4 pt-4">
      {{ $t('proxies') }}
    </div>
    <div class="card-body">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex w-full items-center gap-2">
          <span> {{ $t('speedtestUrl') }} </span>
          <TextInput
            class="w-36 flex-1 sm:max-w-80"
            v-model="speedtestUrl"
            :clearable="true"
          />
        </div>
        <div class="flex w-full items-center gap-2">
          <span> {{ $t('speedtestTimeout') }} </span>
          <input
            type="number"
            class="input input-sm input-bordered w-20"
            v-model="speedtestTimeout"
          />
          ms
        </div>
        <div class="flex items-center gap-2">
          <span> {{ $t('lowLatencyDesc') }} </span>
          <input
            type="number"
            class="input input-sm input-bordered w-20"
            v-model="lowLatency"
          />
          ms
        </div>
        <div class="flex items-center gap-2">
          <span> {{ $t('mediumLatencyDesc') }} </span>
          <input
            type="number"
            class="input input-sm input-bordered w-20"
            v-model="mediumLatency"
          />
          ms
        </div>
        <div class="flex w-full items-center gap-2">
          <span> {{ $t('independentLatencyTest') }} </span>
          <input
            class="toggle"
            type="checkbox"
            v-model="independentLatencyTest"
          />
          <QuestionMarkCircleIcon
            class="h-4 w-4"
            @mouseenter="independentLatencyTestTip"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('ipv6Test') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="IPv6test"
          />
        </div>
      </div>
      <div class="divider"></div>
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex items-center gap-2">
          {{ $t('twoColumnProxyGroup') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="twoColumnProxyGroup"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyPreviewType') }}
          <select
            class="select select-bordered select-sm min-w-24"
            v-model="proxyPreviewType"
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
            class="select select-bordered select-sm min-w-24"
            v-model="proxyCountMode"
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
            class="select select-bordered select-sm min-w-24"
            v-model="proxyCardSize"
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
          {{ $t('truncateProxyName') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="truncateProxyName"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('displayGlobalByMode') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="displayGlobalByMode"
          />
        </div>
        <template v-if="hasIcon">
          <div class="flex items-center gap-2">
            {{ $t('iconSize') }}
            <input
              type="number"
              class="input input-sm input-bordered w-20"
              v-model="iconSize"
            />
          </div>
          <div class="flex items-center gap-2">
            {{ $t('iconMarginRight') }}
            <input
              type="number"
              class="input input-sm input-bordered w-20"
              v-model="iconMarginRight"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROXY_CARD_SIZE, PROXY_COUNT_MODE, PROXY_PREVIEW_TYPE } from '@/constant'
import { useTooltip } from '@/helper/tooltip'
import { getMinCardWidth } from '@/helper/utils'
import { proxyMap } from '@/store/proxies'
import {
  displayGlobalByMode,
  iconMarginRight,
  iconSize,
  independentLatencyTest,
  IPv6test,
  lowLatency,
  mediumLatency,
  minProxyCardWidth,
  proxyCardSize,
  proxyCountMode,
  proxyPreviewType,
  speedtestTimeout,
  speedtestUrl,
  truncateProxyName,
  twoColumnProxyGroup,
} from '@/store/settings'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TextInput from '../common/TextInput.vue'

const { showTip } = useTooltip()
const { t } = useI18n()
const independentLatencyTestTip = (e: Event) => {
  return showTip(e, t('independentLatencyTestTip'))
}

const hasIcon = computed(() => {
  return Object.values(proxyMap.value).some((proxy) => !!proxy.icon)
})

const handlerProxyCardSizeChange = () => {
  minProxyCardWidth.value = getMinCardWidth(proxyCardSize.value)
}
</script>
