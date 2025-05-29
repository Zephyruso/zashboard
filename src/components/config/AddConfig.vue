<template>
  <div class="flex flex-1 flex-col gap-1 overflow-x-hidden p-2">
    <input
      class="input input-sm w-full"
      v-model="configName"
    />
    <VueMonacoEditor
      v-model:value="configFile"
      :theme="isDarkTheme ? 'vs-dark' : 'vs'"
      language="json"
    />
  </div>
</template>

<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { isDarkTheme } from '@renderer/helper/utils'
import { ref } from 'vue'

const configName = ref('')
const configFile = ref('')
</script>
