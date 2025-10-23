<template>
  <dialog
    ref="modalRef"
    class="modal"
    @close="isOpen = false"
  >
    <form
      method="dialog"
      class="modal-backdrop w-screen"
    >
      <button class="!outline-none">close</button>
    </form>
    <div
      class="modal-box relative overflow-hidden p-0"
      :class="[blurIntensity < 5 && 'backdrop-blur-sm!', boxClass]"
    >
      <div
        v-if="title && isOpen"
        class="border-base-content/10 relative border-b px-4 py-2 text-base font-bold"
      >
        {{ title }}
        <slot name="title-right"></slot>
        <form
          v-if="!noCloseButton"
          method="dialog"
          class="-mr-1"
        >
          <button class="btn btn-circle btn-ghost btn-xs absolute top-2 right-2">
            <XMarkIcon class="h-4 w-4" />
          </button>
        </form>
      </div>
      <div
        v-if="isOpen"
        class="max-h-[90dvh] overflow-y-auto p-4 max-md:max-h-[70dvh]"
      >
        <slot />
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { blurIntensity } from '@/store/settings'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { ref, watch } from 'vue'

const modalRef = ref<HTMLDialogElement>()
const isOpen = defineModel<boolean>()
defineProps<{ noPadding?: boolean; boxClass?: string; title?: string; noCloseButton?: boolean }>()

watch(isOpen, (value) => {
  if (value) {
    modalRef.value?.showModal()
  } else {
    modalRef.value?.close()
  }
})
</script>
