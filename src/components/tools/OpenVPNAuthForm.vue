<template>
  <form
    class="flex flex-col gap-3"
    @submit.prevent="submit"
  >
    <p
      v-if="challenge.message"
      class="text-base-content/70 text-sm"
    >
      {{ challenge.message }}
    </p>

    <div
      v-if="deadlineMs > 0"
      class="font-mono text-sm tabular-nums"
      :class="remainingSeconds === 0 ? 'text-error' : 'text-base-content/60'"
    >
      {{ countdown }}
    </div>

    <template v-if="challenge.kind === 'credentials'">
      <label class="flex flex-col gap-1">
        <span class="text-base-content/60 text-xs">{{ $t('ovpnUsername') }}</span>
        <input
          v-model="username"
          class="input input-sm input-bordered w-full"
          autocomplete="off"
          :disabled="disabled"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-base-content/60 text-xs">{{ $t('ovpnPassword') }}</span>
        <input
          v-model="password"
          class="input input-sm input-bordered w-full"
          type="password"
          autocomplete="off"
          :disabled="disabled"
        />
      </label>
      <label
        v-if="challenge.secretMessage"
        class="flex flex-col gap-1"
      >
        <span class="text-base-content/60 text-xs">{{ challenge.secretMessage }}</span>
        <input
          v-model="secret"
          class="input input-sm input-bordered w-full"
          :type="challenge.echo ? 'text' : 'password'"
          autocomplete="off"
          :disabled="disabled"
        />
      </label>
    </template>

    <label
      v-else-if="challenge.kind === 'secret'"
      class="flex flex-col gap-1"
    >
      <span class="text-base-content/60 text-xs">{{
        challenge.secretMessage || $t('ovpnResponse')
      }}</span>
      <input
        v-model="secret"
        class="input input-sm input-bordered w-full"
        :type="challenge.echo ? 'text' : 'password'"
        autocomplete="off"
        :disabled="disabled"
      />
    </label>

    <div class="flex items-center gap-2">
      <button
        type="submit"
        class="btn btn-primary btn-sm"
        :disabled="disabled"
      >
        <span
          v-if="phase === 'submitting'"
          class="loading loading-spinner loading-xs"
        />
        {{ $t('ovpnSubmit') }}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="phase === 'submitting'"
        @click="cancel"
      >
        {{ $t('ovpnCancel') }}
      </button>
      <span
        v-if="phase === 'submitted'"
        class="text-base-content/50 flex items-center gap-1 text-xs"
      >
        <span class="loading loading-spinner loading-xs" />
        {{ $t('ovpnVerifying') }}
      </span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { getSingboxClient } from '@/assembly/tools'
import type { OpenVPNChallenge } from '@/gen/daemon/started_service_pb'
import { showNotification } from '@/helper/notification'
import { useNow } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  endpointTag: string
  challenge: OpenVPNChallenge
}>()

const now = useNow({ interval: 1000 })

const username = ref(props.challenge.username)
const password = ref('')
const secret = ref('')
const phase = ref<'idle' | 'submitting' | 'submitted'>('idle')

const deadlineMs = computed(() => Number(props.challenge.deadline) * 1000)
const remainingSeconds = computed(() =>
  deadlineMs.value > 0
    ? Math.max(0, Math.ceil((deadlineMs.value - now.value.getTime()) / 1000))
    : -1,
)
const expired = computed(() => deadlineMs.value > 0 && remainingSeconds.value === 0)
const disabled = computed(() => phase.value !== 'idle' || expired.value)

const countdown = computed(() => {
  const s = Math.max(0, remainingSeconds.value)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

// The backend re-issues the challenge with a previousError when auth fails;
// surface it and let the user retry.
watch(
  () => props.challenge.previousError,
  (err) => {
    if (err) {
      showNotification({ content: err, type: 'alert-error' })
    }
  },
  { immediate: true },
)

const submit = () => {
  const client = getSingboxClient()
  if (!client) return
  phase.value = 'submitting'
  client.client
    .submitOpenVPNChallengeResponse({
      endpointTag: props.endpointTag,
      challengeID: props.challenge.id,
      username: props.challenge.kind === 'credentials' ? username.value : '',
      password: props.challenge.kind === 'credentials' ? password.value : '',
      secret: secret.value,
    })
    .then(() => (phase.value = 'submitted'))
    .catch((error: unknown) => {
      phase.value = 'idle'
      showNotification({
        content: error instanceof Error ? error.message : String(error),
        type: 'alert-error',
      })
    })
}

const cancel = () => {
  getSingboxClient()?.client.cancelOpenVPNChallenge({
    endpointTag: props.endpointTag,
    challengeID: props.challenge.id,
  })
}
</script>
