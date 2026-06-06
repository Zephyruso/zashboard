<template>
  <div class="flex flex-col text-sm">
    <template v-if="hasVisibleLatencyItems">
      <div class="settings-section-label">
        {{ $t('latency') }}
      </div>
      <div class="settings-grid">
        <div
          v-if="isVisibleSpeedtestMode"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('speedtestMode') }}
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
              :aria-label="$t('speedtestModeTip')"
              :title="$t('speedtestModeTip')"
              @mouseenter="speedtestModeTip"
              @focus="speedtestModeTip"
            >
              <QuestionMarkCircleIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          </div>
          <select
            class="select select-sm min-w-24"
            v-model="speedtestMode"
          >
            <option :value="SPEEDTEST_MODE.DASHBOARD">
              {{ $t('speedtestModeDashboard') }}
            </option>
            <option :value="SPEEDTEST_MODE.CORE">
              {{ $t('speedtestModeCore') }}
            </option>
          </select>
        </div>
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
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
              :aria-label="$t('independentLatencyTestTip')"
              :title="$t('independentLatencyTestTip')"
              @mouseenter="independentLatencyTestTip"
              @focus="independentLatencyTestTip"
            >
              <QuestionMarkCircleIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="independentLatencyTest"
          />
        </div>
        <GroupTestUrlsSettings v-if="independentLatencyTest && isVisibleGroupTestUrls" />
      </div>
    </template>
    <template v-if="hasVisibleProxyStyleItems">
      <div class="settings-section-label">
        {{ $t('appearance') }}
      </div>
      <div class="settings-grid">
        <div
          v-if="isVisibleProxyFolderMode"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('proxyFolderMode') }}
          </div>
          <select
            class="select select-sm min-w-24"
            v-model="proxyFolderMode"
          >
            <option :value="FOLDER_MODE.AUTO">
              {{ $t('folderModeAuto') }}
            </option>
            <option :value="FOLDER_MODE.ON">
              {{ $t('folderModeOn') }}
            </option>
            <option :value="FOLDER_MODE.OFF">
              {{ $t('folderModeOff') }}
            </option>
          </select>
        </div>
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
        <IconSettings v-if="isVisibleIconSettings" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { isSingBox } from '@/api'
import { useIsSettingVisible } from '@/composables/settings'
import { PROXIES_ITEM_KEYS } from '@/config/settingsItems'
import { FOLDER_MODE, PROXY_CARD_SIZE, PROXY_PREVIEW_TYPE, SPEEDTEST_MODE } from '@/constant'
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
  proxyCardSize,
  proxyGroupIconMargin,
  proxyGroupIconSize,
  proxyPreviewType,
  speedtestMode,
  speedtestTimeout,
  speedtestUrl,
  truncateProxyName,
  proxyFolderMode,
  twoColumnProxyGroup,
} from '@/store/settings'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TextInput from '../../common/TextInput.vue'
import GroupTestUrlsSettings from './GroupTestUrlsSettings.vue'
import IconSettings from './IconSettings.vue'

const k = PROXIES_ITEM_KEYS
const isVisibleSpeedtestUrl = useIsSettingVisible(k.speedtestUrl)
const isVisibleSpeedtestTimeout = useIsSettingVisible(k.speedtestTimeout)
const isVisibleSpeedtestMode = useIsSettingVisible(k.speedtestMode)
const isVisibleLowLatency = useIsSettingVisible(k.lowLatencyDesc)
const isVisibleMediumLatency = useIsSettingVisible(k.mediumLatencyDesc)
const isVisibleIpv6Test = useIsSettingVisible(k.ipv6Test)
const isVisibleIndependentLatencyTest = useIsSettingVisible(k.independentLatencyTest)
const isVisibleGroupTestUrls = useIsSettingVisible(k.groupTestUrls)
const isVisibleTwoColumnProxyGroup = useIsSettingVisible(k.twoColumnProxyGroup)
const isVisibleProxyFolderMode = useIsSettingVisible(k.proxyFolderMode)
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
const speedtestModeTip = (e: Event) => {
  return showTip(e, t('speedtestModeTip'))
}
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
    isVisibleSpeedtestMode.value ||
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
    isVisibleProxyFolderMode.value ||
    isVisibleTruncateProxyName.value ||
    isVisibleDisplayGlobalByMode.value ||
    (displayGlobalByMode.value && isSingBox.value && isVisibleCustomGlobalNode.value) ||
    isVisibleProxyPreviewType.value ||
    isVisibleProxyCardSize.value ||
    isVisibleProxyGroupIconSize.value ||
    isVisibleProxyGroupIconMargin.value
  )
})
</script>
