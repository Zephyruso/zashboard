<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2 pb-1">
      <span class="text-base-content/70 shrink-0 text-sm">{{ $t('proxySortType') }}</span>
      <select
        v-model="proxySortType"
        class="select select-sm select-bordered max-w-48 text-sm"
      >
        <option
          v-for="type in sortOptions"
          :key="type"
          :value="type"
        >
          {{ $t(type) }}
        </option>
      </select>
    </div>
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { PROXY_SORT_TYPE } from '@/constant'
import { proxySortType } from '@/store/settings'
import { computed } from 'vue'

const sortOptions = computed(() => Object.values(PROXY_SORT_TYPE))
</script>
