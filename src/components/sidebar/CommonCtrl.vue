<template>
  <div class="flex justify-between">
    <div class="flex flex-col gap-2 p-2 text-xs">
      <div>{{ $t('connections') }}: {{ activeConnections.length }}</div>
      <div>
        {{ $t('download') }}: {{ prettyBytesHelper(downloadTotal) }} ({{
          prettyBytesHelper(downloadSpeedTotal)
        }}/s)
      </div>
      <div>
        {{ $t('upload') }}: {{ prettyBytesHelper(uploadTotal) }} ({{
          prettyBytesHelper(uploadSpeedTotal)
        }}/s)
      </div>
      <div>{{ $t('memoryUsage') }}: {{ prettyBytesHelper(memory, { binary: true }) }}</div>
      <div class="flex gap-1">
        {{ $t('version') }}:
        {{ version }}
      </div>
      <div class="flex gap-2">
        <select
          class="select select-bordered select-xs w-48"
          v-model="activeUuid"
        >
          <option
            v-for="opt in opts"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="btn btn-circle btn-xs"
          @click="addBackend"
        >
          <PlusIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
    <div class="flex flex-1 items-end justify-end p-2">
      <button
        class="btn btn-circle btn-ghost btn-xs hidden md:flex"
        v-if="!isSiderbarCollapsed"
        @click="isSiderbarCollapsed = true"
      >
        <ArrowLeftCircleIcon class="h-5 w-5" />
      </button>
      <button
        class="btn btn-circle btn-ghost btn-xs"
        @click="swapLanguage"
      >
        <LanguageIcon class="h-5 w-5"></LanguageIcon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { version } from '@/api'
import { prettyBytesHelper } from '@/helper'
import { i18n } from '@/i18n'
import { LANG, language } from '@/store/config'
import {
  activeConnections,
  downloadSpeedTotal,
  downloadTotal,
  memory,
  uploadSpeedTotal,
  uploadTotal,
} from '@/store/connections'
import { activeUuid, backendList } from '@/store/setup'
import { ArrowLeftCircleIcon, LanguageIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import { isSiderbarCollapsed } from './config'

const opts = computed(() => {
  return backendList.value.map((b) => {
    return {
      label: `${b.protocol}://${b.host}:${b.port}`,
      value: b.uuid,
    }
  })
})

const addBackend = () => {
  activeUuid.value = null
}

const swapLanguage = () => {
  language.value = language.value === LANG.ZH_CN ? LANG.EN_US : LANG.ZH_CN
  i18n.global.locale = language.value
}
</script>
