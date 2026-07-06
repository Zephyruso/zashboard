<template>
  <DialogWrapper
    v-model="proxyGroupChainModalOpen"
    :title="proxyGroupChainTarget"
    :no-padding="true"
    box-class="max-w-160"
  >
    <div class="flex max-h-[70dvh] flex-col overflow-hidden">
      <div class="shrink-0 p-3 pb-0">
        <ProxyChainPath
          :proxy="proxyGroupChainTarget"
          :selected="selectedProxy"
          :show-now-node="true"
          :show-latency="true"
          @update:selected="selectedProxy = $event"
        />
      </div>
      <div class="flex flex-1 flex-col overflow-y-auto">
        <ProxyGroup
          :name="selectedProxy || proxyGroupChainTarget"
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
import {
  closeProxyGroupChain,
  proxyGroupChainModalOpen,
  proxyGroupChainTarget,
} from '@/composables/proxyGroupChain'
import { ref, watch } from 'vue'
import { proxyMap } from '@/assembly/proxies'

const selectedProxy = ref('')

watch(
  () => proxyGroupChainModalOpen.value,
  (isOpen) => {
    if (!isOpen) {
      closeProxyGroupChain()
    } else {
      selectedProxy.value = proxyMap.value[proxyGroupChainTarget.value]?.now
    }
  },
)
</script>
