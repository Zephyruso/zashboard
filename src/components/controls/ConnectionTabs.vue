<template>
  <SegmentedControl
    v-model="connectionTabShow"
    :options="tabOptions"
    :block="!horizental"
  />
</template>

<script setup lang="ts">
import { CONNECTION_TAB_TYPE } from '@/constant'
import { connections, connectionTabShow, renderConnections } from '@/store/connections'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SegmentedControl from '../common/SegmentedControl.vue'

defineProps({
  horizental: {
    type: Boolean,
    default: true,
  },
})

const { t } = useI18n()
const connectionsCount = computed(() => {
  if (renderConnections.value.length !== connections.value.length) {
    return `${renderConnections.value.length} / ${connections.value.length}`
  }

  return connections.value.length
})

const tabOptions = computed(() =>
  Object.values(CONNECTION_TAB_TYPE).map((tab) => ({
    value: tab,
    label: t(tab),
    count: connectionTabShow.value === tab ? connectionsCount.value : undefined,
  })),
)
</script>
