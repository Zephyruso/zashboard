import { configs, updateConfigs } from '@/assembly/config'
import { disconnectByIdAPI } from '@/assembly/connections'
import {
  allProxiesLatencyTest,
  fetchProxies,
  hasSmartGroup,
  proxiesFilter,
  proxiesTabShow,
  proxyGroupList,
  proxyProviederList,
  updateProxyProviderAPI,
} from '@/assembly/proxies'
import { isSingBoxCore } from '@/assembly/version'
import { renderProxiesPageItems } from '@/composables/proxies'
import { isProxyNodeSearchMode, toggleProxySearchMode } from '@/composables/proxySearch'
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { PROXY_SORT_TYPE, PROXY_TAB_TYPE, ROUTE_NAME, SETTINGS_MENU_KEY } from '@/constant'
import { getMinCardWidth } from '@/helper/utils'
import { activeConnections } from '@/store/connections'
import { isProxyFolderModeActive } from '@/store/proxyFolders'
import {
  automaticDisconnection,
  collapseGroupMap,
  disableProxiesPageTextSelect,
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
  GlobeAltIcon,
  RectangleGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { every } from 'lodash'
import { computed, defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CtrlsBar from '../common/CtrlsBar.vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import SegmentedControl from '../common/SegmentedControl.vue'
import TextInput from '../common/TextInput.vue'

export default defineComponent({
  name: 'ProxiesCtrl',
  setup() {
    const { t } = useI18n()
    const router = useRouter()
    const isUpgrading = ref(false)
    const isAllLatencyTesting = ref(false)
    const settingsModel = ref(false)
    const { isLargeCtrlsBar } = useCtrlsBar()
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

    const foldersUiVisible = computed(
      () => isProxyFolderModeActive.value && proxiesTabShow.value === PROXY_TAB_TYPE.PROXIES,
    )

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
      if (isSingBoxCore.value && automaticDisconnection.value) {
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
      return renderProxiesPageItems.value.some((name) => collapseGroupMap.value[name])
    })

    const handlerClickToggleCollapse = () => {
      collapseGroupMap.value = Object.fromEntries(
        renderProxiesPageItems.value.map((name) => [name, !hasNotCollapsed.value]),
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
        <SegmentedControl
          modelValue={proxiesTabShow.value}
          onUpdate:modelValue={(value) => (proxiesTabShow.value = value as PROXY_TAB_TYPE)}
          options={tabsWithNumbers.value.map(({ type, count }) => ({
            value: type,
            label: t(type),
            count,
          }))}
        />
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
          class={['select select-sm', isLargeCtrlsBar.value ? 'min-w-40' : 'min-w-24']}
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

      const searchPlaceholder = isProxyNodeSearchMode.value
        ? `${t('searchProxyNode')} | Regex`
        : `${t('searchProxyGroup')} | Regex`
      const searchInput = (
        <div class={['relative w-32 flex-1', isLargeCtrlsBar.value && 'max-w-80']}>
          <button
            class="btn btn-circle btn-ghost btn-xs absolute top-1/2 left-1 z-20 h-6 min-h-6 w-6 -translate-y-1/2 p-0"
            title={
              isProxyNodeSearchMode.value ? t('proxySearchModeGlobal') : t('proxySearchModeGroup')
            }
            onClick={toggleProxySearchMode}
          >
            {isProxyNodeSearchMode.value ? (
              <GlobeAltIcon class="h-3.5 w-3.5" />
            ) : (
              <RectangleGroupIcon class="h-3.5 w-3.5" />
            )}
          </button>
          <TextInput
            v-model={proxiesFilter.value}
            placeholder={searchPlaceholder}
            clearable={true}
            inputClass="pl-7"
          />
        </div>
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
            <div class="flex flex-col gap-3 text-sm">
              <div class="settings-grid">
                <div class="setting-item">
                  <div class="setting-item-label">{t('sortBy')}</div>
                  {sort}
                </div>
                {hasSmartGroup.value && (
                  <div class="setting-item">
                    <div class="setting-item-label">{t('useSmartGroupSort')}</div>
                    <input
                      class="toggle"
                      type="checkbox"
                      v-model={useSmartGroupSort.value}
                    />
                  </div>
                )}
                <div class="setting-item">
                  <div class="setting-item-label">{t('groupProxiesByProvider')}</div>
                  <input
                    type="checkbox"
                    class="toggle"
                    v-model={groupProxiesByProvider.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('unavailableProxy')}</div>
                  <input
                    type="checkbox"
                    class="toggle"
                    v-model={hideUnavailableProxies.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('manageHiddenGroup')}</div>
                  <input
                    class="toggle"
                    type="checkbox"
                    v-model={manageHiddenGroup.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('automaticDisconnection')}</div>
                  <input
                    class="toggle"
                    type="checkbox"
                    v-model={automaticDisconnection.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('displayFinalOutbound')}</div>
                  <input
                    class="toggle"
                    type="checkbox"
                    v-model={displayFinalOutbound.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('disableProxiesPageTextSelect')}</div>
                  <input
                    class="toggle"
                    type="checkbox"
                    v-model={disableProxiesPageTextSelect.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('minProxyCardWidth')}</div>
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
              </div>
              <div class="divider m-0"></div>
              <button
                class="btn btn-block"
                onClick={() => {
                  settingsModel.value = false
                  router.push({
                    name: ROUTE_NAME.settings,
                    query: { scrollTo: SETTINGS_MENU_KEY.proxies },
                  })
                }}
              >
                {t('moreSettings')}
              </button>
            </div>
          </DialogWrapper>
        </>
      )

      const content = !isLargeCtrlsBar.value ? (
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
      ) : (
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

      return <CtrlsBar solid={foldersUiVisible.value}>{content}</CtrlsBar>
    }
  },
})
