<template>
  <div class="flex">
    <div class="text-xs flex flex-col gap-2 p-2">
      <div>{{ $t('download') }} {{ prettyBytes(downloadTotal) }}</div>
      <div>{{ $t('upload') }} {{ prettyBytes(uploadTotal) }}</div>
      <div>{{ $t('memoryUsage') }} {{ prettyBytes(memory) }}</div>
    </div>
    <div class="flex justify-end items-end flex-1 p-2">
      <label class="swap swap-rotate">
        <input type="checkbox" class="theme-controller" value="dark" />
        <SunIcon class="swap-off h-6 w-6 fill-current" />
        <MoonIcon class="swap-on h-6 w-6 fill-current" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { downloadTotal, memory, uploadTotal } from '@/store/connections';
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline';
import prettyBytes from 'pretty-bytes';

</script>