<template>
  <DialogWrapper
    v-if="isReady"
    v-model="isOpen"
    :title="title"
    box-class="max-w-md"
    @enter="handleEnter"
  >
    <div
      v-if="view?.mode === 'list'"
      class="flex flex-col gap-3"
    >
      <div
        v-if="!backendList.length"
        class="text-base-content/50 py-6 text-center text-sm"
      >
        {{ $t('noBackendYet') }}
      </div>

      <Draggable
        v-else
        class="-mr-2 flex max-h-[50dvh] flex-col gap-1 overflow-y-auto pr-2"
        v-model="backendList"
        group="backendList"
        handle=".drag-handle"
        :animation="150"
        :item-key="'uuid'"
      >
        <template #item="{ element }">
          <div
            :key="element.uuid"
            class="group flex items-center gap-1 rounded-lg pr-1 transition-colors"
            :class="element.uuid === activeUuid ? 'bg-primary/10' : 'hover:bg-base-200'"
          >
            <ChevronUpDownIcon
              class="drag-handle text-base-content/30 ml-1 h-4 w-4 flex-none cursor-grab"
            />
            <button
              class="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
              @click="switchTo(element.uuid)"
            >
              <BackendStatusDot
                :status="stateOf(element.uuid).status"
                :show-latency="false"
              />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="w-full truncate text-sm">{{ getLabelFromBackend(element) }}</span>
                <span
                  v-if="element.label"
                  class="text-base-content/50 w-full truncate text-xs"
                >
                  {{ getHostFromBackend(element) }}
                </span>
              </span>
              <span
                v-if="stateOf(element.uuid).status === 'online'"
                class="text-base-content/50 flex-none text-xs tabular-nums"
              >
                {{ stateOf(element.uuid).latency }} ms
              </span>
            </button>
            <button
              class="btn btn-circle btn-ghost btn-xs text-base-content/40 hover:text-base-content"
              :aria-label="$t('editBackend')"
              @click="openEdit(element.uuid)"
            >
              <PencilSquareIcon class="h-4 w-4" />
            </button>
            <button
              class="btn btn-circle btn-ghost btn-xs text-base-content/40 hover:text-error"
              :aria-label="$t('delete')"
              @click="handleRemove(element)"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </Draggable>

      <button
        class="btn btn-primary btn-sm w-full"
        @click="openBackendManager({ mode: 'create' })"
      >
        <PlusIcon class="h-4 w-4" />
        {{ $t('addBackend') }}
      </button>
    </div>

    <div
      v-else-if="editForm"
      class="flex flex-col gap-4"
    >
      <BackendForm v-model="editForm" />

      <ReachabilityIndicator
        class="min-h-5"
        :status="reachability.status.value"
        :latency="reachability.latency.value"
        :message="reachability.message.value"
        @retry="reachability.retry"
      />

      <div class="flex justify-end gap-2">
        <button
          class="btn btn-sm"
          :disabled="isSaving"
          @click="handleCancel"
        >
          {{ $t('cancel') }}
        </button>
        <button
          class="btn btn-primary btn-sm"
          :disabled="!canSave"
          @click="handleSave"
        >
          <span
            v-if="isSaving"
            class="loading loading-spinner loading-xs"
          ></span>
          {{ isSaving ? $t('checking') : $t('save') }}
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { logoutDae } from '@/api/dae-auth'
import { probeBackend } from '@/assembly/probe'
import BackendStatusDot from '@/components/common/BackendStatusDot.vue'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import ReachabilityIndicator from '@/components/common/ReachabilityIndicator.vue'
import { useBackendListProbe } from '@/composables/use-backend-list-probe'
import { useBackendReachability } from '@/composables/use-backend-reachability'
import { ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import { getHostFromBackend, getLabelFromBackend } from '@/helper/utils'
import router from '@/router'
import {
  activeUuid,
  addBackend,
  backendList,
  backendManagerView,
  closeBackendManager,
  openBackendManager,
  removeBackend,
  setActiveBackend,
  updateBackend,
} from '@/store/setup'
import type { Backend, BackendType } from '@/types'
import { ChevronUpDownIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Draggable from 'vuedraggable'
import BackendForm from './BackendForm.vue'

const { t } = useI18n()

const isReady = ref(false)
onMounted(() => {
  isReady.value = true
})

const view = computed(() => backendManagerView.value)

const isOpen = computed({
  get: () => view.value !== null,
  set: (value) => {
    if (!value) closeBackendManager()
  },
})

const title = computed(() => {
  switch (view.value?.mode) {
    case 'create':
      return t('addBackend')
    case 'edit':
      return t('editBackendTitle')
    default:
      return t('backend')
  }
})

const isListVisible = computed(() => view.value?.mode === 'list')
const { stateOf } = useBackendListProbe(isListVisible)

const emptyForm = (): Omit<Backend, 'uuid'> => ({
  type: 'clash' as BackendType,
  protocol: 'http',
  host: '127.0.0.1',
  port: '9090',
  secondaryPath: '',
  password: '',
  label: '',
  disableUpgradeCore: false,
  disableTunMode: false,
})

const editForm = ref<Omit<Backend, 'uuid'> | null>(null)
const isSaving = ref(false)

const reachability = useBackendReachability(editForm)
const canSave = computed(() => reachability.status.value === 'online' && !isSaving.value)

watch(
  () => (view.value?.mode === 'edit' ? `edit:${view.value.uuid}` : (view.value?.mode ?? '')),
  () => {
    const current = view.value

    if (!current || current.mode === 'list') {
      editForm.value = null
      return
    }

    if (current.mode === 'create') {
      editForm.value = emptyForm()
      return
    }

    const backend = backendList.value.find((item) => item.uuid === current.uuid)

    if (!backend) {
      openBackendManager({ mode: 'list' })
      return
    }

    editForm.value = {
      type: backend.type,
      protocol: backend.protocol,
      host: backend.host,
      port: backend.port,
      secondaryPath: backend.secondaryPath,
      password: backend.password,
      ...(backend.username ? { username: backend.username } : {}),
      label: backend.label || '',
      disableUpgradeCore: backend.disableUpgradeCore || false,
      disableTunMode: backend.disableTunMode || false,
    }
  },
  { immediate: true },
)

const leaveSetupPage = () => {
  if (router.currentRoute.value.name === ROUTE_NAME.setup) {
    router.push({ name: ROUTE_NAME.proxies })
  }
}

const switchTo = (uuid: string) => {
  setActiveBackend(uuid)
  closeBackendManager()
  leaveSetupPage()
}

const openEdit = (uuid: string) => openBackendManager({ mode: 'edit', uuid })

const handleRemove = (backend: Backend) => {
  logoutDae(backend)
  removeBackend(backend.uuid)
}

const cameFromList = ref(false)

watch(
  () => view.value?.mode,
  (mode, previous) => {
    if (mode === 'list') cameFromList.value = true
    else if (!previous) cameFromList.value = false
  },
  { immediate: true },
)

const handleCancel = () => {
  if (cameFromList.value) {
    openBackendManager({ mode: 'list' })
  } else {
    closeBackendManager()
  }
}

const handleSave = async () => {
  const current = view.value
  const form = editForm.value

  if (!form || !current || current.mode === 'list') return

  isSaving.value = true

  try {
    const composed: Omit<Backend, 'uuid'> = { ...form }
    const result = await probeBackend(
      {
        uuid: current.mode === 'edit' ? current.uuid : '',
        ...composed,
      },
      undefined,
      undefined,
      true,
    )

    if (!result.ok) {
      if (result.kind === 'unauthorized') {
        showNotification({ content: t('diagnosisUnauthorized'), type: 'alert-error' })
      }
      reachability.retry()
      return
    }

    if (current.mode === 'create') {
      addBackend(composed)
      closeBackendManager()
      leaveSetupPage()
    } else {
      updateBackend(current.uuid, composed)
      showNotification({ content: t('backendConfigSaved'), type: 'alert-success' })
      handleCancel()
    }
  } catch (error) {
    showNotification({ content: `${t('saveFailed')}: ${error}`, type: 'alert-error' })
  } finally {
    isSaving.value = false
  }
}

const handleEnter = () => {
  if (view.value?.mode !== 'list' && canSave.value) handleSave()
}
</script>
