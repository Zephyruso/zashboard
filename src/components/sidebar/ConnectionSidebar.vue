<template>
  <div class="flex flex-col gap-2 p-2">
    <input type="text" class="input input-bordered w-full input-sm" v-model="connectionFilter" />
  </div>
</template>

<script setup lang="ts">
import { connectionFilter } from '@/store/connections';

</script>