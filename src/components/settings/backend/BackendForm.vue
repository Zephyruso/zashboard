<!--
  后端连接参数的表单字段。新增与编辑共用同一份 —— 两处字段本就该一致,
  分成两份的结果是编辑界面连 type 都改不了。

  disableUpgradeCore / disableTunMode 有意不在这里出现:它们是给通过 URL 参数
  下发后端的场景用的(见 getBackendFromUrl),由分发方决定藏掉哪些功能,
  不是手填地址的人要操心的东西。编辑时原样带过,不清空。

  这里只管字段。可达性探测留在父级:登录页要根据探测结果决定能不能自动登录,
  探测状态藏进子组件父级就读不到了。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <label class="text-sm">{{ $t('backendType') }}</label>
      <SelectInput
        class="select select-sm w-full"
        v-model="model.type"
        :options="[
          { value: 'clash', label: $t('clashApi') },
          { value: 'dae', label: $t('daeApi') },
        ]"
      />
    </div>

    <div class="flex gap-2">
      <div class="flex w-24 flex-none flex-col gap-1">
        <label class="text-sm">{{ $t('protocol') }}</label>
        <SelectInput
          class="select select-sm w-full"
          v-model="model.protocol"
          :options="[
            { value: 'http', label: 'HTTP' },
            { value: 'https', label: 'HTTPS' },
          ]"
        />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <label class="text-sm">{{ $t('host') }}</label>
        <TextInput
          class="w-full"
          name="username"
          autocomplete="username"
          v-model="model.host"
          placeholder="127.0.0.1"
        />
      </div>
      <div class="flex w-20 flex-none flex-col gap-1">
        <label class="text-sm">{{ $t('port') }}</label>
        <TextInput
          class="w-full"
          v-model="model.port"
          placeholder="9090"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="flex items-center gap-1 text-sm">
        <span>{{ $t('secondaryPath') }} ({{ $t('optional') }})</span>
        <span
          class="tooltip flex-none"
          :data-tip="$t('secondaryPathTip')"
        >
          <QuestionMarkCircleIcon class="h-4 w-4" />
        </span>
      </label>
      <TextInput
        class="w-full"
        v-model="model.secondaryPath"
      />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-sm">{{ $t('label') }}</label>
      <TextInput
        class="w-full"
        v-model="model.label"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm">{{ $t('password') }}</label>
      <input
        type="password"
        class="input input-sm w-full"
        autocomplete="current-password"
        v-model="model.password"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TextInput from '@/components/common/TextInput.vue'
import SelectInput from '@/components/common/SelectInput.vue'
import type { Backend } from '@/types'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'

const model = defineModel<Omit<Backend, 'uuid'>>({ required: true })
</script>
