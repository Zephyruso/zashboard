<template>
  <DialogWrapper
    v-model="isOpen"
    :title="$t('sshConfiguration')"
  >
    <div class="flex flex-col gap-3">
      <div class="text-base-content/55 px-1 text-sm">{{ peerDisplayName(peer) }}</div>
      <div class="divide-base-content/8 bg-base-200/40 divide-y overflow-hidden rounded-xl">
        <div class="setting-item">
          <span class="setting-item-label">{{ $t('username') }}</span>
          <input
            ref="usernameEl"
            class="input input-ghost input-sm w-40 text-right"
            v-model="username"
            @keydown.enter="connect"
          />
        </div>
        <div class="setting-item">
          <span class="setting-item-label">{{ $t('terminalType') }}</span>
          <input
            class="input input-ghost input-sm w-40 text-right"
            v-model="terminalType"
          />
        </div>
        <label class="setting-item cursor-pointer">
          <span class="setting-item-label">{{ $t('rememberSSHOptions') }}</span>
          <input
            type="checkbox"
            class="toggle"
            v-model="remember"
          />
        </label>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button
          class="btn btn-sm rounded-lg"
          @click="isOpen = false"
        >
          {{ $t('cancel') }}
        </button>
        <button
          class="btn btn-primary btn-sm rounded-lg"
          :disabled="username.trim() === ''"
          @click="connect"
        >
          {{ $t('connect') }}
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import {
  peerDisplayName,
  SSH_DEFAULT_TERMINAL_TYPE,
  SSH_DEFAULT_USERNAME,
  sshPrefs,
} from '@/composables/tailscaleSSH'
import type { TailscalePeer } from '@/gen/daemon/started_service_pb'
import { nextTick, ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{ peer: TailscalePeer }>()
const isOpen = defineModel<boolean>()
const emit = defineEmits<{
  connect: [username: string, terminalType: string, remember: boolean]
}>()

const usernameEl = useTemplateRef<HTMLInputElement>('usernameEl')
const username = ref(SSH_DEFAULT_USERNAME)
const terminalType = ref(SSH_DEFAULT_TERMINAL_TYPE)
const remember = ref(false)

watch(isOpen, async (open) => {
  if (!open) return
  const initial = sshPrefs.value[props.peer.stableID]
  username.value = initial?.username ?? SSH_DEFAULT_USERNAME
  terminalType.value = initial?.terminalType ?? SSH_DEFAULT_TERMINAL_TYPE
  remember.value = initial?.remember ?? false
  await nextTick()
  usernameEl.value?.focus()
})

const connect = () => {
  const trimmed = username.value.trim()
  if (trimmed === '') return
  emit('connect', trimmed, terminalType.value.trim() || SSH_DEFAULT_TERMINAL_TYPE, remember.value)
  isOpen.value = false
}
</script>
