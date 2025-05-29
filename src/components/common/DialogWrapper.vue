<template>
  <dialog
    ref="modalRef"
    class="modal"
    @close="isOpen = false"
  >
    <form
      method="dialog"
      class="modal-backdrop w-screen transition-[backdrop-filter]"
      :class="isOpen ? 'backdrop-blur-sm' : 'backdrop-blur-none'"
    >
      <button class="!outline-none">close</button>
    </form>
    <div
      class="modal-box relative max-h-[90dvh] overflow-hidden p-0 max-md:max-h-[70dvh]"
      :class="blurIntensity < 5 && 'backdrop-blur-sm!'"
    >
      <form
        v-if="!noCloseButton"
        method="dialog"
      >
        <button class="btn btn-circle btn-ghost btn-xs absolute top-1 right-1 z-10">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </form>
      <div
        v-if="isOpen"
        :class="['max-h-[90dvh] overflow-y-auto max-md:max-h-[70dvh]', noPadding ? 'p-0' : 'p-4']"
      >
        <slot />
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { blurIntensity } from '@renderer/store/settings'
import { ref, watch } from 'vue'

const modalRef = ref<HTMLDialogElement>()
const isOpen = defineModel<boolean>()
defineProps<{ noPadding?: boolean; noCloseButton?: boolean }>()

watch(isOpen, (value) => {
  if (value) {
    modalRef.value?.showModal()
  } else {
    modalRef.value?.close()
  }
})
</script>
