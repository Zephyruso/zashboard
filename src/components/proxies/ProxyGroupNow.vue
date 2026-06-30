<template>
  <div class="flex flex-1 items-center gap-1 truncate">
    <template v-if="proxyGroup.now">
      <Component
        class="text-base-content/40 h-3.5 w-3.5 shrink-0 outline-none"
        :is="isFixed ? LockClosedIcon : ArrowRightCircleIcon"
        @mouseenter="tipForFixed"
      />
      <ProxyName
        :name="proxyGroup.now"
        :class="
          isNowAGroup && 'hover:bg-base-300 hover:-mx-1 hover:rounded-lg hover:px-1 hover:shadow'
        "
        class="text-base-content text-xs font-medium md:text-sm"
        @click="handlerClickNow"
      />
      <template v-if="finalOutbound && displayFinalOutbound">
        <ArrowRightCircleIcon class="text-base-content/40 h-3.5 w-3.5 shrink-0" />
        <ProxyName
          :name="finalOutbound"
          class="text-base-content text-xs font-medium md:text-sm"
        />
      </template>
    </template>
    <template v-else-if="proxyGroup.type.toLowerCase() === PROXY_TYPE.LoadBalance">
      <CheckCircleIcon class="text-base-content/40 h-3.5 w-3.5 shrink-0" />
      <span class="text-base-content text-xs font-medium md:text-sm">
        {{ $t('loadBalance') }}
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { openProxyGroupChain } from '@/composables/proxyGroupChain'
import { PROXY_TYPE } from '@/constant'
import { useTooltip } from '@/helper/tooltip'
import { getNowProxyNodeName, proxyGroupList, proxyMap } from '@/assembly/proxies'
import { displayFinalOutbound } from '@/store/settings'
import { ArrowRightCircleIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProxyName from './ProxyName.vue'

const props = defineProps<{
  name: string
  mobile?: boolean
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const { showTip } = useTooltip()
const { t } = useI18n()

const isFixed = computed(() => {
  return proxyGroup.value.fixed === proxyGroup.value.now
})

const tipForFixed = (e: Event) => {
  if (!isFixed.value) {
    return
  }

  showTip(e, t('tipForFixed', { type: proxyGroup.value.type }), {
    delay: [500, 0],
  })
}

const isNowAGroup = computed(() => {
  return proxyGroupList.value.includes(proxyGroup.value.now)
})

const finalOutbound = computed(() => {
  const now = getNowProxyNodeName(proxyGroup.value.now)

  if (now === proxyGroup.value.now) {
    return ''
  }

  return now
})

const handlerClickNow = (e: Event) => {
  if (isNowAGroup.value) {
    e.stopPropagation()
    openProxyGroupChain(props.name)
  }
}
</script>
