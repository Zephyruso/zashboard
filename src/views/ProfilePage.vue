<template>
  <div class="flex h-full flex-col gap-1 overflow-x-hidden p-2">
    <div class="card h-full">
      <div class="card-title justify-between px-4 pt-4">
        {{ $t('profiles') }}
        <div class="flex items-center gap-2">
          <button
            v-if="isCoreRunning"
            class="btn btn-sm"
            @click="previewRuntimeConfig"
          >
            {{ $t('runtimeConfig') }}
          </button>
          <button
            class="btn btn-sm"
            @click="showImportModal = true"
          >
            {{ $t('addProfile') }}
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="divider my-0"></div>
        <div
          class="grid gap-2 overflow-x-hidden overflow-y-auto"
          :style="`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));`"
        >
          <div
            v-for="profile in profileList"
            :key="profile.uuid"
            class="card h-18 cursor-pointer shadow-none"
            :class="
              profile.isActive
                ? 'bg-primary text-primary-content'
                : 'bg-base-200 text-base-content hover:bg-base-300'
            "
            @click="setActiveProfile(profile.uuid)"
          >
            <div class="truncate p-2">
              {{ profile.name }}
            </div>
            <div class="flex w-full items-center justify-end px-2">
              <div
                v-if="profile.type === 'remote'"
                class="flex flex-1 items-center gap-1"
              >
                <span class="text-xs">{{ fromNow(profile.updatedAt) }}</span>
                <button
                  class="btn btn-circle btn-ghost btn-sm"
                  @click.stop="updateRemoteProfile(profile.uuid)"
                >
                  <ArrowPathIcon class="h-4 w-4" />
                </button>
              </div>
              <button
                class="btn btn-circle btn-ghost btn-sm"
                @click.stop="editProfile(profile.uuid)"
              >
                <PencilIcon class="h-4 w-4" />
              </button>
              <button
                class="btn btn-circle btn-ghost btn-sm"
                @click.stop="showDeleteConfirm(profile)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ProfileEditor with slide animation -->
    <Transition name="slide-up">
      <ProfileEditor
        v-model="showEditor"
        :profile-uuid="editingProfileUuid"
        :is-preview-mode="isPreviewMode"
      />
    </Transition>

    <!-- Delete Confirmation Dialog -->
    <DeleteProfileModal
      v-model="showDeleteConfirmModal"
      :profile="profileToDelete"
      @confirm="confirmDeleteProfile"
    />

    <ProfileImportModal v-model="showImportModal" />
  </div>
</template>

<script setup lang="ts">
import DeleteProfileModal from '@/components/profile/DeleteProfileModal.vue'
import ProfileEditor from '@/components/profile/ProfileEditor.vue'
import ProfileImportModal from '@/components/profile/ProfileImportModal.vue'
import { deleteProfile, profileList, setActiveProfile, updateRemoteProfile } from '@/store/profiles'
import { ArrowPathIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { Profile } from '@main/shared/type'
import { ref } from 'vue'
import { fromNow } from '../helper/utils'
import { isCoreRunning } from '../store/status'

const showImportModal = ref(false)
const editingProfileUuid = ref('')
const showEditor = ref(false)
const showDeleteConfirmModal = ref(false)
const profileToDelete = ref<Profile | null>(null)
const isPreviewMode = ref(false)

const editProfile = (profileUuid: string) => {
  editingProfileUuid.value = profileUuid
  isPreviewMode.value = false
  showEditor.value = true
}

const previewRuntimeConfig = () => {
  isPreviewMode.value = true
  showEditor.value = true
}

const showDeleteConfirm = (profile: Profile) => {
  profileToDelete.value = profile
  showDeleteConfirmModal.value = true
}

const confirmDeleteProfile = async () => {
  if (profileToDelete.value) {
    await deleteProfile(profileToDelete.value.uuid)
    profileToDelete.value = null
  }
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
