import { disconnectByIdAPI, isSingBox, updateProxyProviderAPI } from '@/api'
import { renderGroups } from '@/composables/proxies'
import { PROXY_SORT_TYPE, PROXY_TAB_TYPE, ROUTE_NAME } from '@/constant'
import { getMinCardWidth } from '@/helper/utils'
import { configs, updateConfigs } from '@/store/config'
import { activeConnections } from '@/store/connections'
import {
  allProxiesLatencyTest,
  fetchProxies,
  hasSmartGroup,
  proxiesFilter,
  proxiesTabShow,
  proxyGroupList,
  proxyProviederList,
} from '@/store/proxies'
import {
  automaticDisconnection,
  collapseGroupMap,
  displayFinalOutbound,
  groupProxiesByProvider,
  hideUnavailableProxies,
  manageHiddenGroup,
  minProxyCardWidth,
  proxyCardSize,
  proxySortType,
  twoColumnProxyGroup,
  useSmartGroupSort,
} from '@/store/settings'
import {
  ArrowPathIcon,
  BoltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { every } from 'lodash-es'
import { computed, defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DialogWrapper from '../common/DialogWrapper.vue'
import TextInput from '../common/TextInput.vue'

export default defineComponent({
  name: 'ProxiesCtrl',
  props: {
    isLargeCtrlsBar: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const { t } = useI18n()
    const router = useRouter()
    const isUpgrading = ref(false)
    const isAllLatencyTesting = ref(false)
    const settingsModel = ref(false)
    const handlerClickUpdateAllProviders = async () => {
      if (isUpgrading.value) return
      isUpgrading.value = true
      try {
        await Promise.all(
          proxyProviederList.value.map((provider) => updateProxyProviderAPI(provider.name)),
        )
        await fetchProxies()
        isUpgrading.value = false
      } catch {
        await fetchProxies()
        isUpgrading.value = false
      }
    }

    const hasProviders = computed(() => {
      return proxyProviederList.value.length > 0
    })

    const defaultModes = ['direct', 'rule', 'global']
    const modeList = computed(() => {
      return configs.value?.['mode-list'] || configs.value?.['modes'] || defaultModes
    })
    const needTranslateModes = computed(() => {
      return every(modeList.value, (mode) => defaultModes.includes(mode.toLowerCase()))
    })

    const handlerModeChange = (e: Event) => {
      const mode = (e.target as HTMLSelectElement).value
      updateConfigs({ mode })
      if (isSingBox.value && automaticDisconnection.value) {
        activeConnections.value.forEach((connection) => {
          if (connection.rule.includes('clash_mode')) {
            disconnectByIdAPI(connection.id)
          }
        })
      }
    }

    const handlerClickLatencyTestAll = async () => {
      if (isAllLatencyTesting.value) return
      isAllLatencyTesting.value = true
      try {
        await allProxiesLatencyTest()
        isAllLatencyTesting.value = false
      } catch {
        isAllLatencyTesting.value = false
      }
    }

    const hasNotCollapsed = computed(() => {
      return renderGroups.value.some((name) => collapseGroupMap.value[name])
    })

    const handlerClickToggleCollapse = () => {
      collapseGroupMap.value = Object.fromEntries(
        renderGroups.value.map((name) => [name, !hasNotCollapsed.value]),
      )
    }

    const handlerResetProxyCardWidth = () => {
      minProxyCardWidth.value = getMinCardWidth(proxyCardSize.value)
    }

    const tabsWithNumbers = computed(() => {
      return Object.values(PROXY_TAB_TYPE).map((type) => {
        return {
          type,
          count:
            type === PROXY_TAB_TYPE.PROXIES
              ? proxyGroupList.value.length
              : proxyProviederList.value.length,
        }
      })
    })
    return () => {
      const tabs = (
        <div
          role="tablist"
          class="tabs-box tabs tabs-xs"
        >
          {tabsWithNumbers.value.map(({ type, count }) => {
            return (
              <a
                role="tab"
                key={type}
                class={['tab', proxiesTabShow.value === type && 'tab-active']}
                onClick={() => (proxiesTabShow.value = type)}
              >
                {t(type)} ({count})
              </a>
            )
          })}
        </div>
      )
      const upgradeAllIcon = proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER && (
        <button
          class="btn btn-circle btn-sm"
          onClick={handlerClickUpdateAllProviders}
        >
          <ArrowPathIcon class={['h-4 w-4', isUpgrading.value && 'animate-spin']} />
        </button>
      )
      const modeSelect = configs.value && (
        <select
          class={['select select-sm inline-block', props.isLargeCtrlsBar ? 'min-w-40' : 'min-w-24']}
          v-model={configs.value.mode}
          onChange={handlerModeChange}
        >
          {modeList.value.map((mode) => {
            return (
              <option
                key={mode}
                value={mode}
              >
                {needTranslateModes.value ? t(mode.toLowerCase()) : mode}
              </option>
            )
          })}
        </select>
      )
      const sort = (
        <select
          class={['select select-sm']}
          v-model={proxySortType.value}
        >
          {Object.values(PROXY_SORT_TYPE).map((type) => {
            return (
              <option
                key={type}
                value={type}
              >
                {t(type)}
              </option>
            )
          })}
        </select>
      )

      const latencyTestAll = (
        <button
          class="btn btn-circle btn-sm"
          onClick={handlerClickLatencyTestAll}
        >
          {isAllLatencyTesting.value ? (
            <span class="loading loading-spinner loading-sm"></span>
          ) : (
            <BoltIcon class="h-4 w-4" />
          )}
        </button>
      )

      const toggleCollapseAll = (
        <button
          class={[
            'btn btn-circle btn-sm',
            twoColumnProxyGroup.value &&
              proxiesTabShow.value === PROXY_TAB_TYPE.PROXIES &&
              'max-sm:hidden',
          ]}
          onClick={handlerClickToggleCollapse}
        >
          {hasNotCollapsed.value ? (
            <ChevronUpIcon class="h-4 w-4" />
          ) : (
            <ChevronDownIcon class="h-4 w-4" />
          )}
        </button>
      )

      const searchInput = (
        <TextInput
          class={['w-32 flex-1', props.isLargeCtrlsBar && 'max-w-80']}
          v-model={proxiesFilter.value}
          placeholder={`${t('search')} | ${t('searchMultiple')}`}
          clearable={true}
        />
      )

      const settingsModal = (
        <>
          <button
            class="btn btn-circle btn-sm"
            onClick={() => (settingsModel.value = true)}
          >
            <WrenchScrewdriverIcon class="h-4 w-4" />
          </button>
          <DialogWrapper
            v-model={settingsModel.value}
            title={t('proxySettings')}
          >
            <div class="flex flex-col gap-4 p-2 text-sm">
              <div class="flex items-center gap-2">
                {t('sortBy')}
                {sort}
              </div>
              {hasSmartGroup.value && (
                <div class="flex items-center gap-2">
                  {t('useSmartGroupSort')}
                  <input
                    class="toggle"
                    type="checkbox"
                    v-model={useSmartGroupSort.value}
                  />
                </div>
              )}
              <div class="flex items-center gap-2">
                {t('groupProxiesByProvider')}
                <input
                  type="checkbox"
                  class="toggle"
                  v-model={groupProxiesByProvider.value}
                />
              </div>
              <div class="flex items-center gap-2">
                {t('unavailableProxy')}
                <input
                  type="checkbox"
                  class="toggle"
                  v-model={hideUnavailableProxies.value}
                />
              </div>
              <div class="flex items-center gap-2">
                {t('manageHiddenGroup')}
                <input
                  class="toggle"
                  type="checkbox"
                  v-model={manageHiddenGroup.value}
                />
              </div>
              <div class="flex items-center gap-2">
                {t('automaticDisconnection')}
                <input
                  class="toggle"
                  type="checkbox"
                  v-model={automaticDisconnection.value}
                />
              </div>
              <div class="flex items-center gap-2">
                {t('displayFinalOutbound')}
                <input
                  class="toggle"
                  type="checkbox"
                  v-model={displayFinalOutbound.value}
                />
              </div>
              <div class="flex items-center gap-2">
                {t('minProxyCardWidth')}
                <div class="join">
                  <input
                    class="input input-sm join-item w-20"
                    type="number"
                    v-model={minProxyCardWidth.value}
                  />
                  <button
                    class="btn join-item btn-sm"
                    onClick={handlerResetProxyCardWidth}
                  >
                    {t('reset')}
                  </button>
                </div>
              </div>
              <div class="divider m-0"></div>
              <button
                class="btn btn-block"
                onClick={() => {
                  settingsModel.value = false
                  router.push({
                    name: ROUTE_NAME.settings,
                    query: { scrollTo: 'proxies-settings' },
                  })
                }}
              >
                {t('moreSettings')}
              </button>
            </div>
          </DialogWrapper>
        </>
      )

      if (!props.isLargeCtrlsBar) {
        return (
          <div class="flex flex-col gap-2 p-2">
            {hasProviders.value && (
              <div class="flex gap-2">
                {tabs}
                {upgradeAllIcon}
              </div>
            )}
            <div class="flex w-full gap-2">
              {modeSelect}
              {searchInput}
              {settingsModal}
              {toggleCollapseAll}
              {latencyTestAll}
            </div>
          </div>
        )
      }
      return (
        <div class="flex gap-2 p-2">
          {hasProviders.value && tabs}
          {modeSelect}
          <div class="flex flex-1">{searchInput}</div>
          {upgradeAllIcon}
          {settingsModal}
          {toggleCollapseAll}
          {latencyTestAll}
        </div>
      )
    }
  },
})
