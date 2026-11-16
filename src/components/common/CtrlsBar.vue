<template>
  <div
    class="bg-base-100 overlay-glass fixed top-0 right-0 left-0 z-30 pt-[env(safe-area-inset-top,0px)] shadow-xs backdrop-blur-xl"
    :class="[isMiddleScreen ? 'fixed' : 'sticky', { 'md:bg-base-100/50': !solid }]"
    ref="ctrlsBarRef"
  >
    <slot></slot>
  </div>
</template>
<script lang="ts" setup>
import { ctrlsBottom } from '@/helper/padding-views'
import { isMiddleScreen } from '@/helper/utils'
import { useElementBounding } from '@vueuse/core'
import { onUnmounted, ref, watch } from 'vue'

defineProps<{
  solid?: boolean
}>()

const ctrlsBarRef = ref<HTMLDivElement | null>(null)
const { bottom: ctrlsBarBottom } = useElementBounding(ctrlsBarRef)

watch(
  ctrlsBarBottom,
  () => {
    ctrlsBottom.value = ctrlsBarBottom.value
  },
  { immediate: true },
)

onUnmounted(() => {
  ctrlsBottom.value = 0
})
</script>
