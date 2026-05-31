<template>
  <div :class="`group collapse ${showCollapse ? 'collapse-open' : 'collapse-close'}`">
    <div
      class="collapse-title cursor-pointer pr-4"
      @click="showCollapse = !showCollapse"
    >
      <slot name="title" />
      <slot
        v-if="!showCollapse"
        name="preview"
      />
    </div>
    <div
      class="collapse-content p-0"
      @transitionend="handlerTransitionEnd"
    >
      <div
        v-if="showContent"
        class="overflow-y-auto p-4 pt-0"
        :class="[PROXIES_PARENT_CLASS, contentClass || 'max-h-108', !showCollapse && 'opacity-0']"
      >
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { collapseGroupMap } from '@/store/settings'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  name: string
  forceOpen?: boolean
  contentClass?: string
}>()

const showCollapse = computed({
  get() {
    return props.forceOpen || collapseGroupMap.value[props.name]
  },
  set(value) {
    if (!props.forceOpen) {
      collapseGroupMap.value[props.name] = value
    }
  },
})

watch(showCollapse, (value) => {
  if (value) {
    showContent.value = true
  }
})

const showContent = ref(showCollapse.value)

const handlerTransitionEnd = () => {
  if (!showCollapse.value) {
    showContent.value = false
  }
}
</script>
