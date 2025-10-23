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
            v-model="autoDisconnectIdleUDP"
            type="checkbox"
            class="toggle"
          />
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('autoDisconnectIdleUDPTip'))"
          />
        </div>
        <div
          v-if="autoDisconnectIdleUDP"
          class="flex items-center gap-2"
        >
          {{ $t('autoDisconnectIdleUDPTime') }}
          <input
            v-model="autoDisconnectIdleUDPTime"
            type="number"
            class="input input-sm w-20"
          />
          mins
        </div>
        <div class="flex items-center gap-2">
          {{ $t('IPInfoAPI') }}
          <select
            v-model="IPInfoAPI"
            class="select select-sm min-w-24"
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
            v-model="scrollAnimationEffect"
            type="checkbox"
            class="toggle"
          />
        </div>
        <div class="flex items-center gap-2 md:hidden">
          {{ $t('swipeInPages') }}
          <input
            v-model="swipeInPages"
            type="checkbox"
            class="toggle"
          />
        </div>
        <div
          v-if="swipeInPages"
          class="flex items-center gap-2 md:hidden"
        >
          {{ $t('swipeInTabs') }}
          <input
            v-model="swipeInTabs"
            type="checkbox"
            class="toggle"
          />
        </div>
        <div class="flex items-center gap-2 md:hidden">
          {{ $t('disablePullToRefresh') }}
          <input
            v-model="disablePullToRefresh"
            type="checkbox"
            class="toggle"
          />
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('disablePullToRefreshTip'))"
          />
        </div>
        <div
          v-if="isSingBox"
          class="flex items-center gap-2"
        >
          {{ $t('displayAllFeatures') }}
          <input
            v-model="displayAllFeatures"
            type="checkbox"
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
import { isSingBox } from '@/api'
import { IP_INFO_API } from '@/constant'
import { useTooltip } from '@/helper/tooltip'
import {
  autoDisconnectIdleUDP,
  autoDisconnectIdleUDPTime,
  disablePullToRefresh,
  displayAllFeatures,
  IPInfoAPI,
  scrollAnimationEffect,
  swipeInPages,
  swipeInTabs,
} from '@/store/settings'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'

const { showTip } = useTooltip()
</script>
