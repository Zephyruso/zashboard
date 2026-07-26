<template>
  <div
    v-if="settingsEditMode || hasOwnLabel"
    class="text-base-content/85 mt-1 mb-2.5 flex items-center gap-2 px-1 text-base font-semibold tracking-tight"
  >
    <SettingVisibilityToggle :setting-key="item.key" />
    <span class="flex-1">{{ $t(item.label) }}</span>
    <template v-if="settingsEditMode">
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-circle"
        :title="$t('moveUp')"
        @click="moveSettingsCategory(item.key, -1)"
      >
        <ChevronUpIcon class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-circle"
        :title="$t('moveDown')"
        @click="moveSettingsCategory(item.key, 1)"
      >
        <ChevronDownIcon class="h-4 w-4" />
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import SettingVisibilityToggle from '@/components/settings/SettingVisibilityToggle.vue'
import { moveSettingsCategory, settingsEditMode } from '@/composables/settings'
import { SETTINGS_MENU_KEY } from '@/constant'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'

const props = defineProps<{
  item: {
    key: SETTINGS_MENU_KEY
    label: string
  }
}>()

// general / backend 分类自带标题，非编辑模式下不重复显示分类标题
const hasOwnLabel = computed(
  () => ![SETTINGS_MENU_KEY.general, SETTINGS_MENU_KEY.backend].includes(props.item.key),
)
</script>
