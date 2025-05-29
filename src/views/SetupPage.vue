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
      <h1 class="text-2xl font-semibold">{{ $t('setup') }}</h1>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('protocol') }}</span>
        </label>
        <select
          class="select select-sm w-full"
          v-model="form.protocol"
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
          class="w-full"
          name="username"
          autocomplete="username"
          v-model="form.host"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('port') }}</span>
        </label>
        <TextInput
          class="w-full"
          v-model="form.port"
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
          class="w-full"
          v-model="form.secondaryPath"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('password') }}</span>
        </label>
        <input
          type="password"
          class="input input-sm w-full"
          v-model="form.password"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm">
          <span>{{ $t('label') }} ({{ $t('optional') }})</span>
        </label>
        <TextInput
          class="w-full"
          v-model="form.label"
        />
      </div>
      <button
        class="btn btn-primary btn-sm w-full"
        @click="handleSubmit(form)"
      >
        {{ $t('submit') }}
      </button>
      <Draggable
        class="flex flex-1 flex-col gap-2"
        v-model="backendList"
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
  </div>
</template>

<script setup lang="ts">
import { ChevronUpDownIcon, QuestionMarkCircleIcon, TrashIcon } from '@heroicons/vue/24/outline'
import ImportSettings from '@renderer/components/common/ImportSettings.vue'
import TextInput from '@renderer/components/common/TextInput.vue'
import LanguageSelect from '@renderer/components/settings/LanguageSelect.vue'
import { useNotification } from '@renderer/composables/notification'
import { ROUTE_NAME } from '@renderer/constant'
import { getLabelFromBackend, getUrlFromBackend } from '@renderer/helper/utils'
import router from '@renderer/router'
import { activeUuid, addBackend, backendList, removeBackend } from '@renderer/store/setup'
import type { Backend } from '@renderer/types'
import { reactive } from 'vue'
import Draggable from 'vuedraggable'

const form = reactive({
  protocol: 'http',
  host: '127.0.0.1',
  port: '9090',
  secondaryPath: '',
  password: '',
  label: '',
})

const { showNotification } = useNotification()

const selectBackend = (uuid: string) => {
  activeUuid.value = uuid
  router.push({ name: ROUTE_NAME.proxies })
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

const query = new URLSearchParams(
  window.location.search || location.hash.match(/\?.*$/)?.[0]?.replace('?', ''),
)
if (query.has('hostname')) {
  handleSubmit({
    protocol: query.get('http')
      ? 'http'
      : query.get('https')
        ? 'https'
        : window.location.protocol.replace(':', ''),
    secondaryPath: query.get('secondaryPath') || '',
    host: query.get('hostname') as string,
    port: query.get('port') as string,
    password: query.get('secret') || '',
    label: query.get('label') || '',
    disableUpgradeCore:
      query.get('disableUpgradeCore') === '1' || query.get('disableUpgradeCore') === 'core',
  })
} else if (backendList.value.length === 0) {
  handleSubmit(form, true)
}
</script>
