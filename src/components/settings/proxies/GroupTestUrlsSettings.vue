<template>
  <SettingItem
    :setting-key="PROXIES_ITEM_KEYS.groupTestUrls"
    :when="independentLatencyTest"
  >
    <div class="setting-item-label">
      {{ $t('groupTestUrls') }}
      <template v-if="groupTestUrls.length"> ({{ groupTestUrls.length }}) </template>
      <QuestionMarkCircleIcon
        class="h-4 w-4"
        @mouseenter="groupTestUrlsTip"
      />
    </div>
    <button
      class="btn btn-sm"
      @click="dialogVisible = true"
    >
      <PencilSquareIcon class="h-4 w-4" />
    </button>
  </SettingItem>

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
            <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
            <TextInput
              class="max-w-96 flex-1"
              v-model="groupTestUrl.url"
              :clearable="true"
              :placeholder="$t('speedtestUrl')"
            />
            <button
              class="btn btn-sm btn-circle"
              @click="removeGroupTestUrl(groupTestUrl.uuid)"
            >
              <TrashIcon class="h-4 w-4 shrink-0" />
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
        <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
        <TextInput
          class="max-w-96 flex-1"
          v-model="newGroupTestUrl.url"
          :clearable="true"
          :placeholder="$t('speedtestUrl')"
          @keydown.enter="() => addGroupTestUrl()"
        />
        <button
          class="btn btn-sm btn-circle"
          @click="() => addGroupTestUrl()"
        >
          <PlusIcon class="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import SettingItem from '@/components/settings/SettingItem.vue'
import { PROXIES_ITEM_KEYS } from '@/config/settingsItems'
import { useTooltip } from '@/helper/tooltip'
import { proxyGroupList } from '@/assembly/proxies'
import { groupTestUrls, independentLatencyTest } from '@/store/settings'
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
