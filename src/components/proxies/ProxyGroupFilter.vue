<template>
  <div
    class="relative flex items-center"
    @click.stop
  >
    <button
      v-if="!showInput"
      class="btn btn-circle btn-ghost btn-xs text-base-content/70 hover:text-base-content opacity-0 transition-all duration-200 group-hover:opacity-100 [@media(any-pointer:coarse)]:opacity-100"
      @click.stop="handlerShowInput"
    >
      <MagnifyingGlassIcon class="h-3.5 w-3.5" />
    </button>
    <div
      class="relative min-w-0 flex-1 overflow-hidden transition-all duration-200 ease-out"
      :class="showInput ? 'max-w-32 opacity-100' : 'max-w-0 opacity-0'"
    >
      <input
        ref="inputRef"
        v-model="keyword"
        type="text"
        class="border-base-300 h-7 w-full min-w-0 border-b text-xs outline-none"
        :placeholder="placeholder || `${t('search')} | Regex`"
        @blur="handlerBlur"
        @keydown.escape="handlerReset"
      />
      <button
        class="btn btn-ghost btn-circle btn-xs absolute top-1/2 right-0 h-5 min-h-5 w-5 -translate-y-1/2 p-0"
        @click.stop="handlerReset"
      >
        <XMarkIcon class="h-3 w-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { proxyGroupFilterMap } from '@/store/settings'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  groupName: string
  placeholder?: string
}>()

const { t } = useI18n()
const inputRef = ref<HTMLInputElement | null>(null)
const keyword = computed({
  get: () => proxyGroupFilterMap.value[props.groupName] ?? '',
  set: (value: string) => {
    proxyGroupFilterMap.value[props.groupName] = value
  },
})
const showInput = ref(Boolean(keyword.value.trim()))

const handlerShowInput = async () => {
  showInput.value = true
  await nextTick()
  inputRef.value?.focus()
}

const handlerReset = () => {
  keyword.value = ''
  delete proxyGroupFilterMap.value[props.groupName]
  showInput.value = false
}

const handlerBlur = () => {
  if (!keyword.value.trim()) {
    showInput.value = false
  }
}
</script>
