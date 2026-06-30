<template>
  <DialogWrapper
    v-model="isOpen"
    :title="$t('proxyGroupChain')"
    boxClass="w-[40rem] max-w-[95vw]"
  >
    <div class="flex flex-col gap-3">
      <!-- Breadcrumb of the selected chain; click a layer to focus it. -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          class="btn btn-xs"
          :disabled="currentPathIndex <= 0"
          @click="goParent"
        >
          {{ $t('backToParent') }}
        </button>
        <button
          class="btn btn-xs"
          :disabled="currentPathIndex <= 0"
          @click="goRoot"
        >
          {{ $t('backToRoot') }}
        </button>
        <div class="bg-base-content/15 mx-1 h-4 w-px" />
        <template
          v-for="(name, index) in fullPath"
          :key="`${name}-${index}`"
        >
          <button
            class="rounded px-2 py-1 text-xs"
            :class="
              index === currentPathIndex
                ? 'bg-primary text-primary-content font-medium'
                : 'bg-base-200/70 hover:bg-base-300 cursor-pointer'
            "
            @click="currentGroupName = name"
          >
            {{ name }}
          </button>
          <ChevronRightIcon
            v-if="index < fullPath.length - 1"
            class="text-base-content/35 h-3.5 w-3.5 shrink-0"
          />
        </template>
      </div>

      <!-- Currently focused group -->
      <div class="flex min-w-0 items-center gap-2">
        <span class="text-base-content/55 text-xs">{{ $t('currentProxyGroup') }}</span>
        <span class="truncate text-sm font-semibold">{{ currentGroupName }}</span>
        <span class="text-base-content/45 text-xs">{{ currentGroup?.type }}</span>
      </div>

      <!-- Child groups: click selects it as the outbound and drills in. -->
      <section v-if="childGroups.length">
        <div class="text-base-content/60 mb-2 text-xs font-medium">
          {{ $t('childProxyGroups') }}
        </div>
        <div class="grid min-w-0 gap-2 md:grid-cols-2">
          <button
            v-for="name in childGroups"
            :key="name"
            class="border-base-300/70 bg-base-200 hover:bg-base-300 flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors"
            :class="
              name === currentGroup?.now &&
              'ring-primary/70 ring-offset-base-100 ring-2 ring-offset-1'
            "
            @click="enterChildGroup(name)"
          >
            <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ name }}</span>
            <span class="text-base-content/45 shrink-0 text-xs">{{ proxyMap[name]?.type }}</span>
            <ChevronRightIcon class="text-base-content/55 h-4 w-4 shrink-0" />
          </button>
        </div>
      </section>

      <!-- Plain proxy nodes of the focused group -->
      <section>
        <div class="text-base-content/60 mb-2 text-xs font-medium">{{ $t('proxyNodes') }}</div>
        <ProxyNodeGrid v-if="nodeProxies.length">
          <ProxyNodeCard
            v-for="node in nodeProxies"
            :key="node"
            :name="node"
            :group-name="currentGroupName"
            :active="node === currentGroup?.now"
            @click.stop="handlerProxySelect(currentGroupName, node)"
          />
        </ProxyNodeGrid>
        <div
          v-else
          class="text-base-content/55 bg-base-200/45 rounded-md px-3 py-2 text-sm"
        >
          {{ $t('noData') }}
        </div>
      </section>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { handlerProxySelect, proxyMap } from '@/assembly/proxies'
import {
  closeProxyGroupChain,
  getChildProxyGroupNames,
  proxyGroupChainFocus,
  proxyGroupChainTarget,
} from '@/composables/proxyGroupChain'
import { useRenderProxyList } from '@/composables/renderProxies'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'

const rootName = computed(() => proxyGroupChainTarget.value)

const isOpen = computed({
  get: () => Boolean(proxyGroupChainTarget.value),
  set: (val: boolean) => {
    if (!val) {
      closeProxyGroupChain()
    }
  },
})

const fullPath = ref<string[]>([])
const currentGroupName = ref('')

const currentGroup = computed(() => proxyMap.value[currentGroupName.value])
const currentPathIndex = computed(() => fullPath.value.indexOf(currentGroupName.value))
const allProxies = computed(() => currentGroup.value?.all ?? [])
const { renderProxies } = useRenderProxyList(allProxies)
const childGroups = computed(() => getChildProxyGroupNames(currentGroupName.value))
const nodeProxies = computed(() => {
  const childSet = new Set(childGroups.value)

  return renderProxies.value.filter((name) => !childSet.has(name))
})

// Follow the current selection (.now) downwards to the deepest group to get
// the full chain for the breadcrumb.
const getNextGroupName = (groupName: string) => {
  const group = proxyMap.value[groupName]
  const children = getChildProxyGroupNames(groupName)

  if (group?.now && children.includes(group.now)) {
    return group.now
  }

  return children[0] ?? ''
}

const buildDeepestPath = (root: string) => {
  const nextPath = [root]
  const visited = new Set(nextPath)
  let currentName = root

  while (true) {
    const nextName = getNextGroupName(currentName)

    if (!nextName || visited.has(nextName)) {
      break
    }

    nextPath.push(nextName)
    visited.add(nextName)
    currentName = nextName
  }

  return nextPath
}

const openTo = (root: string, focus: string) => {
  const path = buildDeepestPath(root)
  fullPath.value = path
  currentGroupName.value = focus && path.includes(focus) ? focus : (path[path.length - 1] ?? root)
}

watch(
  rootName,
  (root) => {
    if (root) {
      openTo(root, proxyGroupChainFocus.value)
    }
  },
  { immediate: true },
)

const enterChildGroup = async (name: string) => {
  await handlerProxySelect(currentGroupName.value, name)
  openTo(rootName.value, name)
}

const goParent = () => {
  if (currentPathIndex.value <= 0) {
    return
  }

  currentGroupName.value = fullPath.value[currentPathIndex.value - 1] ?? rootName.value
}

const goRoot = () => {
  currentGroupName.value = rootName.value
}
</script>
