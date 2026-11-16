<script setup lang="ts">
import { groupProxiesByProviderName } from '@/helper/render-proxies'
import { computed, onBeforeUnmount, onBeforeUpdate, ref } from 'vue'
import ProxiesContent from './ProxiesContent.vue'

const props = defineProps<{
  name: string
  now: string
  renderProxies: string[]
}>()

const groupedProxies = computed(() => groupProxiesByProviderName(props.renderProxies))

const sections = ref<(InstanceType<typeof ProxiesContent> | null)[]>([])
const observer = new ResizeObserver(() => {
  for (const section of sections.value) {
    section?.syncScrollMargin()
  }
})
const observedSections = new WeakSet<Element>()
const observeSection = (el: Element | null) => {
  if (!el || observedSections.has(el)) return

  observedSections.add(el)
  observer.observe(el)
}

onBeforeUpdate(() => {
  sections.value = []
})
onBeforeUnmount(() => {
  observer.disconnect()
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="({ providerName, proxies }, index) in groupedProxies"
      :key="providerName"
      :ref="(el) => observeSection(el as Element | null)"
    >
      <p
        class="my-2 text-sm font-semibold"
        v-if="providerName !== ''"
      >
        {{ providerName }}
      </p>
      <ProxiesContent
        :ref="(el) => (sections[index] = el as InstanceType<typeof ProxiesContent> | null)"
        :name="name"
        :now="now"
        :render-proxies="proxies"
      />
    </div>
  </div>
</template>
