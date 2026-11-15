<template>
  <div
    aria-hidden="true"
    class="page-dim-layer absolute inset-0 z-50 rounded-[inherit] bg-black/40"
    ref="layerRef"
    @click.stop.prevent="dismissPageDim"
    @pointerdown.stop
    @touchstart.stop.passive
  />
</template>

<script setup lang="ts">
import { dismissPageDim, registerPageDimLayer } from '@/helper/page-dim'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Strength relative to the page backdrop, for bars that are mostly translucent glass. */
    scale?: number
  }>(),
  { scale: 1 },
)

const layerRef = ref<HTMLElement>()
let unregister: (() => void) | undefined

onMounted(() => {
  if (layerRef.value) unregister = registerPageDimLayer(layerRef.value, props.scale)
})

onBeforeUnmount(() => unregister?.())
</script>

<style scoped>
.page-dim-layer {
  opacity: 0;
  pointer-events: none;
}
</style>
