<template>
  <div class="mx-auto flex max-w-2xl flex-col p-2 sm:p-4">
    <div
      v-if="endpoints.length === 0"
      class="text-base-content/50 p-12 text-center text-sm"
    >
      {{ $t('noEndpoints') }}
    </div>

    <template
      v-for="endpoint in endpoints"
      :key="endpoint.endpointTag"
    >
      <!-- Endpoint header -->
      <div class="settings-section-label flex items-center justify-between gap-2 normal-case">
        <span class="flex items-center gap-2 tracking-normal">
          <span class="text-base-content/90 text-sm font-semibold">
            {{ endpoint.endpointTag || 'Tailscale' }}
          </span>
          <span
            class="rounded-full px-2 py-0.5 text-[0.65rem] font-medium tracking-normal"
            :class="statePill(endpoint.backendState)"
          >
            {{ endpoint.stateText || endpoint.backendState || $t('unknown') }}
          </span>
        </span>
        <button
          v-if="!endpoint.keyAuth"
          class="text-error/90 hover:text-error flex items-center gap-1 text-xs font-medium tracking-normal"
          @click="logout(endpoint.endpointTag)"
        >
          <ArrowRightOnRectangleIcon class="h-4 w-4" />
          {{ $t('logout') }}
        </button>
      </div>

      <!-- Status group -->
      <div class="settings-grid">
        <button
          v-if="endpoint.self"
          class="setting-item hover:bg-base-content/3 active:bg-base-content/5 w-full text-left transition-colors"
          @click="openPeerDetail(endpoint, endpoint.self, true)"
        >
          <span class="setting-item-label">{{ $t('thisDevice') }}</span>
          <span class="text-base-content/50 truncate text-sm">{{
            peerDisplayName(endpoint.self)
          }}</span>
          <ChevronRightIcon class="text-base-content/25 h-4 w-4 shrink-0" />
        </button>
        <button
          v-if="exitCandidates(endpoint).length > 0"
          class="setting-item hover:bg-base-content/3 active:bg-base-content/5 w-full text-left transition-colors"
          @click="openExitPicker(endpoint)"
        >
          <span class="setting-item-label">{{ $t('exitNode') }}</span>
          <span class="text-base-content/50 truncate text-sm">
            {{ endpoint.exitNode ? peerDisplayName(endpoint.exitNode) : $t('disabledLabel') }}
          </span>
          <ChevronRightIcon class="text-base-content/25 h-4 w-4 shrink-0" />
        </button>
        <div
          v-if="endpoint.networkName"
          class="setting-item"
        >
          <span class="setting-item-label">{{ $t('networkLabel') }}</span>
          <span class="text-base-content/50 truncate text-sm">{{ endpoint.networkName }}</span>
        </div>
        <div
          v-if="endpoint.authURL"
          class="setting-item"
        >
          <span class="setting-item-label shrink-0">{{ $t('authURL') }}</span>
          <a
            :href="endpoint.authURL"
            target="_blank"
            class="link link-primary truncate text-sm"
            >{{ endpoint.authURL }}</a
          >
          <button
            class="text-base-content/40 hover:text-base-content/70 shrink-0 transition-colors"
            :title="$t('showAuthQR')"
            @click="openAuthQR(endpoint)"
          >
            <QrCodeIcon class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Peers grouped by user -->
      <template
        v-for="group in groupsOf(endpoint)"
        :key="group.userID.toString()"
      >
        <div class="settings-section-label">
          {{ group.displayName || group.loginName || $t('peers') }}
        </div>
        <div class="settings-grid">
          <div
            v-for="peer in group.peers"
            :key="peer.stableID"
            class="setting-item"
          >
            <button
              class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              @click="openPeerDetail(endpoint, peer, false)"
            >
              <span
                class="inline-block h-2 w-2 shrink-0 rounded-full"
                :class="peer.online ? 'bg-success' : 'bg-base-content/20'"
              ></span>
              <span class="truncate text-sm font-medium">{{ peerDisplayName(peer) }}</span>
              <span class="text-base-content/40 truncate text-xs">{{ peer.tailscaleIPs[0] }}</span>
            </button>
            <span
              v-if="peer.exitNode || peer.exitNodeOption"
              class="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
              :class="peer.exitNode ? 'bg-primary/15 text-primary' : 'bg-info/15 text-info'"
              >{{ $t('exitNode') }}</span
            >
            <span
              v-if="peer.shareeNode"
              class="bg-base-content/8 text-base-content/60 shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
              >{{ $t('sharedIn') }}</span
            >
            <span
              v-if="peer.expired"
              class="bg-error/15 text-error shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
              >{{ $t('expired') }}</span
            >
            <button
              v-if="peerSSHAvailable(peer)"
              class="text-primary hover:bg-primary/10 shrink-0 rounded-md p-1 transition-colors"
              :title="$t('connectViaSSH')"
              @click="connectSSH(endpoint, peer)"
            >
              <CommandLineIcon class="h-4 w-4" />
            </button>
            <ChevronRightIcon
              class="text-base-content/25 h-4 w-4 shrink-0 cursor-pointer"
              @click="openPeerDetail(endpoint, peer, false)"
            />
          </div>
        </div>
      </template>
    </template>

    <!-- Dialogs -->
    <TailscalePeerDialog
      v-if="peerDetail"
      v-model="peerDetailOpen"
      :endpoint="peerDetail.endpoint"
      :peer="peerDetail.peer"
      :is-self="peerDetail.isSelf"
      @connect-ssh="onPeerDetailConnectSSH"
      @edit-ssh="onPeerDetailEditSSH"
    />
    <TailscaleExitNodeDialog
      v-if="exitPicker"
      v-model="exitPickerOpen"
      :endpoint="exitPicker.endpoint"
      :candidates="exitPicker.candidates"
    />
    <TailscaleSSHDialog
      v-if="sshPrompt"
      v-model="sshPromptOpen"
      :peer="sshPrompt.peer"
      @connect="onSSHPromptConnect"
    />
    <DialogWrapper
      v-model="authQROpen"
      :title="$t('authURL')"
    >
      <div
        v-if="authQR"
        class="flex flex-col items-center gap-3"
      >
        <QRCodeView :value="authQR.authURL" />
        <a
          :href="authQR.authURL"
          target="_blank"
          class="link link-primary text-xs break-all"
          >{{ authQR.authURL }}</a
        >
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import { getSingboxClient, runStream, serverStream, type StreamHandle } from '@/assembly/tools'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import QRCodeView from '@/components/tools/QRCodeView.vue'
import TailscaleExitNodeDialog from '@/components/tools/TailscaleExitNodeDialog.vue'
import TailscalePeerDialog from '@/components/tools/TailscalePeerDialog.vue'
import TailscaleSSHDialog from '@/components/tools/TailscaleSSHDialog.vue'
import {
  buildSSHSession,
  peerDisplayName,
  peerSSHAvailable,
  saveSSHPrefs,
  sshPrefs,
  type SSHSessionOptions,
} from '@/composables/tailscaleSSH'
import {
  StartedService,
  type TailscaleEndpointStatus,
  type TailscalePeer,
  type TailscaleUserGroup,
} from '@/gen/daemon/started_service_pb'
import {
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CommandLineIcon,
  QrCodeIcon,
} from '@heroicons/vue/24/outline'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{ ssh: [session: SSHSessionOptions] }>()

