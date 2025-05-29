<template>
  <template v-if="proxyGroup.now">
    <LockClosedIcon
      v-if="proxyGroup.fixed === proxyGroup.now"
      class="h-4 w-4 shrink-0"
      @mouseenter="tipForFixed"
    />
    <ArrowRightCircleIcon
      v-else-if="!mobile"
      class="h-4 w-4 shrink-0"
    />

    <ProxyName
      :name="proxyGroup.now"
      @mouseenter="tipForNow"
    />
  </template>
  <template v-else-if="proxyGroup.type.toLowerCase() === PROXY_TYPE.LoadBalance">
    <CheckCircleIcon class="h-4 w-4 shrink-0" />
    {{ $t('loadBalance') }}
  </template>
</template>

<script setup lang="ts">
import { ArrowRightCircleIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import { PROXY_TYPE } from '@renderer/constant'
import { useTooltip } from '@renderer/helper/tooltip'
import { getNowProxyNodeName, proxyMap } from '@renderer/store/proxies'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProxyName from './ProxyName.vue'

const props = defineProps<{
  name: string
  mobile?: boolean
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])

const { showTip } = useTooltip()
const tipForNow = (e: Event) => {
  const nowNode = getNowProxyNodeName(props.name)
  if (!nowNode || nowNode === proxyGroup.value.now || props.mobile) return

  showTip(e, nowNode, {
    delay: [500, 0],
  })
}

const { t } = useI18n()
const tipForFixed = (e: Event) => {
  showTip(e, t('tipForFixed'), {
    delay: [500, 0],
  })
}
</script>
