import { DETECT_TRAY_STORE_UPDATED } from '@main/shared/event'
import { computed, unref, watch } from 'vue'
import { selectProxyAPI } from '../api'
import { updateTrayStoreAPI } from '../api/ipc-invoke'
import { addMessageListener } from '../api/ipc-message'
import { configs, fetchConfigs, updateConfigs } from './config'
import { fetchProxies, proxyGroupList, proxyMap } from './proxies'

const proxyGroupsForTray = computed(() => {
  return proxyGroupList.value.map((group) => ({
    name: group,
    now: proxyMap.value[group].now,
    all: proxyMap.value[group].all ?? [],
  }))
})

watch(
  proxyGroupsForTray,
  (newVal) => {
    updateTrayStoreAPI('proxyGroups', unref(newVal))
  },
  {
    deep: true,
  },
)

const configForTray = computed(() => {
  return {
    mode: configs.value.mode,
    'mode-list': configs.value['mode-list'],
  }
})

watch(configForTray, (newVal) => {
  updateTrayStoreAPI('config', unref(newVal))
})

addMessageListener(DETECT_TRAY_STORE_UPDATED, async (data: { key: string; value: unknown }) => {
  switch (data.key) {
    case 'proxyGroups':
      const { name, now } = data.value as { name: string; now: string }

      await selectProxyAPI(name, now)
      await fetchProxies()
      break
    case 'config':
      const { mode } = data.value as { mode: string }
      await updateConfigs({ mode })
      await fetchConfigs()
      break
  }
})
