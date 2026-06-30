<template>
  <DialogWrapper
    v-model="isOpen"
    :title="rootName"
    :no-padding="true"
    box-class="max-w-160"
  >
    <div class="flex max-h-[70dvh] flex-col overflow-hidden">
      <div class="shrink-0 p-3">
        <ProxyChainPath
          :proxy="rootName"
          :selected="selectedProxy"
          :show-now-node="true"
          :show-latency="true"
          @update:selected="selectedProxy = $event"
        />
      </div>
      <div class="flex flex-1 flex-col overflow-y-auto">
        <ProxyGroup
          :name="selectedProxy || rootName"
          :force-open="true"
          class="transparent-collapse rounded-none!"
        />
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import ProxyChainPath from '@/components/common/ProxyChainPath.vue'
import ProxyGroup from '@/components/proxies/ProxyGroup.vue'
import { closeProxyGroupChain, proxyGroupChainTarget } from '@/composables/proxyGroupChain'
import { computed, ref, watch } from 'vue'

const rootName = computed(() => proxyGroupChainTarget.value)
const selectedProxy = ref('')

const isOpen = computed({
  get: () => Boolean(proxyGroupChainTarget.value),
  set: (val: boolean) => {
    if (!val) {
      closeProxyGroupChain()
    }
  },
})

watch(
  rootName,
  (name) => {
    selectedProxy.value = name || ''
  },
  { immediate: true },
)
</script>
