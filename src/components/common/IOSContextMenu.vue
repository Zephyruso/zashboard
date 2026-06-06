<template>
  <Teleport to="body">
    <Transition name="ios-action-sheet">
      <div
        v-if="modelValue"
        class="ios-action-sheet-root fixed inset-0 z-[60] flex flex-col justify-end"
      >
        <div
          class="ios-action-sheet-backdrop absolute inset-0"
          @click="close"
        />
        <div
          class="relative z-10 flex flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        >
          <div
            v-if="title || description"
            class="ios-action-sheet-header glass-panel"
          >
            <div
              v-if="title"
              class="text-base-content/55 px-3 pt-2 text-center text-[13px]"
            >
              {{ title }}
            </div>
            <div
              v-if="description"
              class="text-base-content/40 px-3 pb-2 text-center text-[12px]"
            >
              {{ description }}
            </div>
          </div>
          <div class="ios-action-sheet-card glass-panel overflow-hidden">
            <button
              v-for="(action, index) in actions"
              :key="action.id"
              class="ios-action-sheet-row"
              :class="{
                'ios-action-sheet-row--destructive': action.destructive,
                'ios-action-sheet-row--separator': index !== actions.length - 1,
              }"
              :disabled="action.disabled"
              @click="handle(action)"
            >
              <component
                :is="action.icon"
                v-if="action.icon"
                class="h-5 w-5 shrink-0 opacity-80"
              />
              <span class="flex-1 text-left">{{ action.label }}</span>
            </button>
          </div>
          <button
            class="ios-action-sheet-card glass-panel ios-action-sheet-row ios-action-sheet-row--cancel"
            @click="close"
          >
            <span class="flex-1 text-center font-semibold">{{ cancelLabel }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'
import { computed, onBeforeUnmount, watch } from 'vue'

export interface IOSContextAction {
  id: string
  label: string
  icon?: Component
  destructive?: boolean
  disabled?: boolean
  onSelect?: () => void | Promise<void>
}

const props = defineProps<{
  modelValue: boolean
  actions: IOSContextAction[]
  title?: string
  description?: string
  cancel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', action: IOSContextAction): void
}>()

const { t } = useI18n()
const cancelLabel = computed(() => props.cancel ?? t('cancel'))
let bodyLockCount = 0
let previousBodyOverflow: string | null = null

const lockBodyScroll = () => {
  if (typeof document === 'undefined') return
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.setProperty('overflow', 'hidden')
  }
  bodyLockCount += 1
}

const unlockBodyScroll = () => {
  if (typeof document === 'undefined' || bodyLockCount === 0) return
  bodyLockCount -= 1
  if (bodyLockCount > 0) return
  if (previousBodyOverflow) {
    document.body.style.setProperty('overflow', previousBodyOverflow)
  } else {
    document.body.style.removeProperty('overflow')
  }
  previousBodyOverflow = null
}

const close = () => emit('update:modelValue', false)

const handle = async (action: IOSContextAction) => {
  if (action.disabled) return
  emit('select', action)
  close()
  try {
    await action.onSelect?.()
  } catch (err) {
    // Surface the failure to the console so callers can diagnose it without
    // forcing every action handler to wrap its own try/catch. We do not rethrow
    // so a single failing action cannot leave the sheet stuck mid-transition.
    console.error('[IOSContextMenu] action failed:', action.id, err)
  }
}

// Lock body scroll while the sheet is open so the backdrop tap area is reliable.
watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    if (open) {
      lockBodyScroll()
    } else {
      unlockBodyScroll()
    }
  },
)

// Escape closes the sheet on desktop / keyboard users.
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) close()
}
watch(
  () => props.modelValue,
  (open) => {
    if (typeof window === 'undefined') return
    if (open) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

// Always release the lock if the host unmounts while the sheet is still open
// (e.g. parent component is removed mid-route-transition).
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
  if (props.modelValue) unlockBodyScroll()
})
</script>

<style scoped>
.ios-action-sheet-backdrop {
  background: color-mix(in srgb, var(--color-base-300) 55%, transparent);
  backdrop-filter: blur(var(--glass-blur-radius, var(--blur-radius, 20px)))
    saturate(var(--glass-saturation, 180%));
  -webkit-backdrop-filter: blur(var(--glass-blur-radius, var(--blur-radius, 20px)))
    saturate(var(--glass-saturation, 180%));
}

.ios-action-sheet-card {
  border-radius: var(--ios-radius-lg, 16px);
  background: color-mix(
    in srgb,
    var(--color-base-100) var(--glass-tint, var(--bg-tint, 82%)),
    transparent
  );
  backdrop-filter: blur(var(--glass-blur-radius, var(--blur-radius, 20px)))
    saturate(var(--glass-saturation, 180%));
  -webkit-backdrop-filter: blur(var(--glass-blur-radius, var(--blur-radius, 20px)))
    saturate(var(--glass-saturation, 180%));
  box-shadow: var(--ios-shadow-elevated, 0 4px 12px rgba(0, 0, 0, 0.08));
  border: 0.5px solid color-mix(in srgb, var(--color-base-content) 6%, transparent);
}

.ios-action-sheet-header {
  border-radius: var(--ios-radius-lg, 16px);
  background: color-mix(
    in srgb,
    var(--color-base-100) var(--glass-tint, var(--bg-tint, 82%)),
    transparent
  );
  backdrop-filter: blur(var(--glass-blur-radius, var(--blur-radius, 20px)))
    saturate(var(--glass-saturation, 180%));
  -webkit-backdrop-filter: blur(var(--glass-blur-radius, var(--blur-radius, 20px)))
    saturate(var(--glass-saturation, 180%));
  border: 0.5px solid color-mix(in srgb, var(--color-base-content) 6%, transparent);
}

.ios-action-sheet-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  font-size: 17px;
  color: var(--ios-system-blue);
  background: transparent;
  transition: background-color 0.18s var(--ios-ease, cubic-bezier(0.4, 0, 0.2, 1));
}

.ios-action-sheet-row:active {
  background: color-mix(in srgb, var(--color-base-content) 8%, transparent);
}

.ios-action-sheet-row--separator {
  border-bottom: 0.5px solid color-mix(in srgb, var(--color-base-content) 10%, transparent);
}

.ios-action-sheet-row--destructive {
  color: var(--ios-system-red);
}

.ios-action-sheet-row--cancel {
  color: var(--ios-system-blue);
  margin-top: 4px;
}

.ios-action-sheet-row[disabled] {
  opacity: 0.4;
  pointer-events: none;
}

.ios-action-sheet-enter-active,
.ios-action-sheet-leave-active {
  transition: opacity var(--ios-duration-base, 0.3s) var(--ios-ease, cubic-bezier(0.4, 0, 0.2, 1));
}
.ios-action-sheet-enter-active .ios-action-sheet-card,
.ios-action-sheet-enter-active .ios-action-sheet-header,
.ios-action-sheet-leave-active .ios-action-sheet-card,
.ios-action-sheet-leave-active .ios-action-sheet-header {
  transition: transform var(--ios-duration-base, 0.3s)
    var(--ios-spring, cubic-bezier(0.32, 0.72, 0, 1));
}
.ios-action-sheet-enter-from,
.ios-action-sheet-leave-to {
  opacity: 0;
}
.ios-action-sheet-enter-from .ios-action-sheet-card,
.ios-action-sheet-enter-from .ios-action-sheet-header,
.ios-action-sheet-leave-to .ios-action-sheet-card,
.ios-action-sheet-leave-to .ios-action-sheet-header {
  transform: translateY(48px);
}
</style>
