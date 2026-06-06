import { disconnectByIdAPI, isRequestCanceled, isSingBox, updateProxyProviderAPI } from '@/api'
import { renderProxiesPageItems } from '@/composables/proxies'
import { isProxyNodeSearchMode, toggleProxySearchMode } from '@/composables/proxySearch'
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { PROXY_SORT_TYPE, PROXY_TAB_TYPE, ROUTE_NAME, SETTINGS_MENU_KEY } from '@/constant'
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
import { every } from 'lodash-es'
import { computed, defineComponent, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CtrlsBar from '../common/CtrlsBar.vue'
import DialogWrapper from '../common/DialogWrapper.vue'
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
    let updateAllProvidersController: AbortController | undefined
    let latencyTestAllController: AbortController | undefined
    let modeChangeController: AbortController | undefined
    let updateAllProvidersSeq = 0
    let latencyTestAllSeq = 0
    let modeChangeSeq = 0

    const isCurrentUpdateAllProviders = (controller: AbortController, seq: number) => {
      return updateAllProvidersController === controller && updateAllProvidersSeq === seq
    }

    const isCurrentLatencyTestAll = (controller: AbortController, seq: number) => {
      return latencyTestAllController === controller && latencyTestAllSeq === seq
    }

    const isCurrentModeChange = (controller: AbortController, seq: number) => {
      return modeChangeController === controller && modeChangeSeq === seq
    }

    const handlerClickUpdateAllProviders = async () => {
      if (isUpgrading.value) return

      updateAllProvidersController?.abort()
      const controller = new AbortController()
      const seq = ++updateAllProvidersSeq
      updateAllProvidersController = controller
      isUpgrading.value = true
      try {
        await Promise.allSettled(
          proxyProviederList.value.map((provider) =>
            updateProxyProviderAPI(provider.name, controller.signal),
          ),
        )
        if (isCurrentUpdateAllProviders(controller, seq)) await fetchProxies()
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        try {
          if (isCurrentUpdateAllProviders(controller, seq)) await fetchProxies()
        } catch {
          // The original provider update failure is already surfaced by the request interceptor.
        }
      } finally {
        if (isCurrentUpdateAllProviders(controller, seq)) {
          isUpgrading.value = false
          updateAllProvidersController = undefined
        }
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

    const handlerModeChange = async (e: Event) => {
      const mode = (e.target as HTMLSelectElement).value

      modeChangeController?.abort()
      const controller = new AbortController()
      const seq = ++modeChangeSeq
      modeChangeController = controller
      try {
        await updateConfigs({ mode }, controller.signal)
        if (!isCurrentModeChange(controller, seq)) return
        if (isSingBox.value && automaticDisconnection.value) {
          await Promise.allSettled(
            activeConnections.value
              .filter((connection) => connection.rule.includes('clash_mode'))
              .map((connection) => disconnectByIdAPI(connection.id, controller.signal)),
          )
        }
      } catch (error) {
        if (isRequestCanceled(error)) return
        // Axios interceptor already shows the request error; keep the UI handler settled.
      } finally {
        if (isCurrentModeChange(controller, seq)) {
          modeChangeController = undefined
        }
      }
    }

    const handlerClickLatencyTestAll = async () => {
      if (isAllLatencyTesting.value) return

      latencyTestAllController?.abort()
      const controller = new AbortController()
      const seq = ++latencyTestAllSeq
      latencyTestAllController = controller
      isAllLatencyTesting.value = true
      try {
        await allProxiesLatencyTest(controller.signal)
      } catch {
        if (controller.signal.aborted) return
        // Request interceptor surfaces API failures; keep the toolbar control settled.
      } finally {
        if (isCurrentLatencyTestAll(controller, seq)) {
          isAllLatencyTesting.value = false
          latencyTestAllController = undefined
        }
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

    onBeforeUnmount(() => {
      updateAllProvidersController?.abort()
      latencyTestAllController?.abort()
      modeChangeController?.abort()
      updateAllProvidersSeq += 1
      latencyTestAllSeq += 1
      modeChangeSeq += 1
      updateAllProvidersController = undefined
      latencyTestAllController = undefined
      modeChangeController = undefined
    })

    return () => {
      const tabs = (
        <div
          role="tablist"
          class="tabs-box tabs tabs-xs"
        >
          {tabsWithNumbers.value.map(({ type, count }) => {
            return (
              <button
                type="button"
                role="tab"
                key={type}
                aria-label={`${t(type)} ${count}`}
                aria-selected={proxiesTabShow.value === type}
                class={['tab', proxiesTabShow.value === type && 'tab-active']}
                onClick={() => (proxiesTabShow.value = type)}
              >
                {t(type)} ({count})
              </button>
            )
          })}
        </div>
      )
      const upgradeAllIcon = proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER && (
        <button
          type="button"
          class="btn btn-circle btn-sm shrink-0"
          aria-label={t('updateAllProviders')}
          disabled={isUpgrading.value}
          aria-busy={isUpgrading.value}
          onClick={handlerClickUpdateAllProviders}
        >
          <ArrowPathIcon
            class={['h-4 w-4', isUpgrading.value && 'animate-spin']}
            aria-hidden="true"
          />
        </button>
      )
      const modeSelect = configs.value && (
        <select
          class={['select select-sm', isLargeCtrlsBar.value ? 'min-w-40' : 'min-w-24']}
          aria-label="Mode"
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
          aria-label={t('sortBy')}
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
          type="button"
          class="btn btn-circle btn-sm shrink-0"
          aria-label={t('testAllLatency')}
          disabled={isAllLatencyTesting.value}
          aria-busy={isAllLatencyTesting.value}
          onClick={handlerClickLatencyTestAll}
        >
          {isAllLatencyTesting.value ? (
            <span class="loading loading-spinner loading-sm"></span>
          ) : (
            <BoltIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          )}
        </button>
      )

      const toggleCollapseAll = (
        <button
          type="button"
          class={[
            'btn btn-circle btn-sm shrink-0',
            twoColumnProxyGroup.value &&
              proxiesTabShow.value === PROXY_TAB_TYPE.PROXIES &&
              'max-sm:hidden',
          ]}
          aria-label={t('collapseAll')}
          aria-expanded={hasNotCollapsed.value}
          onClick={handlerClickToggleCollapse}
        >
          {hasNotCollapsed.value ? (
            <ChevronUpIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          ) : (
            <ChevronDownIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          )}
        </button>
      )

      const searchPlaceholder = isProxyNodeSearchMode.value
        ? `${t('searchProxyNode')} | Regex`
        : `${t('searchProxyGroup')} | Regex`
      const proxySearchModeLabel = isProxyNodeSearchMode.value
        ? t('proxySearchModeGlobal')
        : t('proxySearchModeGroup')
      const searchInput = (
        <div class={['relative w-32 flex-1', isLargeCtrlsBar.value && 'max-w-80']}>
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-xs absolute top-1/2 left-1 z-20 h-6 min-h-6 w-6 -translate-y-1/2 p-0"
            aria-label={proxySearchModeLabel}
            title={proxySearchModeLabel}
            onClick={toggleProxySearchMode}
          >
            {isProxyNodeSearchMode.value ? (
              <GlobeAltIcon
                class="h-3.5 w-3.5"
                aria-hidden="true"
              />
            ) : (
              <RectangleGroupIcon
                class="h-3.5 w-3.5"
                aria-hidden="true"
              />
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
            type="button"
            class="btn btn-circle btn-sm shrink-0"
            aria-label={t('settings')}
            onClick={() => (settingsModel.value = true)}
          >
            <WrenchScrewdriverIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
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
                      class="toggle toggle-sm"
                      type="checkbox"
                      aria-label={t('useSmartGroupSort')}
                      v-model={useSmartGroupSort.value}
                    />
                  </div>
                )}
                <div class="setting-item">
                  <div class="setting-item-label">{t('groupProxiesByProvider')}</div>
                  <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    aria-label={t('groupProxiesByProvider')}
                    v-model={groupProxiesByProvider.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('unavailableProxy')}</div>
                  <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    aria-label={t('unavailableProxy')}
                    v-model={hideUnavailableProxies.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('manageHiddenGroup')}</div>
                  <input
                    class="toggle toggle-sm"
                    type="checkbox"
                    aria-label={t('manageHiddenGroup')}
                    v-model={manageHiddenGroup.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('automaticDisconnection')}</div>
                  <input
                    class="toggle toggle-sm"
                    type="checkbox"
                    aria-label={t('automaticDisconnection')}
                    v-model={automaticDisconnection.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('displayFinalOutbound')}</div>
                  <input
                    class="toggle toggle-sm"
                    type="checkbox"
                    aria-label={t('displayFinalOutbound')}
                    v-model={displayFinalOutbound.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('disableProxiesPageTextSelect')}</div>
                  <input
                    class="toggle toggle-sm"
                    type="checkbox"
                    aria-label={t('disableProxiesPageTextSelect')}
                    v-model={disableProxiesPageTextSelect.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('minProxyCardWidth')}</div>
                  <div class="join">
                    <input
                      class="input input-sm join-item w-20"
                      type="number"
                      aria-label={t('minProxyCardWidth')}
                      v-model={minProxyCardWidth.value}
                    />
                    <button
                      type="button"
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
                type="button"
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
          <div class="flex w-full items-center gap-2">
            {modeSelect}
            {searchInput}
            {settingsModal}
            {toggleCollapseAll}
            {latencyTestAll}
          </div>
        </div>
      ) : (
        <div class="flex items-center gap-2 p-2">
          {hasProviders.value && tabs}
          {modeSelect}
          <div class="flex flex-1">{searchInput}</div>
          {upgradeAllIcon}
          {settingsModal}
          {toggleCollapseAll}
          {latencyTestAll}
        </div>
      )

      return <CtrlsBar>{content}</CtrlsBar>
    }
  },
})
