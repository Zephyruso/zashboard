<template>
  <div
    class="bg-base-200/50 h-full w-full items-center justify-center overflow-auto sm:flex"
    @keydown.enter="handleSubmit(form)"
  >
    <div class="absolute top-4 right-4 max-sm:hidden">
      <ImportSettings />
    </div>
    <div class="absolute right-4 bottom-4 max-sm:hidden">
      <LanguageSelect />
    </div>
    <div class="card mx-auto w-96 max-w-[90%] gap-3 px-6 py-2 max-sm:my-4">
      <h1 class="text-2xl font-semibold">
        {{ $t('setup') }}
      </h1>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('protocol') }}</span>
        </label>
        <select
          v-model="form.protocol"
          class="select select-sm w-full"
        >
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('host') }}</span>
        </label>
        <TextInput
          v-model="form.host"
          class="w-full"
          name="username"
          autocomplete="username"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('port') }}</span>
        </label>
        <TextInput
          v-model="form.port"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="flex items-center gap-1 text-sm">
          <span>{{ $t('secondaryPath') }} ({{ $t('optional') }})</span>
          <span
            class="tooltip"
            :data-tip="$t('secondaryPathTip')"
          >
            <QuestionMarkCircleIcon class="h-4 w-4" />
          </span>
        </label>
        <TextInput
          v-model="form.secondaryPath"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('password') }}</span>
        </label>
        <input
          v-model="form.password"
          type="password"
          class="input input-sm w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('label') }} ({{ $t('optional') }})</span>
        </label>
        <TextInput
          v-model="form.label"
          class="w-full"
        />
      </div>
      <button
        class="btn btn-primary btn-sm w-full"
        @click="handleSubmit(form)"
      >
        {{ $t('submit') }}
      </button>
      <Draggable
        v-model="backendList"
        class="flex flex-1 flex-col gap-2"
        group="list"
        :animation="150"
        :item-key="'uuid'"
      >
        <template #item="{ element }">
          <div
            :key="element.uuid"
            class="flex items-center gap-2"
          >
            <button class="btn btn-circle btn-ghost btn-sm">
              <ChevronUpDownIcon class="h-4 w-4 cursor-grab" />
            </button>
            <button
              class="btn btn-sm flex-1"
              @click="selectBackend(element.uuid)"
            >
              {{ getLabelFromBackend(element) }}
            </button>
            <button
              class="btn btn-circle btn-ghost btn-sm"
              @click="editBackend(element)"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <button
              class="btn btn-circle btn-ghost btn-sm"
              @click="() => removeBackend(element.uuid)"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </Draggable>
      <LanguageSelect class="mt-4 sm:hidden" />
      <div class="absolute top-2 right-2 sm:hidden">
        <ImportSettings />
      </div>
    </div>

    <!-- 编辑Backend Modal -->
    <EditBackendModal
      v-model="showEditModal"
      :default-backend-uuid="editingBackendUuid"
    />
  </div>
</template>

<script setup lang="ts">
import ImportSettings from '@/components/common/ImportSettings.vue'
import TextInput from '@/components/common/TextInput.vue'
import LanguageSelect from '@/components/settings/LanguageSelect.vue'
import { ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import { getBackendFromUrl, getLabelFromBackend, getUrlFromBackend } from '@/helper/utils'
import router from '@/router'
import { activeUuid, addBackend, backendList, removeBackend } from '@/store/setup'
import type { Backend } from '@/types'
import {
  ChevronUpDownIcon,
  PencilIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { reactive, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import EditBackendModal from '../components/settings/EditBackendModal.vue'

const form = reactive({
  protocol: 'http',
  host: '127.0.0.1',
  port: '9090',
  secondaryPath: '',
  password: '',
  label: '',
})

const showEditModal = ref(false)
const editingBackendUuid = ref<string>('')

// 监听路由参数，自动打开编辑模态框
watch(
  () => router.currentRoute.value.query.editBackend,
  (backendUuid) => {
    if (backendUuid && typeof backendUuid === 'string') {
      editingBackendUuid.value = backendUuid
      showEditModal.value = true
      // 清除路由参数以避免重复触发
      router.replace({ query: {} })
    }
  },
  { immediate: true },
)

const selectBackend = (uuid: string) => {
  activeUuid.value = uuid
  router.push({ name: ROUTE_NAME.proxies })
}

const editBackend = (backend: Backend) => {
  editingBackendUuid.value = backend.uuid
  showEditModal.value = true
}

const handleSubmit = async (form: Omit<Backend, 'uuid'>, quiet = false) => {
  const { protocol, host, port, password } = form

  if (!protocol || !host || !port) {
    alert('Please fill in all the fields.')
    return
  }

  if (
    window.location.protocol === 'https:' &&
    protocol === 'http' &&
    !['::1', '0.0.0.0', '127.0.0.1', 'localhost'].includes(host) &&
    !quiet
  ) {
    showNotification({
      content: 'protocolTips',
    })
  }

  try {
    const data = await fetch(`${getUrlFromBackend(form)}/version`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${password}`,
      },
    })

    if (data.status !== 200) {
      if (!quiet) {
        alert(data.statusText)
      }
      return
    }

    const { version, message } = await data.json()

    if (!version) {
      if (!quiet) {
        alert(message)
      }
      return
    }

    addBackend(form)
    router.push({ name: ROUTE_NAME.proxies })
  } catch (e) {
    if (!quiet) {
      alert(e)
    }
  }
}

const backend = getBackendFromUrl()

if (backend) {
  handleSubmit(backend)
} else if (backendList.value.length === 0) {
  handleSubmit(form, true)
}
</script>
