<template>
  <div
    class="relative h-20"
    ref="cardRef"
    @click="handlerGroupClick"
  >
    <div
      v-if="activeMode"
      class="fixed inset-0 z-40 bg-black/50"
    ></div>
    <div
      class="card absolute left-0 top-0 h-auto w-full bg-base-100 transition-all duration-200"
      :class="[activeMode ? 'z-50 max-h-[60vh]' : '']"
      :style="[
        activeMode &&
          `--tw-bg-opacity: 1;width: calc(100vw - 1rem); transform: translateY(${translateY}px) translateX(${translateX}px);`,
      ]"
      @contextmenu.prevent.stop="handlerLatencyTest"
    >
      <div class="flex h-20 shrink-0 flex-col gap-1 p-2">
        <ProxyIcon
          v-if="proxyGroup.icon"
          :icon="proxyGroup.icon"
          size="small"
          class="absolute right-2 top-2 h-10 !w-10"
          :class="!activeMode && 'opacity-60'"
        />
        <div class="text-md truncate">
          {{ proxyGroup.name }}
        </div>
        <div class="h-4 truncate text-xs text-base-content/80">
          {{ proxyGroup.now }}
        </div>

        <div class="flex h-4 justify-between gap-1">
          <span class="text-xs text-base-content/60">
            {{ proxyGroup.type }} ({{ proxiesCount }})
          </span>
          <button
            v-if="manageHiddenGroup"
            class="btn btn-circle btn-xs z-10 ml-1"
            @click.stop="handlerGroupToggle"
          >
            <EyeIcon
              v-if="!hiddenGroupMap[proxyGroup.name]"
              class="h-3 w-3"
            />
            <EyeSlashIcon
              v-else
              class="h-3 w-3"
            />
          </button>
          <LatencyTag
            :class="twMerge('z-10 bg-base-200/40 hover:shadow')"
            :loading="isLatencyTesting"
            :name="proxyGroup.now"
            :group-name="proxyGroup.name"
            @click.stop="handlerLatencyTest"
          />
        </div>
      </div>

      <div
        v-if="activeMode"
        class="grid flex-1 grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden p-2"
      >
        <ProxyNodeCard
          v-for="node in renderProxies"
          :key="node"
          :name="node"
          :group-name="proxyGroup.name"
          :active="node === proxyGroup.now"
          @click="handlerProxySelect(node)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRenderProxies } from '@/composables/renderProxies'
import { PROXY_TYPE } from '@/constant'
import { hiddenGroupMap, proxyGroupLatencyTest, proxyMap, selectProxy } from '@/store/proxies'
import { manageHiddenGroup } from '@/store/settings'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed, ref } from 'vue'
import LatencyTag from './LatencyTag.vue'
import ProxyIcon from './ProxyIcon.vue'
import ProxyNodeCard from './ProxyNodeCard.vue'

const props = defineProps<{
  name: string
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxies(allProxies, props.name)
const isLatencyTesting = ref(false)

const activeMode = ref(false)
const cardRef = ref()

const translateY = ref(0)
const translateX = ref(0)

const handlerGroupClick = async () => {
  if (!activeMode.value) {
    const { left, top, right, width } = cardRef.value.getBoundingClientRect()

    if (top < window.innerHeight * 0.25) {
      translateY.value = window.innerHeight * 0.25 - top
    } else {
      translateY.value = (top - window.innerHeight * 0.25) * -1
    }
    if (left < window.innerWidth / 3) {
      translateX.value = 0
    } else {
      translateX.value = ((window.innerWidth - right) / 2 + width) * -1
    }
  }
  activeMode.value = !activeMode.value
  cardRef.value.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  isLatencyTesting.value = true
  try {
    await proxyGroupLatencyTest(props.name)
    isLatencyTesting.value = false
  } catch {
    isLatencyTesting.value = false
  }
}
const handlerGroupToggle = () => {
  hiddenGroupMap.value[props.name] = !hiddenGroupMap.value[props.name]
}

const handlerProxySelect = (name: string) => {
  if (proxyGroup.value.type.toLowerCase() === PROXY_TYPE.LoadBalance) return

  selectProxy(props.name, name)
}
</script>
