<template>
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="text-lg font-bold">{{ $t('binaryInstallRequired') }}</h3>
      <p class="py-4">{{ $t('binaryInstallDescription') }}</p>
      <div class="modal-action">
        <button
          class="btn btn-primary"
          @click="handleConfirm"
        >
          {{ $t('installNow') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const handleConfirm = () => {
  emit('confirm')
}
</script>
