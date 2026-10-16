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
import { getBackendFromUrl, getBackendProbeUrl, getOriginBackend } from '@/helper/utils'
import router from '@/router'
import { addBackend, backendList, openBackendManager } from '@/store/setup'
import type { Backend, BackendType } from '@/types'
import { computed, ref, watch } from 'vue'

type SetupForm = Omit<Backend, 'uuid'>

const defaultForm: SetupForm = {
  type: 'clash' as BackendType,
  protocol: 'http',
  host: '127.0.0.1',
  port: '9090',
  secondaryPath: '',
  password: '',
  label: '',
}

const urlBackend = getBackendFromUrl()
const originBackend = !urlBackend && backendList.value.length === 0 ? getOriginBackend() : null
const form = ref<SetupForm>({ ...(originBackend ?? defaultForm) })

const reachability = useBackendReachability(form)

const isSubmitting = ref(false)
const canSubmit = computed(() => reachability.status.value === 'online' && !isSubmitting.value)

let detectController: AbortController | null = null

const login = async (backend: SetupForm) => {
  addBackend(backend)
  await router.push({ name: ROUTE_NAME.proxies })

  try {
    await syncSettingsFromCore()
  } catch (error) {
    console.error('Failed to sync settings after login:', error)
  }
}

const handleSubmit = async (setupForm: SetupForm) => {
  const { protocol, host, port } = setupForm

  if (!protocol || !host || !port) return
  if (isSubmitting.value) return

  detectController?.abort()

  if (
    window.location.protocol === 'https:' &&
    protocol === 'http' &&
    !['::1', '0.0.0.0', '127.0.0.1', 'localhost'].includes(host)
  ) {
    showNotification({ content: 'protocolTips' })
  }

  isSubmitting.value = true

  try {
    const result = await probeBackend({ uuid: '', ...setupForm }, undefined, undefined, true)

    if (!result.ok) {
      if (result.kind !== 'unauthorized' && setupForm === form.value) {
        reachability.retry()
      } else {
        showNotification({
          content: await describeProbeFailure(result, getBackendProbeUrl(setupForm)),
          type: 'alert-error',
        })
      }
      return
    }

    await login(setupForm)
  } finally {
    isSubmitting.value = false
  }
}

const detectBackend = async (candidates: SetupForm[], signal: AbortSignal) => {
  const probes = candidates.map((candidate) =>
    probeBackend({ uuid: '', ...candidate }, undefined, signal, true),
  )

  for (const [index, probe] of probes.entries()) {
    const result = await probe

    if (result.ok || result.kind === 'unauthorized') {
      return { backend: candidates[index], ok: result.ok }
    }
  }

  return null
}

const autoDetect = async (candidates: SetupForm[]) => {
  const controller = new AbortController()
  const stopOnEdit = watch(form, () => controller.abort(), { deep: true })

  detectController = controller

  const detected = await detectBackend(candidates, controller.signal)

  stopOnEdit()
  if (controller.signal.aborted) return
  controller.abort()

  form.value = { ...(detected?.backend ?? defaultForm) }
  if (detected?.ok) await login(detected.backend)
}

if (urlBackend) {
  handleSubmit(urlBackend)
} else if (backendList.value.length === 0) {
  autoDetect(originBackend ? [originBackend, defaultForm] : [defaultForm])
}
</script>
