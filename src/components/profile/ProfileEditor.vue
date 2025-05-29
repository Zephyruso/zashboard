<template>
  <div
    v-if="isVisible"
    class="bg-base-100 fixed top-0 left-0 z-50 flex h-full w-full flex-col gap-2 overflow-hidden p-4"
    @keydown.ctrl.s.prevent="handleProfileSave"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold">{{ $t('editProfile') }} </span>
        <input
          v-model="profile.name"
          class="input input-sm w-48 font-normal"
        />
        <span
          v-if="isModified"
          class="text-info text-xs opacity-75"
        >
          ({{ $t('unsaved') }})
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-sm btn-primary"
          @click="handleProfileSave"
        >
          {{ $t('save') }}
        </button>
        <button
          class="btn btn-sm btn-neutral"
          @click="handleProfileReset"
        >
          {{ $t('reset') }}
        </button>
        <button
          class="btn btn-sm"
          @click="isVisible = false"
        >
          {{ $t('close') }}
        </button>
      </div>
    </div>

    <VueMonacoEditor
      v-model:value="profileContent"
      :theme="isDarkTheme ? 'vs-dark' : 'vs'"
      language="json"
      @change="handleProfileChange"
    />
    <div
      v-if="profile.type === 'remote'"
      class="flex items-center justify-end gap-2 text-sm"
    >
      <span> url </span>
      <input
        v-model="profile.url"
        class="input input-sm w-108"
      />
      <div class="flex-1"></div>
      <span>
        {{ $t('autoUpdate') }}
      </span>
      <input
        type="checkbox"
        v-model="profile.autoUpdate"
        class="toggle toggle-sm"
      />
      <template v-if="profile.autoUpdate">
        <span>
          {{ $t('updateInterval') }}
        </span>
        <input
          v-model="profile.interval"
          class="input input-sm w-24"
          type="number"
          min="60"
        />
        s
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Profile } from '@/shared/type'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { useNotification } from '@renderer/composables/notification'
import { isDarkTheme } from '@renderer/helper/utils'
import { ref, watch } from 'vue'
import { getProfileContentAPI, writeProfileContentAPI } from '../../api/ipc-invoke'
import { profileList, updateProfile } from '../../store/profiles'

interface Props {
  profileUuid?: string
}

const props = withDefaults(defineProps<Props>(), {
  profileUuid: '',
})

const isVisible = defineModel<boolean>('modelValue', { required: true })

const { showNotification } = useNotification()
const profile = ref<Profile>({
  name: '',
  type: 'remote',
  uuid: '',
  isActive: false,
  autoUpdate: true,
  updatedAt: 0,
  interval: 3600,
  url: '',
})
const profileContent = ref('')
const isModified = ref(false)
const originalProfile = ref('')

const initProfile = async () => {
  if (!props.profileUuid) return

  const targetProfile = profileList.value.find((p) => p.uuid === props.profileUuid) as Profile

  if (!targetProfile) return

  profile.value = { ...targetProfile }
  profileContent.value = await getProfileContentAPI(props.profileUuid)
  originalProfile.value = profileContent.value
  isModified.value = false
}

const handleProfileChange = () => {
  if (originalProfile.value !== '') {
    isModified.value = profileContent.value !== originalProfile.value
  }
}

const handleProfileReset = () => {
  initProfile()
}

const handleProfileSave = async () => {
  if (!props.profileUuid) return

  profileContent.value = profileContent.value.trim()
  writeProfileContentAPI(props.profileUuid, profileContent.value)
  await updateProfile({
    ...profile.value,
    uuid: props.profileUuid,
  })
  showNotification({
    content: 'saveSuccess',
    type: 'alert-success',
    timeout: 2000,
  })
  initProfile()
}

watch(
  () => props.profileUuid,
  async (val, oldVal) => {
    if (val !== oldVal && val !== '') {
      await initProfile()
    }
  },
  { immediate: true },
)
</script>
