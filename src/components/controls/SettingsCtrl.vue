<template>
  <CtrlsBar>
    <div
      class="scrollbar-hidden p-2"
      @touchstart.passive.stop
      @touchmove.passive.stop
      @touchend.passive.stop
    >
      <div class="flex w-full gap-2">
        <SegmentedControl
          class="mx-auto max-w-4xl flex-1"
          block
          :model-value="activeMenuKey"
          :options="segmentOptions"
          @update:model-value="(key) => emit('menu-click', key as SETTINGS_MENU_KEY)"
        />
        <button
          class="btn btn-circle btn-sm my-auto"
          :class="settingsEditMode ? 'btn-primary' : ''"
          :title="$t('settingsVisibility')"
          @click="settingsEditMode = !settingsEditMode"
        >
          <Cog6ToothIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </CtrlsBar>
</template>

<script setup lang="ts">
import { settingsEditMode } from '@/composables/settings'
import { SETTINGS_MENU_KEY } from '@/constant'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { useMediaQuery } from '@vueuse/core'
import type { Component } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CtrlsBar from '../common/CtrlsBar.vue'
import SegmentedControl, { type SegmentOption } from '../common/SegmentedControl.vue'

type MenuItem = {
  key: SETTINGS_MENU_KEY
  label: string
  icon: Component
  component: Component
}

const props = defineProps<{
  menuItems: MenuItem[]
  activeMenuKey: SETTINGS_MENU_KEY
}>()

const emit = defineEmits<{
  (e: 'menu-click', key: SETTINGS_MENU_KEY): void
}>()

const { t } = useI18n()
// 宽屏显示文字标签，窄屏只显示图标
const showLabel = useMediaQuery('(min-width: 1024px)')

const segmentLabelMap: Record<SETTINGS_MENU_KEY, string> = {
  [SETTINGS_MENU_KEY.general]: 'settingsMenuGeneral',
  [SETTINGS_MENU_KEY.backend]: 'settingsMenuBackend',
  [SETTINGS_MENU_KEY.proxies]: 'settingsMenuProxies',
  [SETTINGS_MENU_KEY.connections]: 'settingsMenuConnections',
  [SETTINGS_MENU_KEY.overview]: 'settingsMenuOverview',
}

const segmentOptions = computed<SegmentOption[]>(() =>
  props.menuItems.map((item) => ({
    value: item.key,
    label: showLabel.value ? t(segmentLabelMap[item.key]) : undefined,
    icon: item.icon,
  })),
)
</script>
