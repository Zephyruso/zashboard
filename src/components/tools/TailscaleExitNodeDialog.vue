<template>
  <DialogWrapper
    v-model="isOpen"
    :title="$t('exitNode')"
  >
    <div class="flex flex-col gap-3">
      <input
        ref="searchEl"
        class="input input-sm w-full rounded-lg"
        :placeholder="$t('search')"
        v-model="search"
      />
      <div class="divide-base-content/8 bg-base-200/40 divide-y overflow-hidden rounded-xl">
        <button
          class="setting-item hover:bg-base-content/3 active:bg-base-content/5 w-full text-left transition-colors"
          @click="select('')"
        >
          <span class="setting-item-label">{{ $t('disabledLabel') }}</span>
          <CheckIcon
            v-if="current === ''"
            class="text-primary h-4 w-4 shrink-0"
          />
        </button>
        <button
          v-for="peer in filtered"
          :key="peer.stableID"
          class="setting-item hover:bg-base-content/3 active:bg-base-content/5 w-full text-left transition-colors"
          @click="select(peer.stableID)"
        >
          <span
            class="inline-block h-2 w-2 shrink-0 rounded-full"
            :class="peer.online ? 'bg-success' : 'bg-base-content/20'"
          ></span>
          <span class="setting-item-label flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-medium">{{ peerDisplayName(peer) }}</span>
            <span class="text-base-content/40 truncate text-xs">{{ peer.tailscaleIPs[0] }}</span>
          </span>
          <CheckIcon
            v-if="current === peer.stableID"
            class="text-primary h-4 w-4 shrink-0"
          />
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import { getSingboxClient } from '@/assembly/tools'
import { peerDisplayName } from '@/composables/tailscaleSSH'
import type { TailscaleEndpointStatus, TailscalePeer } from '@/gen/daemon/started_service_pb'
import { CheckIcon } from '@heroicons/vue/24/outline'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{ endpoint: TailscaleEndpointStatus; candidates: TailscalePeer[] }>()
const isOpen = defineModel<boolean>()

const searchEl = useTemplateRef<HTMLInputElement>('searchEl')
const search = ref('')

const current = computed(() => props.endpoint.exitNode?.stableID ?? '')

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (query === '') return props.candidates
  return props.candidates.filter(
    (peer) =>
      peerDisplayName(peer).toLowerCase().includes(query) ||
      peer.hostName.toLowerCase().includes(query) ||
      peer.dnsName.toLowerCase().includes(query) ||
      peer.tailscaleIPs.some((address) => address.includes(query)),
  )
})

watch(isOpen, async (open) => {
  if (!open) return
  search.value = ''
  await nextTick()
  searchEl.value?.focus()
})

const select = (stableID: string) => {
  getSingboxClient()?.client.setTailscaleExitNode({
    endpointTag: props.endpoint.endpointTag,
    stableID,
  })
  isOpen.value = false
}
</script>
