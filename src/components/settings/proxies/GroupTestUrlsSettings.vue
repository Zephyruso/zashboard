<template>
  <div class="setting-item">
    <div class="setting-item-label">
      {{ $t('groupTestUrls') }}
      <template v-if="groupTestUrls.length"> ({{ groupTestUrls.length }}) </template>
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
        :aria-label="$t('groupTestUrlsTip')"
        :title="$t('groupTestUrlsTip')"
        @mouseenter="groupTestUrlsTip"
        @focus="groupTestUrlsTip"
      >
        <QuestionMarkCircleIcon
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
    </div>
    <button
      type="button"
      class="btn btn-sm"
      :aria-label="$t('editGroupTestUrls')"
      :title="$t('editGroupTestUrls')"
      @click="dialogVisible = true"
    >
      <PencilSquareIcon
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>
  </div>

  <DialogWrapper
    v-model="dialogVisible"
    :title="$t('groupTestUrls')"
  >
    <div class="flex flex-col gap-2 text-sm">
      <div class="grid grid-cols-1 gap-2">
        <template v-if="dialogVisible">
          <div
            v-for="groupTestUrl in groupTestUrls"
            :key="groupTestUrl.uuid"
            class="flex items-center gap-2"
          >
            <TextInput
              class="w-32"
              v-model="groupTestUrl.name"
              :clearable="true"
              :placeholder="$t('groupName')"
            />
            <ArrowRightCircleIcon
              class="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <TextInput
              class="max-w-96 flex-1"
              v-model="groupTestUrl.url"
              :clearable="true"
              :placeholder="$t('speedtestUrl')"
            />
            <button
              type="button"
              class="btn btn-sm btn-circle touch-target"
              :aria-label="$t('deleteGroupTestUrl')"
              :title="$t('deleteGroupTestUrl')"
              @click="removeGroupTestUrl(groupTestUrl.uuid)"
            >
              <TrashIcon
                class="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            </button>
          </div>
        </template>
      </div>
      <div class="flex items-center gap-2">
        <TextInput
          class="w-32"
          v-model="newGroupTestUrl.name"
          :placeholder="$t('groupName')"
          :menus="
            proxyGroupList.filter((group) => !groupTestUrls.some((item) => item.name === group))
          "
          @keydown.enter="() => addGroupTestUrl()"
        />
        <ArrowRightCircleIcon
          class="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <TextInput
          class="max-w-96 flex-1"
          v-model="newGroupTestUrl.url"
          :clearable="true"
          :placeholder="$t('speedtestUrl')"
          @keydown.enter="() => addGroupTestUrl()"
        />
        <button
          type="button"
          class="btn btn-sm btn-circle touch-target"
          :aria-label="$t('addGroupTestUrl')"
          :title="$t('addGroupTestUrl')"
          @click="() => addGroupTestUrl()"
        >
          <PlusIcon
            class="h-4 w-4 shrink-0"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { useTooltip } from '@/helper/tooltip'
import { proxyGroupList } from '@/store/proxies'
import { groupTestUrls } from '@/store/settings'
import {
  ArrowRightCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useSessionStorage } from '@vueuse/core'
import { v4 as uuid } from 'uuid'
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogWrapper from '../../common/DialogWrapper.vue'
import TextInput from '../../common/TextInput.vue'

const { showTip } = useTooltip()
const { t } = useI18n()

const dialogVisible = useSessionStorage('cache/group-test-urls-dialog-visible', false)
const newGroupTestUrl = reactive({
  name: '',
  url: '',
})

const groupTestUrlsTip = (e: Event) => {
  return showTip(e, t('groupTestUrlsTip'))
}

const resetNewGroupTestUrl = () => {
  newGroupTestUrl.name = ''
  newGroupTestUrl.url = ''
}

const addGroupTestUrl = (keepDialogOpen = true) => {
  if (!newGroupTestUrl.name || !newGroupTestUrl.url) return
  dialogVisible.value = keepDialogOpen
  groupTestUrls.value.push({ ...newGroupTestUrl, uuid: uuid() })
  resetNewGroupTestUrl()
}

const removeGroupTestUrl = (uuid: string) => {
  groupTestUrls.value = groupTestUrls.value.filter((item) => item.uuid !== uuid)
}

watch(dialogVisible, (visible, wasVisible) => {
  if (!visible && wasVisible) {
    addGroupTestUrl(false)
  }
})
</script>
