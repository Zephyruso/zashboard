<template>
  <div class="w-full p-4 gap-2">
    <template v-if="isLargeScreen">
      <div class="flex flex-1 gap-2">
        <div v-for="idx in [0, 1]" :key="idx" class="flex flex-1 flex-col gap-2">
          <ProxyGroup v-for="proxyGroup in filterContent(proxyGroups, idx)" :key="proxyGroup.name"
            :name="proxyGroup.name" />
        </div>
      </div>
    </template>
    <div class="flex flex-1 flex-col gap-2" v-else>
      <ProxyGroup v-for="proxyGroup in proxyGroups" :key="proxyGroup.name" :name="proxyGroup.name" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProxyGroup from '@/components/ProxyGroup.vue';
import { isLargeScreen } from '@/helper';
import { fetchProxies, proxyGroups } from '@/store/proxies';

const filterContent: <T>(all: T[], target: number) => T[] = (all, target) => {
  return all.filter((_, index: number) => index % 2 === target)
}


fetchProxies()


</script>
