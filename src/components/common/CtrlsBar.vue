<template>
  <Teleport
    to="body"
    :disabled="!isMiddleScreen"
  >
    <div
      v-show="isActiveCtrlsBar"
      class="ctrls-bar glass-control bg-base-100/80 md:bg-base-100/20 need-blur top-0 right-0 left-0 z-30 shadow-xs"
      :class="[isMiddleScreen ? 'fixed' : 'sticky']"
      ref="ctrlsBarRef"
    >
      <slot></slot>
    </div>
  </Teleport>
</template>
<script lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

let nextCtrlsBarId = 0
const activeCtrlsBarId = ref(0)
</script>
<script lang="ts" setup>
import { ctrlsBottom } from '@/composables/paddingViews'
import { isMiddleScreen } from '@/helper/utils'
import { useElementBounding } from '@vueuse/core'

const ctrlsBarId = ++nextCtrlsBarId
if (activeCtrlsBarId.value === 0) {
  activeCtrlsBarId.value = ctrlsBarId
}
const ctrlsBarRef = ref<HTMLDivElement | null>(null)
const { bottom: ctrlsBarBottom } = useElementBounding(ctrlsBarRef)
const isActiveCtrlsBar = computed(() => activeCtrlsBarId.value === ctrlsBarId)
let layoutFrame: number | undefined

const queueLayoutFrame = (callback: () => void) => {
  if (layoutFrame !== undefined) cancelAnimationFrame(layoutFrame)
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = undefined
    callback()
  })
}

watch(
  ctrlsBarBottom,
  () => {
    if (!isActiveCtrlsBar.value) return
    ctrlsBottom.value = ctrlsBarBottom.value
  },
  { immediate: true },
)

onMounted(() => {
  activeCtrlsBarId.value = ctrlsBarId
  queueLayoutFrame(() => {
    if (isActiveCtrlsBar.value) {
      ctrlsBottom.value = ctrlsBarBottom.value
    }
  })
})

onUnmounted(() => {
  if (layoutFrame !== undefined) {
    cancelAnimationFrame(layoutFrame)
    layoutFrame = undefined
  }
  if (activeCtrlsBarId.value !== ctrlsBarId) return
  activeCtrlsBarId.value = 0

  queueLayoutFrame(() => {
    if (!document.querySelector('.ctrls-bar')) {
      ctrlsBottom.value = 0
    }
  })
})
</script>
