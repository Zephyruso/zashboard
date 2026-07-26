<template>
  <div class="bg-base-100 flex h-full flex-col">
    <!-- Header: close, session tabs, new-session menu -->
    <div class="flex items-center gap-2 p-2 sm:px-4">
      <button
        class="btn btn-sm btn-circle btn-ghost"
        :aria-label="$t('disconnect')"
        @click="emit('close')"
      >
        <XMarkIcon class="h-5 w-5" />
      </button>

      <div class="tabs-box tabs tabs-xs min-w-0 flex-1 overflow-x-auto">
        <a
          v-for="s in sessions"
          :key="s.id"
          role="tab"
          :class="['tab gap-1', s.id === activeId && 'tab-active']"
          @click="activeId = s.id"
        >
          <span class="max-w-32 truncate">{{ sessionTitle(s) }}</span>
          <button
            class="hover:text-error"
            :aria-label="$t('disconnect')"
            @click.stop="closeSession(s.id)"
          >
            <XMarkIcon class="h-3 w-3" />
          </button>
        </a>
      </div>

      <button
        class="btn btn-sm btn-circle btn-ghost"
        :aria-label="$t('terminalSettings')"
        @click="settingsOpen = true"
      >
        <Cog6ToothIcon class="h-5 w-5" />
      </button>

      <div class="dropdown dropdown-end">
        <button
          tabindex="0"
          class="btn btn-sm btn-circle btn-ghost"
          :aria-label="$t('newSession')"
        >
          <PlusIcon class="h-5 w-5" />
        </button>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-200 rounded-box z-30 w-56 p-1 shadow"
        >
          <li v-if="active">
            <a @click="duplicateSession">
              <DocumentDuplicateIcon class="h-4 w-4" />
              {{ active.options.peerName || $t('newSession') }}
            </a>
          </li>
          <li
            v-for="peer in rememberedPeers"
            :key="peer.stableID"
          >
            <a @click="openRememberedPeer(peer.stableID)">{{ peerDisplayName(peer) }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="activeStatus"
      class="px-3 pb-1 text-xs opacity-70 sm:px-5"
    >
      {{ activeStatus }}
    </div>

    <TerminalSession
      v-for="s in sessions"
      :key="s.id"
      :session="s.options"
      :active="s.id === activeId"
      @title-change="(title) => (s.title = title)"
      @status-change="(status) => (s.status = status)"
      @exit="(clean) => onSessionExit(s.id, clean)"
    />

    <TerminalSettingsDialog v-model="settingsOpen" />
  </div>
</template>

<script setup lang="ts">
import { getSingboxClient, runStream, serverStream, type StreamHandle } from '@/assembly/tools'
import TerminalSession from '@/components/tools/TerminalSession.vue'
import TerminalSettingsDialog from '@/components/tools/TerminalSettingsDialog.vue'
import {
  allPeers,
  buildSSHSession,
  peerDisplayName,
  peerSSHAddress,
  peerSSHAvailable,
  SSH_DEFAULT_TERMINAL_TYPE,
  SSH_DEFAULT_USERNAME,
  sshPrefs,
  type SSHSessionOptions,
} from '@/composables/tailscaleSSH'
import { useViewportHeight } from '@/composables/useViewportHeight'
import { StartedService, type TailscaleEndpointStatus } from '@/gen/daemon/started_service_pb'
import {
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface ManagedSession {
  id: number
  options: SSHSessionOptions
  title: string
  status: string
}

const props = defineProps<{
  // The session to open; bumping `seq` adds another tab to the same terminal.
  launch: SSHSessionOptions & { seq: number }
}>()
const emit = defineEmits<{ close: [] }>()

// Track the visual viewport only while the terminal is open, so the soft
// keyboard shrinks the app instead of overlapping it (notably iOS Safari, which
// never resizes the layout viewport). Scoped here so other views keep `100dvh`.
useViewportHeight()

const sessions = ref<ManagedSession[]>([])
const activeId = ref(0)
const settingsOpen = ref(false)
let idCounter = 0

const active = computed(() => sessions.value.find((s) => s.id === activeId.value))
const activeStatus = computed(() => active.value?.status ?? '')

const sessionTitle = (s: ManagedSession): string =>
  s.title.trim() || `${s.options.username}@${s.options.peerName}`

const addSession = (options: SSHSessionOptions) => {
  const id = ++idCounter
  sessions.value.push({ id, options, title: '', status: '' })
  activeId.value = id
}

const closeSession = (id: number) => {
  const remaining = sessions.value.filter((s) => s.id !== id)
  sessions.value = remaining
  if (activeId.value === id) {
    activeId.value = remaining[remaining.length - 1]?.id ?? 0
  }
}

// Auto-close a session shortly after a clean exit, matching the original.
const onSessionExit = (id: number, clean: boolean) => {
  if (clean) window.setTimeout(() => closeSession(id), 1000)
}

const duplicateSession = () => {
  if (active.value) addSession({ ...active.value.options })
}

// --- Remembered peers for the "New Session" menu ---
const endpoints = ref<TailscaleEndpointStatus[]>([])
let statusHandle: StreamHandle | null = null

const currentEndpoint = computed(() =>
  endpoints.value.find((e) => e.endpointTag === active.value?.options.endpointTag),
)

const rememberedPeers = computed(() => {
  const activeAddress = active.value?.options.peerAddress
  return allPeers(currentEndpoint.value).filter(
    (peer) =>
      sshPrefs.value[peer.stableID]?.remember &&
      peerSSHAvailable(peer) &&
      peerSSHAddress(peer) !== activeAddress,
  )
})

const openRememberedPeer = (stableID: string) => {
  const peer = allPeers(currentEndpoint.value).find((p) => p.stableID === stableID)
  if (!peer || !active.value) return
  const prefs = sshPrefs.value[peer.stableID]
  addSession(
    buildSSHSession(
      active.value.options.endpointTag,
      peer,
      prefs?.username ?? SSH_DEFAULT_USERNAME,
      prefs?.terminalType ?? SSH_DEFAULT_TERMINAL_TYPE,
    ),
  )
}

// Adding the initial session, and any later launches from the Tailscale tab.
onMounted(() => {
  addSession(props.launch)
  if (getSingboxClient()) {
    statusHandle = runStream(
      (signal) => serverStream(StartedService.method.subscribeTailscaleStatus, {}, signal),
      (msg) => (endpoints.value = msg.endpoints),
    )
  }
})

watch(
  () => props.launch.seq,
  () => addSession(props.launch),
)

// When the last session closes, dismiss the whole terminal overlay.
watch(
  () => sessions.value.length,
  (len) => {
    if (len === 0) emit('close')
  },
)

onBeforeUnmount(() => statusHandle?.close())
</script>
