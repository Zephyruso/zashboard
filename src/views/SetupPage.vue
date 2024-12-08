<template>
  <div class="flex h-full w-full items-center justify-center">
    <div
      class="toast toast-start toast-top max-w-64 whitespace-normal text-sm"
      v-if="tipShowModel"
    >
      <div class="breaks-all alert alert-warning w-72 whitespace-normal">
        <a
          href="https://github.com/Zephyruso/zashboard/blob/main/README.md"
          target="_blank"
        >
          {{ $t(tipContent) }}
        </a>
      </div>
    </div>
    <div class="absolute bottom-4 right-4">
      <LanguageSelect />
    </div>
    <div class="rounded-lg bg-base-100 p-6 shadow-lg">
      <h1 class="mb-4 text-2xl font-semibold">{{ $t('setup') }}</h1>
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">{{ $t('protocol') }}</span>
        </label>
        <select
          class="select select-bordered w-full"
          v-model="form.protocol"
        >
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
        </select>
      </div>
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">{{ $t('host') }}</span>
        </label>
        <input
          type="text"
          class="input input-bordered w-full"
          v-model="form.host"
        />
      </div>
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">{{ $t('port') }}</span>
        </label>
        <input
          type="text"
          class="input input-bordered w-full"
          v-model="form.port"
        />
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">{{ $t('password') }}</span>
        </label>
        <input
          type="password"
          class="input input-bordered w-full"
          v-model="form.password"
        />
      </div>
      <button
        class="btn btn-primary mt-4 w-full"
        @click="handleSubmit(form)"
      >
        {{ $t('submit') }}
      </button>
      <div class="flex flex-col gap-2 pt-4">
        <div
          v-for="backend in backendList"
          :key="backend.uuid"
          class="flex items-center gap-2"
        >
          <button
            class="btn btn-xs flex-1"
            @click="activeUuid = backend.uuid"
          >
            {{ backend.protocol }}://{{ backend.host }}:{{ backend.port }}
          </button>
          <button
            class="btn btn-circle btn-xs"
            @click="() => removeBackend(backend.uuid)"
          >
            <MinusCircleIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSelect from '@/components/settings/LanguageSelect.vue'
import { useSetup } from '@/composables/setup'
import router from '@/router'
import { activeUuid, addBackend, backendList, removeBackend } from '@/store/setup'
import { MinusCircleIcon } from '@heroicons/vue/24/outline'
import { reactive } from 'vue'

const form = reactive({
  protocol: 'http',
  host: '127.0.0.1',
  port: 9090,
  password: '',
})

const { tipContent, tipShowModel, showTip } = useSetup()

const handleSubmit = async (
  form: {
    protocol: string
    host: string
    port: number
    password: string
  },
  quiet = false,
) => {
  const { protocol, host, port, password } = form

  if (!protocol || !host || !port) {
    alert('Please fill in all the fields.')
    return
  }

  if (window.location.protocol === 'https:' && protocol === 'http' && !quiet) {
    showTip('protocolTips')
  }

  const data = await fetch(`${protocol}://${host}:${port}/version`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${password}`,
    },
  })

  const { version, message } = await data.json()

  if (!version) {
    if (!quiet) {
      alert(message)
    }
    return
  }

  addBackend(form)
  router.push({ name: 'proxies' })
}

const query = new URLSearchParams(
  window.location.search || location.hash.match(/\?.*$/)?.[0]?.replace('?', ''),
)
if (query.has('hostname')) {
  handleSubmit({
    protocol: window.location.protocol.replace(':', ''),
    host: query.get('hostname') as string,
    port: Number(query.get('port')) as unknown as number,
    password: query.get('secret') as string,
  })
} else {
  handleSubmit(form, true)
}
</script>