const endpoints = ref<TailscaleEndpointStatus[]>([])
let statusHandle: StreamHandle | null = null

const groupsOf = (endpoint: TailscaleEndpointStatus): TailscaleUserGroup[] =>
  endpoint.userGroups.filter((g) => g.peers.length > 0)

const exitCandidates = (endpoint: TailscaleEndpointStatus): TailscalePeer[] =>
  endpoint.backendState === 'Running'
    ? endpoint.userGroups.flatMap((g) => g.peers).filter((p) => p.exitNodeOption)
    : []

const statePill = (state: string): string => {
  switch (state) {
    case 'Running':
      return 'bg-success/15 text-success'
    case 'NeedsLogin':
    case 'NeedsMachineAuth':
      return 'bg-error/15 text-error'
    case 'Starting':
      return 'bg-warning/15 text-warning'
    default:
      return 'bg-base-content/10 text-base-content/60'
  }
}

const logout = (endpointTag: string) => {
  getSingboxClient()?.client.tailscaleLogout({ endpointTag })
}

// --- Dialog state ---
const peerDetail = ref<{
  endpoint: TailscaleEndpointStatus
  peer: TailscalePeer
  isSelf: boolean
}>()
const peerDetailOpen = ref(false)
const openPeerDetail = (
  endpoint: TailscaleEndpointStatus,
  peer: TailscalePeer,
  isSelf: boolean,
) => {
  peerDetail.value = { endpoint, peer, isSelf }
  peerDetailOpen.value = true
}

