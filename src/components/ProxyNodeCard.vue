<template>
  <div :class="twMerge(
    'flex rounded-md bg-base-100 p-2 shadow-xl items-center gap-2 cursor-pointer',
    props.active && 'bg-primary text-primary-content'
  )">
    <div class="flex-1">{{ node.name }}</div>
    <div class="text-xs flex gap-2 items-center">
      <div class="flex-1">
        <span>{{ node.type }}</span>
        <span> :: {{ node.udp ? 'udp' : '' }}</span>
      </div>
      <LatencyTag :name="node.name" @click.stop="proxyLatencyTest(node.name)"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { proxyLatencyTest, proxyMap } from '@/store/proxies';
import { twMerge } from 'tailwind-merge';
import LatencyTag from './LatencyTag.vue';

const props = defineProps<{
  name: string
  active: boolean
}>()
const node = proxyMap.value[props.name]

</script>
