<template>
  <div class="flex h-full flex-col gap-1 overflow-x-hidden p-2">
    <div class="card">
      <div class="card-title justify-between px-4 pt-4">
        {{ $t('config') }}
      </div>
      <div class="card-body">
        <div class="flex gap-2">
          <input
            class="input input-sm flex-1"
            :placeholder="$t('pantheon.subscriptionURL')"
            v-model="configURL"
          />
          <button
            class="btn btn-sm"
            @click="handleAddRemoteConfig"
          >
            {{ $t('pantheon.downloadConfig') }}
          </button>
          <button
            class="btn btn-sm"
            @click="handleAddLocalConfig"
          >
            {{ $t('pantheon.importConfig') }}
          </button>
          <input
            type="file"
            class="hidden"
            ref="configFileInput"
            @change="handleAddLocalConfigUploaded"
          />
        </div>
        <div
          class="grid gap-2 overflow-x-hidden overflow-y-auto"
          :style="`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));`"
        >
          <div
            v-for="file in configFileList"
            :key="file.name"
            class="card bg-base-200 hover:bg-base-300 h-18 cursor-pointer shadow-none"
            @click="handleSelectConfig(file.name)"
          >
            <div class="flex flex-1 items-center px-2">
              {{ file.name }}
            </div>
            <div class="flex w-full items-center justify-end px-2">
              <button
                v-if="file.type === 'remote'"
                @click="handleUpdateConfig(file.name)"
                class="btn btn-circle btn-ghost btn-sm"
              >
                <ArrowPathIcon class="h-4 w-4" />
              </button>
              <button
                @click="handleDeleteConfig(file.name)"
                class="btn btn-circle btn-ghost btn-sm"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card flex flex-1 overflow-hidden py-2">
      <ConfigEditor />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon, TrashIcon } from '@heroicons/vue/24/outline'
import ConfigEditor from '@renderer/components/config/ConfigEditor.vue'
import { deleteConfigAPI, setActiveConfigAPI, updateConfigAPI } from '@renderer/ipc'
import {
  configFileList,
  fetchConfigFileList,
  fetchConfigFileWithName,
  fetchIsCoreRunning,
  setConfig,
} from '@renderer/store/ipc'
import { onMounted, ref } from 'vue'

const configFileInput = ref()
const configURL = ref('')

const handleAddRemoteConfig = async () => {
  await setConfig({
    url: configURL.value,
    name: new URL(configURL.value).hostname,
    type: 'remote',
  })
  fetchConfigFileList()
}

const handleUpdateConfig = async (name: string) => {
  await updateConfigAPI(name)
  fetchConfigFileList()
}

const handleAddLocalConfig = async () => {
  configFileInput.value.click()
}

const handleAddLocalConfigUploaded = async () => {
  const file = configFileInput.value.files[0]
  await setConfig(
    {
      name: file.name,
      type: 'local',
    },
    URL.createObjectURL(file),
  )
  fetchConfigFileList()
}

const handleDeleteConfig = async (name: string) => {
  await deleteConfigAPI(name)
  fetchConfigFileList()
}

const handleSelectConfig = async (name: string) => {
  await setActiveConfigAPI(name)
  fetchConfigFileWithName(name)
}

onMounted(async () => {
  fetchIsCoreRunning()
  fetchConfigFileList()
})
</script>
