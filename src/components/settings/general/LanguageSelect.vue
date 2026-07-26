<template>
  <SettingItem :setting-key="GENERAL_ITEM_KEYS.language">
    <div class="setting-item-label">
      {{ $t('language') }}
    </div>
    <select
      class="select select-sm w-48"
      v-model="language"
      @change="() => (locale = language)"
    >
      <option
        v-for="opt in Object.values(LANG)"
        :key="opt"
        :value="opt"
      >
        {{ langLabelMap[opt] || opt }}
      </option>
    </select>
  </SettingItem>
</template>

<script setup lang="ts">
import SettingItem from '@/components/settings/SettingItem.vue'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { LANG } from '@/constant'
import { language } from '@/store/settings'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const langLabelMap = {
  [LANG.EN_US]: 'English',
  [LANG.ZH_CN]: '简体中文',
  [LANG.ZH_TW]: '繁體中文',
  [LANG.RU_RU]: 'Русский',
}
</script>