const exitPicker = ref<{ endpoint: TailscaleEndpointStatus; candidates: TailscalePeer[] }>()
const exitPickerOpen = ref(false)
const openExitPicker = (endpoint: TailscaleEndpointStatus) => {
  exitPicker.value = { endpoint, candidates: exitCandidates(endpoint) }
  exitPickerOpen.value = true
}

const authQR = ref<TailscaleEndpointStatus>()
const authQROpen = ref(false)
const openAuthQR = (endpoint: TailscaleEndpointStatus) => {
  authQR.value = endpoint
  authQROpen.value = true
}

const sshPrompt = ref<{ endpoint: TailscaleEndpointStatus; peer: TailscalePeer }>()
const sshPromptOpen = ref(false)
const openSSHPrompt = (endpoint: TailscaleEndpointStatus, peer: TailscalePeer) => {
  sshPrompt.value = { endpoint, peer }
  sshPromptOpen.value = true
}

// --- SSH launch ---
const launchSSH = (
  endpoint: TailscaleEndpointStatus,
  peer: TailscalePeer,
  username: string,
  terminalType: string,
) => {
  emit('ssh', buildSSHSession(endpoint.endpointTag, peer, username, terminalType))
  peerDetailOpen.value = false
}

const connectSSH = (endpoint: TailscaleEndpointStatus, peer: TailscalePeer) => {
  const prefs = sshPrefs.value[peer.stableID]
  if (prefs?.remember) {
    launchSSH(endpoint, peer, prefs.username, prefs.terminalType)
  } else {
    openSSHPrompt(endpoint, peer)
  }
}

// Triggered from inside the peer detail dialog: close it first so the SSH
// prompt / terminal isn't hidden behind it (both dialogs share one layer).
const onPeerDetailConnectSSH = () => {
  const ctx = peerDetail.value
  if (!ctx) return
  peerDetailOpen.value = false
  connectSSH(ctx.endpoint, ctx.peer)
}

const onPeerDetailEditSSH = () => {
  const ctx = peerDetail.value
  if (!ctx) return
  peerDetailOpen.value = false
  openSSHPrompt(ctx.endpoint, ctx.peer)
}

const onSSHPromptConnect = (username: string, terminalType: string, remember: boolean) => {
  const ctx = sshPrompt.value
  if (!ctx) return
  if (remember) {
    saveSSHPrefs(ctx.peer.stableID, { username, terminalType, remember })
  }
  launchSSH(ctx.endpoint, ctx.peer, username, terminalType)
}

onMounted(() => {
  if (!getSingboxClient()) return
  statusHandle = runStream(
    (signal) => serverStream(StartedService.method.subscribeTailscaleStatus, {}, signal),
    (msg) => (endpoints.value = msg.endpoints),
  )
})

onBeforeUnmount(() => statusHandle?.close())
</script>
