<template>
  <Teleport to="#app-content">
    <Transition name="modal">
      <div
        v-show="isOpen"
        ref="backdropRef"
        class="modal modal-open"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'dialog-title' : undefined"
        @keydown.escape="close"
      >
        <!-- 遮罩层，点击关闭 -->
        <div
          class="modal-backdrop w-screen"
          aria-hidden="true"
          @click="close"
        />

        <!-- 弹层内容，阻止点击穿透 -->
        <div
          ref="modalBoxRef"
          class="modal-box bg-base-100 relative overflow-hidden p-0"
          :class="[blurIntensity < 5 && 'backdrop-blur-sm!', boxClass]"
          tabindex="-1"
          @click.stop
          @keydown.enter.self="enter"
        >
          <div
            v-if="title && isOpen"
            id="dialog-title"
            class="border-base-content/10 relative border-b px-4 py-2 text-base font-bold"
          >
            {{ title }}
            <slot name="title-right" />
            <button
              type="button"
              class="btn btn-circle btn-ghost btn-xs absolute top-2 right-2"
              aria-label="close"
              @click="close"
            >
              <XMarkIcon class="h-4 w-4" />
            </button>
          </div>
          <div
            v-if="isOpen"
            class="max-h-[90dvh] overflow-y-auto max-md:max-h-[70dvh]"
            :class="noPadding ? 'p-0' : 'p-4'"
          >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { blurIntensity } from '@/store/settings'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { ref, watch } from 'vue'

const isOpen = defineModel<boolean>()
defineProps<{ noPadding?: boolean; boxClass?: string; title?: string }>()
const emits = defineEmits<{
  (e: 'enter'): void
}>()

const modalBoxRef = ref<HTMLDivElement | undefined>(undefined)

watch(isOpen, (val) => {
  if (val) {
    requestAnimationFrame(() => {
      modalBoxRef.value?.focus()
    })
  }
})
function close() {
  isOpen.value = false
}
function enter() {
  emits('enter')
}
</script>

<style scoped>
/* 进入/离开过渡 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-backdrop,
.modal-leave-active .modal-backdrop {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-backdrop,
.modal-leave-to .modal-backdrop {
  opacity: 0;
}
.modal-enter-active .modal-box,
.modal-leave-active .modal-box {
  transition: transform 0.2s ease;
}
.modal-enter-from .modal-box,
.modal-leave-to .modal-box {
  transform: scale(0.95);
}
</style>
