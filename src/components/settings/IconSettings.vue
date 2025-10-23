<template>
  <div class="flex items-center gap-2">
    {{ $t('customIcon') }}
    <template v-if="iconReflectList.length"> ({{ iconReflectList.length }}) </template>
    <button
      v-if="iconReflectList.length"
      class="btn btn-sm btn-circle"
      @click="dialogVisible = !dialogVisible"
    >
      <ChevronUpIcon
        v-if="dialogVisible"
        class="h-4 w-4"
      />
      <ChevronDownIcon
        v-else
        class="h-4 w-4"
      />
    </button>
  </div>
  <div
    class="transparent-collapse collapse rounded-none shadow-none"
    :class="dialogVisible ? 'collapse-open' : ''"
  >
    <div class="collapse-content p-0">
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
        <template v-if="dialogVisible">
          <div
            v-for="iconReflect in iconReflectList"
            :key="iconReflect.uuid"
            class="flex items-center gap-2"
          >
            <TextInput
              v-model="iconReflect.name"
              :placeholder="$t('groupName')"
            />
            <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
            <TextInput
              v-model="iconReflect.icon"
              placeholder="Icon URL"
            />
            <button
              class="btn btn-sm btn-circle"
              @click="removeIconReflect(iconReflect.uuid)"
            >
              <TrashIcon class="h-4 w-4 shrink-0" />
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
  <div class="flex items-center gap-2">
    <TextInput
      v-model="newIconReflect.name"
      class="w-32"
      placeholder="Name"
      :menus="
        proxyGroupList.filter((group) => !iconReflectList.some((item) => item.name === group))
      "
      @keydown.enter="addIconReflect"
    />
    <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
    <TextInput
      v-model="newIconReflect.icon"
      placeholder="Icon URL"
      @keydown.enter="addIconReflect"
    />
    <button
      class="btn btn-sm btn-circle"
      @click="addIconReflect"
    >
      <PlusIcon class="h-4 w-4 shrink-0" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { proxyGroupList } from '@/store/proxies'
import { iconReflectList } from '@/store/settings'
import {
  ArrowRightCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useSessionStorage } from '@vueuse/core'
import { v4 as uuid } from 'uuid'
import { reactive } from 'vue'
import TextInput from '../common/TextInput.vue'

const dialogVisible = useSessionStorage('cache/icon-dialog-visible', false)
const newIconReflect = reactive({
  name: '',
  icon: '',
})

const addIconReflect = () => {
  if (!newIconReflect.name || !newIconReflect.icon) return
  dialogVisible.value = true
  iconReflectList.value.push({ ...newIconReflect, uuid: uuid() })
  newIconReflect.name = ''
  newIconReflect.icon = ''
}

const removeIconReflect = (uuid: string) => {
  const index = iconReflectList.value.findIndex((item) => item.uuid === uuid)
  iconReflectList.value.splice(index, 1)
}
</script>
