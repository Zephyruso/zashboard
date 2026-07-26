<template>
  <div
    v-if="shouldRender"
    class="setting-item"
  >
    <SettingVisibilityToggle :setting-key="settingKey" />
    <slot />
  </div>
</template>

<script setup lang="ts">
import SettingVisibilityToggle from '@/components/settings/SettingVisibilityToggle.vue'
import { useIsSettingVisible } from '@/composables/settings'
import { computed, toRef } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 该设置项在显隐配置中的 key */
    settingKey: string
    /** 额外的前置条件，为 false 时该项始终不渲染（如依赖于其他开关） */
    when?: boolean
  }>(),
  { when: true },
)

const visible = useIsSettingVisible(toRef(props, 'settingKey'))
const shouldRender = computed(() => props.when && visible.value)
</script>
