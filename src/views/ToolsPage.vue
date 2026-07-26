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
        <UsbipPanel v-else-if="activeTab === TOOLS_TAB_TYPE.usbip" />
        <OpenVPNPanel v-else-if="activeTab === TOOLS_TAB_TYPE.openvpn" />
        <TailscalePanel
          v-else
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
import { singboxApiVersion } from '@/assembly/version'
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
  CpuChipIcon,
  ShareIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

enum TOOLS_TAB_TYPE {
  network = 'tools',
  usbip = 'usbip',
  openvpn = 'openvpn',
  tailscale = 'tailscale',
}

// usbip requires the sing-box gRPC API version 2 (ProvideUSBDevices stream).
const USBIP_MIN_API_VERSION = 2
// OpenVPN requires the sing-box gRPC API version 3 (SubscribeOpenVPNStatus stream).
const OPENVPN_MIN_API_VERSION = 3

const { t } = useI18n()

const activeTab = ref<string>(TOOLS_TAB_TYPE.network)

const usbipSupported = computed(() => singboxApiVersion.value >= USBIP_MIN_API_VERSION)
const openvpnSupported = computed(() => singboxApiVersion.value >= OPENVPN_MIN_API_VERSION)

const tabOptions = computed<SegmentOption[]>(() => [
  { value: TOOLS_TAB_TYPE.network, label: t(TOOLS_TAB_TYPE.network), icon: WrenchScrewdriverIcon },
  { value: TOOLS_TAB_TYPE.tailscale, label: t(TOOLS_TAB_TYPE.tailscale), icon: ShareIcon },
  ...(openvpnSupported.value
    ? [{ value: TOOLS_TAB_TYPE.openvpn, label: t(TOOLS_TAB_TYPE.openvpn), icon: ShieldCheckIcon }]
    : []),
  ...(usbipSupported.value
    ? [{ value: TOOLS_TAB_TYPE.usbip, label: t(TOOLS_TAB_TYPE.usbip), icon: CpuChipIcon }]
    : []),
])

// If the active tab disappears (e.g. capability dropped after a backend
// switch), fall back to the network tab.
watch([usbipSupported, openvpnSupported], () => {
  if (!usbipSupported.value && activeTab.value === TOOLS_TAB_TYPE.usbip) {
    activeTab.value = TOOLS_TAB_TYPE.network
  }
  if (!openvpnSupported.value && activeTab.value === TOOLS_TAB_TYPE.openvpn) {
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
