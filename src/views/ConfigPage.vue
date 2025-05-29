<template>
  <div class="flex h-full flex-col gap-1 overflow-x-hidden p-2">
    <div class="card">
      <div class="card-title justify-between px-4 pt-4">
        {{ $t('config') }}
        <button
          class="btn btn-sm btn-neutral"
          @click="showImportModal = true"
        >
          {{ $t('addConfig') }}
        </button>
      </div>
      <div class="card-body">
        <div
          class="grid gap-2 overflow-x-hidden overflow-y-auto"
          :style="`grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));`"
        >
          <div
            v-for="config in configList"
            :key="config.name"
            class="card h-18 cursor-pointer shadow-none"
            :class="
              config.isActive
                ? 'bg-primary text-primary-content'
                : 'bg-base-200 text-base-content hover:bg-base-300'
            "
            @click="handleSelectConfig(config.name)"
          >
            <div class="truncate p-2">
              {{ config.name }}
            </div>
            <div class="flex w-full items-center justify-end px-2">
              <button
                v-if="config.type === 'remote'"
                class="btn btn-circle btn-ghost btn-sm"
                @click="handleUpdateConfig(config.name)"
              >
                <ArrowPathIcon class="h-4 w-4" />
              </button>
              <button
                class="btn btn-circle btn-ghost btn-sm"
                @click="handleDeleteConfig(config.name)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ConfigEditor />
    <ConfigImportModal v-model="showImportModal" />
  </div>
</template>

<script setup lang="ts">
import { deleteConfigAPI, setActiveConfigAPI, updateConfigAPI } from '@/renderer/src/api/ipc-invoke'
import {
  configList,
  fetchConfigFileWithName,
  fetchConfigList,
} from '@/renderer/src/store/ipc-store'
import { ArrowPathIcon, TrashIcon } from '@heroicons/vue/24/outline'
import ConfigEditor from '@renderer/components/config/ConfigEditor.vue'
import ConfigImportModal from '@renderer/components/config/ConfigImportModal.vue'
import { onMounted, ref } from 'vue'

const showImportModal = ref(false)

const handleUpdateConfig = async (name: string) => {
  await updateConfigAPI(name)
  fetchConfigList()
}

const handleDeleteConfig = async (name: string) => {
  await deleteConfigAPI(name)
  fetchConfigList()
}

const handleSelectConfig = async (name: string) => {
  await setActiveConfigAPI(name)
  fetchConfigFileWithName(name)
  fetchConfigList()
}

onMounted(async () => {
  fetchConfigList()
})
</script>
