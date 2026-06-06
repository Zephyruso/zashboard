<template>
  <div :class="wrapperClass">
    <button
      class="btn btn-circle btn-sm touch-target"
      :aria-label="$t('backendSelector')"
      @click="showBackendSelectorDialog = true"
      @mouseenter="handlerMouseenterBackendSelector"
    >
      <ServerIcon
        class="h-5 w-5"
        aria-hidden="true"
      />
    </button>
    <button
      class="btn btn-circle btn-sm touch-target"
      :aria-label="$t('toggleSidebar')"
      @click="isSidebarCollapsed = !isSidebarCollapsed"
    >
      <component
        :is="isSidebarCollapsed ? ArrowRightCircleIcon : ArrowLeftCircleIcon"
        class="h-5 w-5"
        aria-hidden="true"
      />
    </button>
  </div>

  <DialogWrapper
    v-model="showBackendSelectorDialog"
    box-class="max-w-173"
    no-padding
  >
    <div class="bg-base-200 size-full p-4">
      <BackendSettings />
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import BackendSettings from '@/components/settings/backend/BackendSettings.vue'
import { useTooltip } from '@/helper/tooltip'
import { getLabelFromBackend } from '@/helper/utils'
import { isSidebarCollapsed } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import { ArrowLeftCircleIcon, ArrowRightCircleIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'

const { showTip } = useTooltip()

const showBackendSelectorDialog = ref(false)
const props = defineProps<{
  vertical?: boolean
}>()

const wrapperClass = computed(() => {
  return props.vertical
    ? 'flex flex-col items-center justify-center gap-2'
    : 'flex flex-row-reverse items-center justify-center gap-2'
})

const handlerMouseenterBackendSelector = (e: MouseEvent) => {
  if (!activeBackend.value) return

  showTip(e, getLabelFromBackend(activeBackend.value), { placement: 'right' })
}
</script>
