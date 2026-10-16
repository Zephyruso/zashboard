<template>
  <div
    class="bg-base-200/50 h-full w-full items-center justify-center overflow-auto sm:flex"
    @keydown.enter="handleSubmit(form)"
  >
    <div class="absolute top-4 right-4 max-sm:hidden">
      <DashboardSettings />
    </div>
    <div class="absolute right-4 bottom-4 max-sm:hidden">
      <LanguageSelect />
    </div>
    <div
      class="border-base-border bg-base-100 mx-auto flex w-96 max-w-[90%] flex-col gap-3 rounded-xl border px-6 py-5 shadow-none max-sm:my-4"
    >
      <h1 class="mb-1 text-lg">{{ $t('setup') }}</h1>

      <BackendForm v-model="form" />

      <ReachabilityIndicator
        class="min-h-5"
        :status="reachability.status.value"
        :latency="reachability.latency.value"
        :message="reachability.message.value"
        @retry="reachability.retry"
      />

      <button
        class="btn btn-primary btn-sm w-full"
        :disabled="!canSubmit"
        @click="handleSubmit(form)"
      >
        <span
          v-if="isSubmitting"
          class="loading loading-spinner loading-xs"
        ></span>
        {{ isSubmitting ? $t('backendConnecting') : $t('submit') }}
      </button>

      <button
        v-if="backendList.length"
        class="btn btn-ghost btn-sm w-full"
        @click="openBackendManager()"
      >
        {{ $t('manageBackends') }}
      </button>

      <div class="mt-4 sm:hidden">
        <LanguageSelect />
      </div>
      <div class="absolute top-2 right-2 sm:hidden">
        <DashboardSettings />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { probeBackend } from '@/assembly/probe'
import DashboardSettings from '@/components/common/DashboardSettings.vue'
import ReachabilityIndicator from '@/components/common/ReachabilityIndicator.vue'
import BackendForm from '@/components/settings/backend/BackendForm.vue'
import LanguageSelect from '@/components/settings/general/LanguageSelect.vue'
import { ROUTE_NAME } from '@/constant'
import { syncSettingsFromCore } from '@/helper/auto-import-settings'
import { useBackendReachability } from '@/composables/use-backend-reachability'
import { describeProbeFailure } from '@/helper/connectivity'
import { showNotification } from '@/helper/notification'
import { getBackendFromUrl, getBackendProbeUrl } from '@/helper/utils'
import router from '@/router'
import { addBackend, backendList, openBackendManager } from '@/store/setup'
import type { Backend, BackendType } from '@/types'
import { computed, ref, watch } from 'vue'

const defaultForm: Omit<Backend, 'uuid'> = {
  type: 'clash' as BackendType,
  protocol: 'http',
  host: '127.0.0.1',
  port: '9090',
  secondaryPath: '',
  password: '',
  label: '',
}

const backend = getBackendFromUrl()
const query = new URLSearchParams(
  window.location.search || window.location.hash.match(/\?.*$/)?.[0]?.replace('?', ''),
)
const originBackend: Omit<Backend, 'uuid'> | null =
  !backend &&
  backendList.value.length === 0 &&
  !query.has('hostname') &&
  !query.has('port') &&
  ['http:', 'https:'].includes(window.location.protocol)
    ? {
        ...defaultForm,
        protocol: window.location.protocol.slice(0, -1),
        host: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
        password: query.get('secret') || '',
      }
    : null
const form = ref<Omit<Backend, 'uuid'>>(originBackend || { ...defaultForm })

const reachability = useBackendReachability(form)

const isSubmitting = ref(false)
const canSubmit = computed(() => reachability.status.value === 'online' && !isSubmitting.value)

type SetupForm = Omit<Backend, 'uuid'>

const finishLogin = async () => {
  await router.push({ name: ROUTE_NAME.proxies })

  try {
    await syncSettingsFromCore()
  } catch (error) {
    console.error('Failed to sync settings after login:', error)
  }
}

const handleSubmit = async (setupForm: SetupForm, quiet = false) => {
  const { protocol, host, port } = setupForm

  if (!protocol || !host || !port) return
  if (isSubmitting.value) return

  if (
    window.location.protocol === 'https:' &&
    protocol === 'http' &&
    !['::1', '0.0.0.0', '127.0.0.1', 'localhost'].includes(host) &&
    !quiet
  ) {
    showNotification({ content: 'protocolTips' })
  }

  isSubmitting.value = true

  try {
    const result = await probeBackend({ uuid: '', ...setupForm }, undefined, undefined, true)

    if (!result.ok) {
      if (result.kind === 'unauthorized' && !quiet) {
        showNotification({
          content: await describeProbeFailure(result, getBackendProbeUrl(setupForm)),
          type: 'alert-error',
        })
      } else if (setupForm === form.value) {
        reachability.retry()
      } else if (!quiet) {
        showNotification({
          content: await describeProbeFailure(result, getBackendProbeUrl(setupForm)),
          type: 'alert-error',
        })
      }
      return
    }

    addBackend(setupForm)
    await finishLogin()
  } finally {
    isSubmitting.value = false
  }
}

if (backend) {
  handleSubmit(backend)
} else if (backendList.value.length === 0) {
  let tryingOrigin = !!originBackend
  let resettingForm = false
  const stopOnEdit = originBackend
    ? watch(
        form,
        () => {
          if (resettingForm) return
          stopAutoLogin()
          stopOnEdit?.()
        },
        { deep: true, flush: 'sync' },
      )
    : undefined
  const stopAutoLogin = watch(
    () => reachability.status.value,
    (status) => {
      if (status === 'checking' || status === 'idle') return
      if (status === 'offline' && tryingOrigin) {
        tryingOrigin = false
        resettingForm = true
        form.value = { ...defaultForm }
        resettingForm = false
        return
      }
      stopAutoLogin()
      stopOnEdit?.()
      if (status === 'online') handleSubmit(form.value, true)
    },
  )
}
</script>
