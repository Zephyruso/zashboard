<template>
  <Teleport to="#app-content">
    <Transition name="modal">
      <div
        v-show="isOpen"
        ref="backdropRef"
        class="modal modal-open"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
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
          class="modal-box glass-panel bg-base-100 relative overflow-hidden p-0 outline-none"
          :class="boxClass"
          tabindex="-1"
          role="document"
          @click.stop
          @keydown.enter.self="enter"
        >
          <div
            v-if="title && isOpen"
            :id="titleId"
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
import { useFocusTrap } from '@/accessibility/focusTrap'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { onBeforeUnmount, ref, useId, watch } from 'vue'

const isOpen = defineModel<boolean>()
defineProps<{ noPadding?: boolean; boxClass?: string; title?: string }>()
const emits = defineEmits<{
  (e: 'enter'): void
}>()

const modalBoxRef = ref<HTMLDivElement | null>(null)
const titleId = useId()
let focusFrame: number | undefined

useFocusTrap(modalBoxRef, {
  active: isOpen,
  onEscape: () => {
    isOpen.value = false
  },
})

watch(isOpen, (val) => {
  if (focusFrame !== undefined) {
    cancelAnimationFrame(focusFrame)
    focusFrame = undefined
  }
  if (val) {
    focusFrame = requestAnimationFrame(() => {
      focusFrame = undefined
      modalBoxRef.value?.focus()
    })
  }
})

onBeforeUnmount(() => {
  if (focusFrame !== undefined) {
    cancelAnimationFrame(focusFrame)
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
/* iOS-style modal: spring scale on desktop, slide-up sheet on small screens. */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--ios-duration-base, 0.3s) var(--ios-ease, cubic-bezier(0.4, 0, 0.2, 1));
}
.modal-enter-active .modal-backdrop,
.modal-leave-active .modal-backdrop {
  transition: opacity var(--ios-duration-base, 0.3s) var(--ios-ease, cubic-bezier(0.4, 0, 0.2, 1));
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
  transition:
    transform var(--ios-duration-base, 0.3s) var(--ios-spring, cubic-bezier(0.32, 0.72, 0, 1)),
    opacity var(--ios-duration-fast, 0.18s) ease;
}
.modal-enter-from .modal-box,
.modal-leave-to .modal-box {
  transform: scale(0.96);
  opacity: 0;
}

@media (max-width: 767px) {
  .modal-enter-from .modal-box,
  .modal-leave-to .modal-box {
    transform: translateY(24px) scale(0.98);
  }
}
</style>
