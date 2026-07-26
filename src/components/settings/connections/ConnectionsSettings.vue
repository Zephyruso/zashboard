<template>
  <!-- connections -->
  <div
    v-if="hasVisibleItems"
    class="flex flex-col gap-3 text-sm"
  >
    <div class="settings-grid">
      <SettingItem :setting-key="k.connectionStyle">
        <div class="setting-item-label">
          {{ $t('connectionStyle') }}
        </div>
        <select
          class="select select-sm min-w-24"
          v-model="connectionDisplayStyle"
        >
          <option :value="CONNECTION_DISPLAY_STYLE.AUTO">
            {{ $t('auto') }}
          </option>
          <option :value="CONNECTION_DISPLAY_STYLE.CARD">
            {{ $t('card') }}
          </option>
          <option :value="CONNECTION_DISPLAY_STYLE.TABLE">
            {{ $t('table') }}
          </option>
        </select>
      </SettingItem>
      <SettingItem :setting-key="k.proxyChainDirection">
        <div class="setting-item-label">
          {{ $t('proxyChainDirection') }}
        </div>
        <select
          class="select select-sm w-24"
          v-model="proxyChainDirection"
        >
          <option
            v-for="opt in Object.values(PROXY_CHAIN_DIRECTION)"
            :key="opt"
            :value="opt"
          >
            {{ $t(opt) }}
          </option>
        </select>
      </SettingItem>
      <SettingItem
        :setting-key="k.tableWidthMode"
        :when="!isConnectionCard"
      >
        <div class="setting-item-label">
          {{ $t('tableWidthMode') }}
        </div>
        <select
          class="select select-sm min-w-24"
          v-model="tableWidthMode"
        >
          <option
            v-for="opt in Object.values(TABLE_WIDTH_MODE)"
            :key="opt"
            :value="opt"
          >
            {{ $t(opt) }}
          </option>
        </select>
      </SettingItem>
      <SettingItem
        :setting-key="k.tableSize"
        :when="!isConnectionCard"
      >
        <div class="setting-item-label">
          {{ $t('tableSize') }}
        </div>
        <select
          class="select select-sm min-w-24"
          v-model="tableSize"
        >
          <option
            v-for="opt in Object.values(TABLE_SIZE)"
            :key="opt"
            :value="opt"
          >
            {{ $t(opt) }}
          </option>
        </select>
      </SettingItem>
      <SourceIPLabels :setting-key="k.sourceIPLabels" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SourceIPLabels from '@/components/settings/connections/SourceIPLabels.vue'
import SettingItem from '@/components/settings/SettingItem.vue'
import { useHasAnyVisibleSetting } from '@/composables/settings'
import { CONNECTIONS_ITEM_KEYS, getItemKeysByCategory } from '@/config/settingsItems'
import {
  CONNECTION_DISPLAY_STYLE,
  PROXY_CHAIN_DIRECTION,
  SETTINGS_MENU_KEY,
  TABLE_SIZE,
  TABLE_WIDTH_MODE,
} from '@/constant'
import {
  connectionDisplayStyle,
  isConnectionCard,
  proxyChainDirection,
  tableSize,
  tableWidthMode,
} from '@/store/settings'

const k = CONNECTIONS_ITEM_KEYS

const hasVisibleItems = useHasAnyVisibleSetting(
  getItemKeysByCategory(SETTINGS_MENU_KEY.connections),
)
</script>
