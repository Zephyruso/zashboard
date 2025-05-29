<template>
  <div class="flex items-center gap-2">
    {{ $t('language') }}
    <select
      v-model="language"
      class="select select-sm w-48"
      @change="() => (i18n.global.locale = language)"
    >
      <option
        v-for="opt in Object.values(LANG)"
        :key="opt"
        :value="opt"
      >
        {{ langLabelMap[opt] || opt }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { LANG } from '@renderer/constant'
import { i18n } from '@renderer/i18n'
import { language } from '@renderer/store/settings'

const langLabelMap = {
  [LANG.EN_US]: 'English',
  [LANG.ZH_CN]: '简体中文',
  [LANG.RU_RU]: 'Русский',
}
</script>
