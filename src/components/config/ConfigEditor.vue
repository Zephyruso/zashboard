<template>
  <div class="flex flex-1 flex-col gap-1 overflow-x-hidden">
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
import { configFile, fetchRunningConfigFile } from '@renderer/store/ipc'

fetchRunningConfigFile()
</script>
