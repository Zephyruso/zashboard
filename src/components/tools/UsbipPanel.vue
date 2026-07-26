<template>
  <div class="mx-auto flex max-w-2xl flex-col p-2 sm:p-4">
    <div
      v-if="servers.length === 0"
      class="text-base-content/50 p-12 text-center text-sm"
    >
      {{ $t('usbipNoServer') }}
    </div>

    <UsbipServerPanel
      v-for="server in servers"
      :key="server.serverTag"
      :server="server"
      :multi-tag="servers.length > 1"
    />
  </div>
</template>

<script setup lang="ts">
import { getSingboxClient, runStream, serverStream, type StreamHandle } from '@/assembly/tools'
import UsbipServerPanel from '@/components/tools/UsbipServerPanel.vue'
import { StartedService, type USBIPServerStatus } from '@/gen/daemon/started_service_pb'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const servers = ref<USBIPServerStatus[]>([])
let statusHandle: StreamHandle | null = null

onMounted(() => {
  if (!getSingboxClient()) return
  statusHandle = runStream(
    (signal) => serverStream(StartedService.method.subscribeUSBIPServerStatus, {}, signal),
    (msg) => (servers.value = msg.servers),
  )
})

onBeforeUnmount(() => statusHandle?.close())
</script>
