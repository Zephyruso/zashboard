<template>
  <div class="flex flex-col gap-2 p-4 text-sm">
    <template v-if="hasVisibleLatencyItems">
      <div class="settings-title">
        {{ $t('latency') }}
      </div>
      <div class="settings-grid">
        <div
          v-if="isVisibleSpeedtestUrl"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('speedtestUrl') }}
          </div>
          <TextInput
            class="flex-2"
            v-model="speedtestUrl"
            :clearable="true"
          />
        </div>
        <div
          v-if="isVisibleSpeedtestTimeout"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('speedtestTimeout') }}
          </div>
          <input
            type="number"
            class="input input-sm w-20"
            v-model="speedtestTimeout"
          />
          ms
        </div>
        <div
          v-if="isVisibleLowLatency"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('lowLatencyDesc') }}
          </div>
          <input
            type="number"
            class="input input-sm w-20"
            v-model="lowLatency"
          />
          ms
        </div>
        <div
          v-if="isVisibleMediumLatency"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('mediumLatencyDesc') }}
          </div>
          <input
            type="number"
            class="input input-sm w-20"
            v-model="mediumLatency"
          />
          ms
        </div>
        <div
          v-if="isVisibleIpv6Test"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('ipv6Test') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="IPv6test"
          />
        </div>
        <div
          v-if="isVisibleIndependentLatencyTest"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('independentLatencyTest') }}
            <QuestionMarkCircleIcon
              class="h-4 w-4"
              @mouseenter="independentLatencyTestTip"
            />
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="independentLatencyTest"
          />
        </div>
        <div
          v-if="independentLatencyTest && isVisibleGroupTestUrls"
          class="col-span-full"
        >
          <GroupTestUrlsSettings />
        </div>
      </div>
    </template>
    <template v-if="hasVisibleProxyStyleItems">
      <div
        v-if="hasVisibleLatencyItems"
        class="divider my-4"
      ></div>
      <div class="settings-title">
        {{ $t('proxyStyle') }}
      </div>
      <div class="settings-grid">
        <div
          v-if="isVisibleTwoColumnProxyGroup"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('twoColumnProxyGroup') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="twoColumnProxyGroup"
          />
        </div>
        <div
          v-if="isVisibleTruncateProxyName"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('truncateProxyName') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="truncateProxyName"
          />
        </div>
        <div
          v-if="isVisibleProviderProxyNodeUseList"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('providerProxyNodeLayout') }}
          </div>
          <select
            class="select select-sm min-w-24"
            v-model="providerProxyNodeLayout"
          >
            <option value="list">
              {{ $t('list') }}
            </option>
            <option value="grid">
              {{ $t('grid') }}
            </option>
          </select>
        </div>
        <div
          v-if="isVisibleDisplayGlobalByMode"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('displayGlobalByMode') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="displayGlobalByMode"
          />
        </div>
        <div
          v-if="displayGlobalByMode && isSingBox && isVisibleCustomGlobalNode"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('customGlobalNode') }}
          </div>
          <select
            class="select select-sm min-w-24"
            v-model="customGlobalNode"
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
        <div
          v-if="isVisibleProxyPreviewType"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('proxyPreviewType') }}
          </div>
          <select
            class="select select-sm min-w-24"
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
        <div
          v-if="isVisibleProxyCardSize"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('proxyCardSize') }}
          </div>
          <select
            class="select select-sm min-w-24"
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

        <div
          v-if="isVisibleProxyGroupIconSize"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('proxyGroupIconSize') }}
          </div>
          <input
            type="number"
            class="input input-sm w-24"
            v-model="proxyGroupIconSize"
          />
        </div>
        <div
          v-if="isVisibleProxyGroupIconMargin"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('proxyGroupIconMargin') }}
          </div>
          <input
            type="number"
            class="input input-sm w-24"
            v-model="proxyGroupIconMargin"
          />
        </div>
      </div>
    </template>
    <template v-if="isVisibleIconSettings">
      <div
        v-if="hasVisibleLatencyItems || hasVisibleProxyStyleItems"
        class="divider my-4"
      ></div>
      <div class="settings-title">
        {{ $t('icon') }}
      </div>
      <IconSettings />
    </template>
  </div>
