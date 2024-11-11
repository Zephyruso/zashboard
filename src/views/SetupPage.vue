<template>
  <div class="w-full h-full flex justify-center items-center">
    <div class="p-6 bg-base-100 shadow-lg rounded-lg">
      <h1 class="text-2xl font-semibold mb-4">{{ $t('setup') }}</h1>
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">{{ $t('protocol') }}</span>
        </label>
        <select class="select select-bordered w-full" v-model="form.protocol">
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
        </select>
      </div>
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">{{ $t('host') }}</span>
        </label>
        <input type="text" class="input input-bordered w-full" v-model="form.host" />
      </div>
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">{{ $t('port') }}</span>
        </label>
        <input type="text" class="input input-bordered w-full" v-model="form.port" />
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">{{ $t('password') }}</span>
        </label>
        <input type="password" class="input input-bordered w-full" v-model="form.password" />
      </div>
      <button class="btn btn-primary w-full mt-4" @click="handleSubmit">
        {{ $t('submit') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { addBackend } from '@/store/setup'
import { reactive } from 'vue'
import router from '@/router';

const form = reactive({
  protocol: 'http',
  host: '127.0.0.1',
  port: 9090,
  password: '',  
})

const handleSubmit = async () => {
  const { protocol, host, port, password } = form

  if (!protocol || !host || !port) {
    alert('Please fill in all the fields.')
    return
  }

  const data = await fetch(`${protocol}://${host}:${port}/version`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${password}`,
    },
  })

  const { version, message } = await data.json()

  if (!version) {
    alert(message)
    return
  }

  addBackend(form)

  router.push({ name: 'proxies' })
}
</script>
