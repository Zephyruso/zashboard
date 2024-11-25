<template>
  <div
    class="flex flex-col gap-2 p-2"
    v-if="configs"
  >
    <select
      class="select select-bordered select-sm w-full"
      :value="configs.mode"
      @change="handlerModeChange"
    >
      <option
        v-for="mode in modeList"
        :key="mode"
        :label="mode"
        :value="mode"
      />
    </select>
    <button
      class="btn btn-sm w-full"
      @click="flushFakeIPAPI"
    >
      {{ $t('flushFakeIP') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { flushFakeIPAPI } from '@/api'
import { configs, updateConfigs } from '@/store/config'
import { computed } from 'vue'

const modeList = computed(() => {
  return configs.value?.['mode-list'] || ['direct', 'rule', 'global']
})

const handlerModeChange = (e: Event) => {
  const mode = (e.target as HTMLSelectElement).value
  updateConfigs({ mode })
}
</script>
