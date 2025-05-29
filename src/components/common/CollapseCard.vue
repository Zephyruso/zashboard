<template>
  <div :class="`collapse ${showCollapse ? 'collapse-open' : 'collapse-close'}`">
    <div
      class="collapse-title cursor-pointer pr-4 select-none"
      @click="showCollapse = !showCollapse"
    >
      <slot name="title" />
      <slot
        v-if="!showCollapse"
        name="preview"
      />
    </div>
    <div
      class="collapse-content flex flex-col gap-2 max-sm:px-2"
      @transitionend="handlerTransitionEnd"
    >
      <slot
        v-if="showContent"
        :show-full-content="showFullContent"
        name="content"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { collapsedBus } from '@renderer/composables/bus'
import { collapseGroupMap } from '@renderer/store/settings'
import { computed, onUnmounted, ref } from 'vue'

const props = defineProps<{
  name: string
}>()

const showCollapse = computed({
  get() {
    return collapseGroupMap.value[props.name]
  },
  set(value) {
    if (value) {
      showFullContent.value = false
      showContent.value = true
    }

    collapseGroupMap.value[props.name] = value
  },
})

const showContent = ref(showCollapse.value)
const showFullContent = ref(showCollapse.value)

const handlerTransitionEnd = () => {
  if (showCollapse.value) {
    showFullContent.value = true
  } else {
    showContent.value = false
  }
}

const busHandler = ({ open }: { open: boolean }) => {
  showCollapse.value = open
}

collapsedBus.on(busHandler)

onUnmounted(() => {
  collapsedBus.off(busHandler)
})
</script>
