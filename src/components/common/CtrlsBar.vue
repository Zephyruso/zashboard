<template>
  <div
    class="bg-base-100 need-blur fixed top-0 right-0 left-0 z-30 shadow-xs"
    :class="[
      isMiddleScreen ? 'fixed' : 'sticky',
      { 'md:bg-base-100/50 md:backdrop-blur-xl': !solid },
    ]"
    ref="ctrlsBarRef"
  >
    <slot></slot>
  </div>
</template>
<script lang="ts" setup>
import { ctrlsBottom } from '@/composables/paddingViews'
import { isMiddleScreen } from '@/helper/utils'
import { useElementBounding } from '@vueuse/core'
import { onUnmounted, ref, watch } from 'vue'

defineProps<{
  solid?: boolean
}>()

const ctrlsBarRef = ref<HTMLDivElement | null>(null)
// windowScroll:false —— 该栏 fixed/sticky,bottom 只随尺寸变化;默认 capture 监听
// 会让页面内任何滚动容器的每个 scroll 事件都对它读一次 gBCR
const { bottom: ctrlsBarBottom } = useElementBounding(ctrlsBarRef, { windowScroll: false })

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
