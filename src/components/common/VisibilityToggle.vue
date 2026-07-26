<template>
  <button
    type="button"
    class="vis-toggle group/vis relative h-5 w-5 shrink-0 cursor-pointer rounded-full transition-[background-color,color,transform] duration-300 ease-out active:scale-90"
    :class="hidden ? 'text-success' : 'text-error'"
    @click.stop.prevent="emit('toggle')"
  >
    <Transition
      name="sign-spin"
      mode="out-in"
    >
      <PlusCircleIcon
        v-if="hidden"
        key="plus"
        class="h-5 w-5 drop-shadow-sm transition-transform duration-200 group-hover/vis:scale-110"
      />
      <MinusCircleIcon
        v-else
        key="minus"
        class="h-5 w-5 drop-shadow-sm transition-transform duration-200 group-hover/vis:scale-110"
      />
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { MinusCircleIcon, PlusCircleIcon } from '@heroicons/vue/24/solid'

defineProps<{
  hidden: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
.vis-toggle {
  background-color: color-mix(in srgb, currentColor 12%, transparent);
}

.sign-spin-enter-active,
.sign-spin-leave-active {
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sign-spin-leave-active {
  position: absolute;
  inset: 0;
}

.sign-spin-enter-from {
  transform: rotate(-180deg);
}

.sign-spin-leave-to {
  transform: rotate(180deg);
}

.sign-spin-enter-to,
.sign-spin-leave-from {
  transform: rotate(0deg);
}
</style>
