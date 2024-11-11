<template>
  <div class="collapse collapse-arrow bg-base-200">
    <input type="checkbox" checked/>
    <div class="collapse-title flex items-center gap-2">
      <div class="text-xl font-medium">
        {{ proxyGroup.name }}
      </div>
      <div class="text-sm">
        {{ proxyGroup.now }}
      </div>
      <LatencyTag :name="proxyGroup.now" />
    </div>
    <div class="collapse-content flex flex-col gap-2">
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
        <ProxyNodeCard v-for="node in proxyGroup.all" :key="node" :name="node" :active="node === proxyGroup.now"
        @click="selectProxy(proxyGroup.name, node)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LatencyTag from '@/components/LatencyTag.vue';
import ProxyNodeCard from '@/components/ProxyNodeCard.vue';
import { selectProxy, proxyMap } from '@/store/proxies';

const props = defineProps<{
  name: string
}>()

const proxyGroup = proxyMap.value[props.name]
</script>