</template>

<script setup lang="ts">
import { isSingBox } from '@/api'
import { useIsSettingVisible } from '@/composables/settings'
import { PROXIES_ITEM_KEYS } from '@/config/settingsItems'
import { PROXY_CARD_SIZE, PROXY_PREVIEW_TYPE } from '@/constant'
import { useTooltip } from '@/helper/tooltip'
import { getMinCardWidth } from '@/helper/utils'
import { proxyMap } from '@/store/proxies'
import {
  customGlobalNode,
  displayGlobalByMode,
  independentLatencyTest,
  IPv6test,
  lowLatency,
  mediumLatency,
  minProxyCardWidth,
  providerProxyNodeUseList,
  proxyCardSize,
  proxyGroupIconMargin,
  proxyGroupIconSize,
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
import GroupTestUrlsSettings from './GroupTestUrlsSettings.vue'
import IconSettings from './IconSettings.vue'

const k = PROXIES_ITEM_KEYS
const isVisibleSpeedtestUrl = useIsSettingVisible(k.speedtestUrl)
const isVisibleSpeedtestTimeout = useIsSettingVisible(k.speedtestTimeout)
const isVisibleLowLatency = useIsSettingVisible(k.lowLatencyDesc)
const isVisibleMediumLatency = useIsSettingVisible(k.mediumLatencyDesc)
const isVisibleIpv6Test = useIsSettingVisible(k.ipv6Test)
const isVisibleIndependentLatencyTest = useIsSettingVisible(k.independentLatencyTest)
const isVisibleGroupTestUrls = useIsSettingVisible(k.groupTestUrls)
const isVisibleTwoColumnProxyGroup = useIsSettingVisible(k.twoColumnProxyGroup)
const isVisibleProviderProxyNodeUseList = useIsSettingVisible(k.providerProxyNodeLayout)
const isVisibleTruncateProxyName = useIsSettingVisible(k.truncateProxyName)
const isVisibleDisplayGlobalByMode = useIsSettingVisible(k.displayGlobalByMode)
const isVisibleCustomGlobalNode = useIsSettingVisible(k.customGlobalNode)
const isVisibleProxyPreviewType = useIsSettingVisible(k.proxyPreviewType)
const isVisibleProxyCardSize = useIsSettingVisible(k.proxyCardSize)
const isVisibleProxyGroupIconSize = useIsSettingVisible(k.proxyGroupIconSize)
const isVisibleProxyGroupIconMargin = useIsSettingVisible(k.proxyGroupIconMargin)
const isVisibleIconSettings = useIsSettingVisible(k.icon)

const { showTip } = useTooltip()
const { t } = useI18n()
const independentLatencyTestTip = (e: Event) => {
  return showTip(e, t('independentLatencyTestTip'))
}

const handlerProxyCardSizeChange = () => {
  minProxyCardWidth.value = getMinCardWidth(proxyCardSize.value)
}

const hasVisibleLatencyItems = computed(() => {
  return (
    isVisibleSpeedtestUrl.value ||
    isVisibleSpeedtestTimeout.value ||
    isVisibleLowLatency.value ||
    isVisibleMediumLatency.value ||
    isVisibleIpv6Test.value ||
    isVisibleIndependentLatencyTest.value ||
    (independentLatencyTest.value && isVisibleGroupTestUrls.value)
  )
})

const hasVisibleProxyStyleItems = computed(() => {
  return (
    isVisibleTwoColumnProxyGroup.value ||
    isVisibleProviderProxyNodeUseList.value ||
    isVisibleTruncateProxyName.value ||
    isVisibleDisplayGlobalByMode.value ||
    (displayGlobalByMode.value && isSingBox.value && isVisibleCustomGlobalNode.value) ||
    isVisibleProxyPreviewType.value ||
    isVisibleProxyCardSize.value ||
    isVisibleProxyGroupIconSize.value ||
    isVisibleProxyGroupIconMargin.value
  )
})

const providerProxyNodeLayout = computed<'list' | 'grid'>({
  get() {
    return providerProxyNodeUseList.value ? 'list' : 'grid'
  },
  set(val) {
    providerProxyNodeUseList.value = val === 'list'
  },
})
</script>
