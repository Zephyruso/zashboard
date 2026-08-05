<template>
  <div class="relative flex h-full min-h-0 flex-col">
    <CtrlsBar>
      <div class="flex items-center gap-2 p-2">
        <SegmentedControl
          v-model="activeTab"
          :options="tabOptions"
        />
      </div>
    </CtrlsBar>

    <div
      class="min-h-0 flex-1 overflow-y-auto"
      :style="padding"
    >
      <KeepAlive>
        <NetworkToolsPanel v-if="activeTab === TOOLS_TAB_TYPE.network" />
        <UsbipPanel
          v-else-if="activeTab === TOOLS_TAB_TYPE.usbip"
          :servers="usbipServers"
        />
        <OpenVPNPanel
          v-else-if="activeTab === TOOLS_TAB_TYPE.openvpn"
          :endpoints="openvpnEndpoints"
        />
        <TailscalePanel
          v-else
          :endpoints="tailscaleEndpoints"
          @ssh="openSSH"
        />
      </KeepAlive>
    </div>

    <!-- SSH terminal overlay: only reachable by connecting to a Tailscale peer.
         While open, TerminalPanel tracks the visual viewport (useViewportHeight),
         so this content area already shrinks above the soft keyboard. -->
    <div
      v-if="sshSession"
      class="absolute inset-0 z-200"
    >
      <TerminalPanel
        :launch="sshSession"
        @close="sshSession = undefined"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSingboxClient, runStream, serverStream } from '@/assembly/tools'
import { can } from '@/assembly/backend'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import SegmentedControl, { type SegmentOption } from '@/components/common/SegmentedControl.vue'
import NetworkToolsPanel from '@/components/tools/NetworkToolsPanel.vue'
import OpenVPNPanel from '@/components/tools/OpenVPNPanel.vue'
import TailscalePanel from '@/components/tools/TailscalePanel.vue'
import TerminalPanel from '@/components/tools/TerminalPanel.vue'
import UsbipPanel from '@/components/tools/UsbipPanel.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import type { SSHSessionOptions } from '@/composables/tailscaleSSH'
import {
  StartedService,
  type OpenVPNEndpointStatus,
  type TailscaleEndpointStatus,
  type USBIPServerStatus,
} from '@/gen/daemon/started_service_pb'
import {
  CpuChipIcon,
  ShareIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

enum TOOLS_TAB_TYPE {
  network = 'tools',
  usbip = 'usbip',
  openvpn = 'openvpn',
  tailscale = 'tailscale',
}

const { t } = useI18n()

const activeTab = ref<string>(TOOLS_TAB_TYPE.network)

const usbipSupported = computed(() => can('usbip'))
const openvpnSupported = computed(() => can('openvpn'))

const tailscaleEndpoints = ref<TailscaleEndpointStatus[]>([])
const openvpnEndpoints = ref<OpenVPNEndpointStatus[]>([])
const usbipServers = ref<USBIPServerStatus[]>([])

// Keep the status subscriptions at page level: the service tabs cannot mount
// first to discover whether they should be visible. Each effect also restarts
// its stream when the active sing-box backend changes.
watchEffect((onCleanup) => {
  tailscaleEndpoints.value = []
  if (!getSingboxClient()) return

  const handle = runStream(
    (signal) => serverStream(StartedService.method.subscribeTailscaleStatus, {}, signal),
    (message) => (tailscaleEndpoints.value = message.endpoints),
  )
  onCleanup(handle.close)
})

watchEffect((onCleanup) => {
  openvpnEndpoints.value = []
  if (!openvpnSupported.value || !getSingboxClient()) return

  const handle = runStream(
    (signal) => serverStream(StartedService.method.subscribeOpenVPNStatus, {}, signal),
    (message) => (openvpnEndpoints.value = message.endpoints),
  )
  onCleanup(handle.close)
})

watchEffect((onCleanup) => {
  usbipServers.value = []
  if (!usbipSupported.value || !getSingboxClient()) return

  const handle = runStream(
    (signal) => serverStream(StartedService.method.subscribeUSBIPServerStatus, {}, signal),
    (message) => (usbipServers.value = message.servers),
  )
  onCleanup(handle.close)
})

const tabOptions = computed<SegmentOption[]>(() => [
  { value: TOOLS_TAB_TYPE.network, label: t(TOOLS_TAB_TYPE.network), icon: WrenchScrewdriverIcon },
  ...(tailscaleEndpoints.value.length > 0
    ? [{ value: TOOLS_TAB_TYPE.tailscale, label: t(TOOLS_TAB_TYPE.tailscale), icon: ShareIcon }]
    : []),
  ...(openvpnSupported.value && openvpnEndpoints.value.length > 0
    ? [{ value: TOOLS_TAB_TYPE.openvpn, label: t(TOOLS_TAB_TYPE.openvpn), icon: ShieldCheckIcon }]
    : []),
  ...(usbipSupported.value && usbipServers.value.length > 0
    ? [{ value: TOOLS_TAB_TYPE.usbip, label: t(TOOLS_TAB_TYPE.usbip), icon: CpuChipIcon }]
    : []),
])

// A service may disappear after a reload or backend switch. Never leave the
// segmented control pointing at a tab that is no longer rendered.
watch(tabOptions, (options) => {
  if (!options.some((option) => option.value === activeTab.value)) {
    activeTab.value = TOOLS_TAB_TYPE.network
  }
})

// On mobile the CtrlsBar floats fixed over the top, so the scroll area needs
// padding to keep its content clear of the bar.
const { padding } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 8,
})

// The terminal is reachable only by launching SSH from a Tailscale peer; it
// opens as an overlay over the tools page and closing it returns here. The
// `seq` re-mounts the terminal even when connecting to the same peer again.
const sshSession = ref<SSHSessionOptions & { seq: number }>()
const openSSH = (session: SSHSessionOptions) => {
  sshSession.value = { ...session, seq: (sshSession.value?.seq ?? 0) + 1 }
}
</script>
