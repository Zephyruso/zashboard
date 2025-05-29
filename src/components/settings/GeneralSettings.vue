<template>
  <!-- dashboard -->
  <div class="card">
    <div class="card-title px-4 pt-4">
      {{ $t('general') }}
    </div>
    <div class="card-body gap-4">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex items-center gap-2">
          {{ $t('autoDisconnectIdleUDP') }}
          <input
            type="checkbox"
            v-model="autoDisconnectIdleUDP"
            class="toggle"
          />
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('autoDisconnectIdleUDPTip'))"
          />
        </div>
        <div
          class="flex items-center gap-2"
          v-if="autoDisconnectIdleUDP"
        >
          {{ $t('autoDisconnectIdleUDPTime') }}
          <input
            type="number"
            class="input input-sm w-20"
            v-model="autoDisconnectIdleUDPTime"
          />
          mins
        </div>
        <div class="flex items-center gap-2">
          {{ $t('IPInfoAPI') }}
          <select
            class="select select-sm min-w-24"
            v-model="IPInfoAPI"
          >
            <option
              v-for="opt in Object.values(IP_INFO_API)"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('IPInfoAPITip'))"
          />
        </div>

        <div class="flex items-center gap-2 md:hidden">
          {{ $t('scrollAnimationEffect') }}
          <input
            type="checkbox"
            v-model="scrollAnimationEffect"
            class="toggle"
          />
        </div>
        <div class="flex items-center gap-2 md:hidden">
          {{ $t('swipeInPages') }}
          <input
            type="checkbox"
            v-model="swipeInPages"
            class="toggle"
          />
        </div>
        <div
          class="flex items-center gap-2 md:hidden"
          v-if="swipeInPages"
        >
          {{ $t('swipeInTabs') }}
          <input
            type="checkbox"
            v-model="swipeInTabs"
            class="toggle"
          />
        </div>
        <div class="flex items-center gap-2 md:hidden">
          {{ $t('disablePullToRefresh') }}
          <input
            type="checkbox"
            v-model="disablePullToRefresh"
            class="toggle"
          />
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('disablePullToRefreshTip'))"
          />
        </div>
        <div
          class="flex items-center gap-2"
          v-if="isSingBox"
        >
          {{ $t('displayAllFeatures') }}
          <input
            type="checkbox"
            v-model="displayAllFeatures"
            class="toggle"
          />
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('displayAllFeaturesTip'))"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { isSingBox } from '@renderer/api'
import { IP_INFO_API } from '@renderer/constant'
import { useTooltip } from '@renderer/helper/tooltip'
import {
  autoDisconnectIdleUDP,
  autoDisconnectIdleUDPTime,
  disablePullToRefresh,
  displayAllFeatures,
  IPInfoAPI,
  scrollAnimationEffect,
  swipeInPages,
  swipeInTabs,
} from '@renderer/store/settings'

const { showTip } = useTooltip()
</script>
