<template>
  <div ref="containerRef">
    <div :class="gridClass">
      <div
        v-for="(port, index) in ports"
        :key="port.key"
        class="rounded-box bg-base-200/50 grid gap-1.5 p-2.5"
        :class="getPortTileLayoutClass(index)"
      >
        <label
          :for="`port-${port.key}`"
          class="text-base-content/55 truncate text-xs font-semibold"
        >
          {{ $t(port.label) }}
        </label>
        <input
          :id="`port-${port.key}`"
          :value="configs?.[port.key] ?? ''"
          class="input input-sm border-transparent text-center shadow-none"
          type="number"
          inputmode="numeric"
          min="0"
          max="65535"
          @change="handleChange(port.key, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { configs, updateConfigs } from '@/assembly/config'
import { useElementSize } from '@vueuse/core'
import { computed, ref } from 'vue'

type PortKey = 'mixed-port' | 'port' | 'socks-port' | 'redir-port' | 'tproxy-port'

type PortItem = {
  label: string
  key: PortKey
}

const ports: PortItem[] = [
  {
    label: 'mixedPort',
    key: 'mixed-port',
  },
  {
    label: 'httpPort',
    key: 'port',
  },
  {
    label: 'socksPort',
    key: 'socks-port',
  },
  {
    label: 'redirPort',
    key: 'redir-port',
  },
  {
    label: 'tproxyPort',
    key: 'tproxy-port',
  },
]

const containerRef = ref<HTMLElement | null>(null)
const { width } = useElementSize(containerRef)

const layoutMode = computed(() => {
  if (width.value >= 560) return 'five'
  if (width.value >= 320) return 'three-two'
  return 'two-two-one'
})

const gridClass = computed(() => {
  if (layoutMode.value === 'five') {
    return 'grid grid-cols-5 gap-2'
  }

  if (layoutMode.value === 'three-two') {
    return 'grid grid-cols-6 gap-2'
  }

  return 'grid grid-cols-2 gap-2'
})

const getPortTileLayoutClass = (index: number) => {
  if (layoutMode.value === 'five') {
    return 'col-span-1'
  }

  if (layoutMode.value === 'three-two') {
    return [
      'col-span-2',
      {
        'col-start-2': index === 3,
        'col-start-4': index === 4,
      },
    ]
  }

  return [
    'col-span-1',
    {
      'col-span-2 w-full max-w-[calc(50%-0.25rem)] justify-self-center': index === 4,
    },
  ]
}

const handleChange = (key: PortKey, event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  updateConfigs({ [key]: Number.isNaN(value) ? 0 : value })
}
</script>
