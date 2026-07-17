<template>
  <div class="relative">
    <button
      v-if="beforeClose && clearable"
      class="btn btn-ghost btn-circle btn-xs absolute top-1/2 right-1 z-10 h-5 min-h-5 w-5 -translate-y-1/2 p-0"
      @click="clearInput"
    >
      <XMarkIcon class="h-3 w-3" />
    </button>
    <input
      v-model="localValue"
      ref="inputRef"
      type="text"
      :class="['input input-sm join-item w-full', inputClass, { 'pr-6': clearable }]"
      :placeholder="placeholder || ''"
      :name="name || ''"
      :autocomplete="autocomplete || ''"
      @click="handlerSearchInputClick"
      @input="(emits('input', localValue || ''), hideTip())"
      @change="emits('change', localValue || '')"
    />
    <button
      v-if="!beforeClose && clearable"
      class="btn btn-ghost btn-circle btn-xs absolute top-1/2 right-1 h-5 min-h-5 w-5 -translate-y-1/2 p-0"
      @click="clearInput"
    >
      <XMarkIcon class="h-3 w-3" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { useTooltip } from '@/helper/tooltip'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useDebounceFn } from '@vueuse/core'
import { createApp, defineComponent, h, ref, watch } from 'vue'

const emits = defineEmits<{
  (e: 'input', value: string): void
  (e: 'change', value: string): void
  (e: 'update:menus', value: string[]): void
}>()

const props = defineProps<{
  placeholder?: string
  beforeClose?: boolean
  name?: string
  autocomplete?: string
  clearable?: boolean
  inputClass?: string
  menus?: string[]
  menusDeleteable?: boolean
  // 输入防抖(ms):过滤框每 keystroke 会触发下游全量重算,搜索类输入应传 ~200
  debounce?: number
}>()

const inputValue = defineModel<string>()
// 输入元素绑定本地值;向外提交可选防抖。外部写入(清空/切换)立即同步回本地。
const localValue = ref(inputValue.value ?? '')
const commit = (value: string | undefined) => {
  inputValue.value = value
}
const debouncedCommit = props.debounce ? useDebounceFn(commit, props.debounce) : commit

watch(localValue, (value) => debouncedCommit(value))
watch(inputValue, (value) => {
  if ((value ?? '') !== localValue.value) {
    localValue.value = value ?? ''
  }
})

const clearInput = () => {
  inputValue.value = ''
}

const { showTip, hideTip } = useTooltip()
const inputRef = ref<HTMLInputElement>()
const handlerSearchInputClick = (e: Event) => {
  if (!props.menus?.length) {
    return
  }
  const PopContent = defineComponent({
    setup() {
      return () =>
        h(
          'div',
          { class: 'max-h-64 overflow-y-auto overflow-x-hidden scrollbar-hidden min-w-24 py-1' },
          (props.menus ?? []).map((item) =>
            h(
              'div',
              {
                class:
                  'cursor-pointer rounded-sm p-1 px-3 flex gap-2 items-center overflow-hidden hover:bg-base-300',
              },
              [
                h(
                  'span',
                  {
                    class: 'flex-1 truncate',
                    onClick: () => {
                      inputValue.value = item
                      hideTip()
                      inputRef.value?.focus()
                    },
                  },
                  item,
                ),
                props.menusDeleteable &&
                  h(XMarkIcon, {
                    class: 'h-3 w-3 transition-transform hover:scale-125',
                    onClick: () => {
                      const nextMenus = (props.menus ?? []).filter((menu) => menu !== item)

                      emits('update:menus', nextMenus)
                      if (!nextMenus.length) {
                        hideTip()
                      }
                    },
                  }),
              ],
            ),
          ),
        )
    },
  })
  const mountEl = document.createElement('div')
  const app = createApp(PopContent)

  app.mount(mountEl)

  showTip(e, mountEl, {
    theme: 'base',
    placement: 'bottom-start',
    trigger: 'click',
    interactive: true,
    appendTo: document.body,
    arrow: false,
  })
}
</script>
