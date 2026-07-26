<template>
  <DialogWrapper
    v-model="proxyGroupChainModalOpen"
    :title="proxyGroupChainTarget"
    :no-padding="true"
    box-class="max-w-160"
  >
    <div class="flex h-[70dvh] max-h-142 flex-col overflow-hidden">
      <div class="shrink-0 p-3 pb-0">
        <ProxyChainPath
          :proxy="proxyGroupChainTarget"
          :selected="selectedProxy"
          :show-now-node="true"
          :show-latency="true"
          @update:selected="selectedProxy = $event"
        />
      </div>
      <div
        class="flex flex-1 flex-col overflow-y-auto"
        :class="PROXIES_PARENT_CLASS"
      >
        <ProxyGroupPanel :name="selectedProxy || proxyGroupChainTarget" />
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import ProxyChainPath from '@/components/common/ProxyChainPath.vue'
import ProxyGroupPanel from '@/components/proxies/ProxyGroupPanel.vue'
import {
  closeProxyGroupChain,
  proxyGroupChainModalOpen,
  proxyGroupChainTarget,
} from '@/composables/proxyGroupChain'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
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
