<template>
  <DialogWrapper v-model="isVisible">
    <div class="flex flex-col gap-4">
      <h3 class="text-lg font-bold">{{ $t('deleteProfile') }}</h3>
      <p class="text-base-content/70">
        {{ $t('deleteProfileConfirm', { name: profile?.name || '' }) }}
      </p>
      <div class="flex justify-end gap-2">
        <button
          class="btn btn-sm"
          @click="handleCancel"
        >
          {{ $t('cancel') }}
        </button>
        <button
          class="btn btn-error btn-sm"
          @click="handleConfirm"
        >
          {{ $t('delete') }}
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import type { Profile } from '@main/shared/type'
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  profile?: Profile | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const handleCancel = () => {
  isVisible.value = false
}

const handleConfirm = () => {
  emit('confirm')
  isVisible.value = false
}
</script>
