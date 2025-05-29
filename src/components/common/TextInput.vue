<template>
  <div class="relative">
    <XMarkIcon
      v-if="beforeClose && clearable"
      class="absolute top-2 right-2 z-10 h-4 w-3 cursor-pointer hover:scale-125"
      @click="clearInput"
    />
    <input
      v-model="inputValue"
      type="text"
      :class="['input input-sm join-item w-full', { 'pr-6': clearable }]"
      :placeholder="placeholder || ''"
      :name="name || ''"
      :autocomplete="autocomplete || ''"
      @click="handlerSearchInputClick"
      @input="(emits('input', inputValue || ''), hideTip())"
      @change="emits('change', inputValue || '')"
    />
    <XMarkIcon
      v-if="!beforeClose && clearable"
      class="absolute top-2 right-2 z-10 h-4 w-3 cursor-pointer hover:scale-125"
      @click="clearInput"
    />
  </div>
</template>

<script lang="ts" setup>
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useTooltip } from '@renderer/helper/tooltip'
import { createApp, defineComponent, h } from 'vue'

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
  menus?: string[]
  menusDeleteable?: boolean
}>()

const inputValue = defineModel<string>()
const clearInput = () => {
  inputValue.value = ''
}

const { showTip, hideTip } = useTooltip()

const handlerSearchInputClick = (e: Event) => {
  if (!props.menus?.length) {
    return
  }
  const PopContent = defineComponent({
    props: {
      menus: {
        type: Array,
        default: () => [],
      },
      menusDeleteable: {
        type: Boolean,
        default: false,
      },
    },
    setup(props: { menus: string[]; menusDeleteable: boolean }) {
      return () =>
        h(
          'div',
          { class: 'max-h-64 overflow-y-auto overflow-x-hidden scrollbar-hidden min-w-24' },
          props.menus.map((item) =>
            h('div', { class: 'cursor-pointer p-1 flex gap-2 items-center' }, [
              h(
                'span',
                {
                  class: 'flex-1 transition-transform hover:scale-105 hover:text-primary',
                  onClick: () => {
                    inputValue.value = item
                    hideTip()
                  },
                },
                item,
              ),
              props.menusDeleteable &&
                h(XMarkIcon, {
                  class: 'h-3 w-3 transition-transform hover:scale-125',
                  onClick: () => {
                    emits(
                      'update:menus',
                      props.menus.filter((menu) => menu !== item),
                    )
                    hideTip()
                  },
                }),
            ]),
          ),
        )
    },
  })
  const mountEl = document.createElement('div')
  const app = createApp(PopContent, { menus: props.menus, menusDeleteable: props.menusDeleteable })

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
