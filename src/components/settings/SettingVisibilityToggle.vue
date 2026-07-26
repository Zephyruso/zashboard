<template>
  <VisibilityToggle
    v-if="settingsEditMode"
    :hidden="isHidden"
    :data-hidden="isHidden"
    :title="$t('settingsVisibility')"
    @toggle="handleToggle"
  />
</template>

<script setup lang="ts">
import { isSettingHidden, settingsEditMode, toggleSettingHidden } from '@/composables/settings'
import { computed, ref } from 'vue'
import VisibilityToggle from '@/components/common/VisibilityToggle.vue'

const props = defineProps<{
  settingKey: string
}>()

const isHidden = computed(() => isSettingHidden(props.settingKey))

const isToggling = ref(false)
const handleToggle = () => {
  if (isToggling.value) return
  isToggling.value = true
  toggleSettingHidden(props.settingKey)
  window.setTimeout(() => {
    isToggling.value = false
  }, 180)
}
</script>
