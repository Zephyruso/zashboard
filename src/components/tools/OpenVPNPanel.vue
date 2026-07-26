<template>
  <div class="mx-auto flex max-w-2xl flex-col p-2 sm:p-4">
    <div
      v-if="endpoints.length === 0"
      class="text-base-content/50 p-12 text-center text-sm"
    >
      {{ $t('ovpnNoEndpoints') }}
    </div>

    <template
      v-for="endpoint in endpoints"
      :key="endpoint.endpointTag"
    >
      <!-- Endpoint header -->
      <div class="settings-section-label flex items-center justify-between gap-2 normal-case">
        <span class="flex items-center gap-2 tracking-normal">
          <span class="text-base-content/90 text-sm font-semibold">
            {{ endpoint.endpointTag || 'OpenVPN' }}
          </span>
          <span
            class="rounded-full px-2 py-0.5 text-[0.65rem] font-medium tracking-normal"
            :class="statePill(endpoint.state)"
          >
            {{ endpoint.stateText || endpoint.state || $t('unknown') }}
          </span>
        </span>
      </div>

      <div
        v-if="endpoint.error"
        class="text-error/90 px-1 pb-1 text-xs"
      >
        {{ endpoint.error }}
      </div>

      <!-- Tunnel info -->
      <div
        v-if="endpoint.state === 'connected' && endpoint.tunnelInfo"
        class="settings-grid"
      >
        <div
          v-for="line in tunnelLines(endpoint.tunnelInfo)"
          :key="line.label"
          class="setting-item"
        >
          <span class="setting-item-label shrink-0">{{ line.label }}</span>
          <span
            class="text-base-content/50 truncate text-sm"
            :class="line.mono && 'font-mono'"
            >{{ line.value }}</span
          >
        </div>
      </div>

      <!-- Authentication challenge -->
      <template v-if="activeChallenge(endpoint)">
        <div class="settings-section-label">{{ $t('ovpnAuthentication') }}</div>
        <div class="settings-grid p-3">
          <!-- open-url: link + QR -->
          <template v-if="activeChallenge(endpoint)!.kind === 'open-url'">
            <p
              v-if="activeChallenge(endpoint)!.message"
              class="text-base-content/70 pb-2 text-sm"
            >
              {{ activeChallenge(endpoint)!.message }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <a
                v-if="isHttpUrl(activeChallenge(endpoint)!.url)"
                :href="activeChallenge(endpoint)!.url"
                target="_blank"
                rel="noreferrer"
                class="btn btn-primary btn-sm"
              >
                {{ $t('ovpnOpenAuthURL') }}
              </a>
              <button
                class="btn btn-ghost btn-sm"
                @click="openQR(activeChallenge(endpoint)!.url)"
              >
                <QrCodeIcon class="h-4 w-4" />
                {{ $t('showAuthQR') }}
              </button>
              <button
                class="btn btn-ghost btn-sm"
                @click="cancelChallenge(endpoint.endpointTag, activeChallenge(endpoint)!.id)"
              >
                {{ $t('ovpnCancel') }}
              </button>
            </div>
          </template>

          <!-- credentials / secret form -->
          <OpenVPNAuthForm
            v-else
            :key="activeChallenge(endpoint)!.id"
            :endpoint-tag="endpoint.endpointTag"
            :challenge="activeChallenge(endpoint)!"
          />
        </div>
      </template>
    </template>

    <DialogWrapper
      v-model="qrOpen"
      :title="$t('authURL')"
    >
      <div
        v-if="qrUrl"
        class="flex flex-col items-center gap-3"
      >
        <QRCodeView :value="qrUrl" />
        <a
          :href="qrUrl"
          target="_blank"
          class="link link-primary text-xs break-all"
          >{{ qrUrl }}</a
        >
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import { getSingboxClient, runStream, serverStream, type StreamHandle } from '@/assembly/tools'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import OpenVPNAuthForm from '@/components/tools/OpenVPNAuthForm.vue'
import QRCodeView from '@/components/tools/QRCodeView.vue'
import {
  StartedService,
  type OpenVPNChallenge,
  type OpenVPNEndpointStatus,
  type OpenVPNTunnelInfo,
} from '@/gen/daemon/started_service_pb'
import { fromNow } from '@/helper/utils'
import { QrCodeIcon } from '@heroicons/vue/24/outline'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const endpoints = ref<OpenVPNEndpointStatus[]>([])
let statusHandle: StreamHandle | null = null

const statePill = (state: string): string => {
  switch (state) {
    case 'connected':
      return 'bg-success/15 text-success'
    case 'connecting':
      return 'bg-warning/15 text-warning'
    case 'auth-pending':
    case 'error':
      return 'bg-error/15 text-error'
    default:
      return 'bg-base-content/10 text-base-content/60'
  }
}

// Only render the inline auth card for challenge kinds we can satisfy in a web
// context; unknown kinds are ignored rather than shown as a dead form.
const activeChallenge = (endpoint: OpenVPNEndpointStatus): OpenVPNChallenge | undefined => {
  if (endpoint.state !== 'auth-pending' || !endpoint.challenge) return undefined
  const kind = endpoint.challenge.kind
  return kind === 'open-url' || kind === 'credentials' || kind === 'secret'
    ? endpoint.challenge
    : undefined
}

const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url)

const tunnelLines = (
  info: OpenVPNTunnelInfo,
): { label: string; value: string; mono?: boolean }[] => {
  const lines: { label: string; value: string; mono?: boolean }[] = []
  const push = (label: string, value: string, mono = false) => {
    if (value) lines.push({ label, value, mono })
  }
  push(t('ovpnServer'), info.server, true)
  push(t('ovpnNetwork'), info.network, true)
  push(t('ovpnCipher'), info.cipher, true)
  push(t('ovpnIPv4'), info.ipv4.filter(Boolean).join(', '), true)
  push(t('ovpnIPv6'), info.ipv6.filter(Boolean).join(', '), true)
  push(t('ovpnDNS'), info.dns.filter(Boolean).join(', '), true)
  if (info.mtu > 0) push(t('ovpnMTU'), String(info.mtu), true)
  if (info.connectedSince > 0n) {
    push(t('ovpnConnected'), fromNow(Number(info.connectedSince) * 1000))
  }
  return lines
}

const cancelChallenge = (endpointTag: string, challengeID: string) => {
  getSingboxClient()?.client.cancelOpenVPNChallenge({ endpointTag, challengeID })
}

// --- QR dialog ---
const qrOpen = ref(false)
const qrUrl = ref('')
const openQR = (url: string) => {
  qrUrl.value = url
  qrOpen.value = true
}

onMounted(() => {
  if (!getSingboxClient()) return
  statusHandle = runStream(
    (signal) => serverStream(StartedService.method.subscribeOpenVPNStatus, {}, signal),
    (msg) => (endpoints.value = msg.endpoints),
  )
})

onBeforeUnmount(() => statusHandle?.close())
</script>
