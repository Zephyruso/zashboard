import { updateProxyProviderAPI } from '@/api'
import { useProxies } from '@/composables/proxies'
import { PROXY_SORT_TYPE, PROXY_TAB_TYPE } from '@/config'
import { isMiddleScreen } from '@/helper/utils'
import { configs, updateConfigs } from '@/store/config'
import { allProxiesLatencyTest, fetchProxies, proxyProviederList } from '@/store/proxies'
import { hideUnavailableProxies, proxySortType } from '@/store/settings'
import { BoltIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed, defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from '../common/DialogWrapper.vue'

export default defineComponent({
  name: 'ProxiesCtrl',
  props: {
    horizontal: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { t } = useI18n()
    const { proxiesTabShow } = useProxies()
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

    const modeList = computed(() => {
      return (
        configs.value?.['mode-list'] || configs.value?.['modes'] || ['direct', 'rule', 'global']
      )
    })

    const handlerModeChange = (e: Event) => {
      const mode = (e.target as HTMLSelectElement).value
      updateConfigs({ mode })
    }

    return () => {
      const tabs = (
        <div
          role="tablist"
          class="tabs-boxed tabs tabs-sm"
        >
          {Object.values(PROXY_TAB_TYPE).map((type) => {
            return (
              <a
                role="tab"
                key={type}
                class={['tab', proxiesTabShow.value === type && 'tab-active']}
                onClick={() => (proxiesTabShow.value = type)}
              >
                {t(type)}
              </a>
            )
          })}
        </div>
      )
      const upgradeAll = (
        <>
          {proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER && (
            <button
              class={twMerge('btn btn-sm')}
              onClick={handlerClickUpdateAllProviders}
            >
              {isUpgrading.value ? (
                <span class="loading loading-dots loading-md"></span>
              ) : (
                t('updateAllProviders')
              )}
            </button>
          )}
        </>
      )
      const modeSelect = (
        <select
          class={[
            'select select-bordered select-sm min-w-24',
            props.horizontal ? 'inline-block max-md:flex-1' : 'w-0 flex-1',
          ]}
          v-model={configs.value.mode}
          onChange={handlerModeChange}
        >
          {modeList.value.map((mode) => {
            return (
              <option
                key={mode}
                value={mode}
              >
                {t(mode.toLowerCase()) || mode}
              </option>
            )
          })}
        </select>
      )
      const sort = (
        <select
          class={[
            'select select-bordered select-sm',
            props.horizontal && !isMiddleScreen.value ? 'inline-block' : 'w-0 flex-1',
          ]}
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

      const filter = (
        <div class="flex items-center gap-1 text-sm">
          <span class="shrink-0">{t('unavailableProxy')}</span>
          <input
            type="checkbox"
            class="toggle"
            v-model={hideUnavailableProxies.value}
          />
        </div>
      )

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

      const latencyTestAll = (
        <button
          class={twMerge('btn btn-circle btn-sm')}
          onClick={handlerClickLatencyTestAll}
        >
          {isAllLatencyTesting.value ? (
            <span class="loading loading-spinner loading-sm"></span>
          ) : (
            <BoltIcon class="h-4 w-4" />
          )}
        </button>
      )

      if (props.horizontal) {
        if (isMiddleScreen.value) {
          const settingsModal = (
            <>
              <button
                class={twMerge('btn btn-circle btn-sm')}
                onClick={() => (settingsModel.value = true)}
              >
                <WrenchScrewdriverIcon class="h-4 w-4" />
              </button>
              <Dialog
                modelValue={settingsModel.value}
                onUpdate:modelValue={(v) => (settingsModel.value = v)}
              >
                <div class="flex flex-col gap-4 p-2">
                  <div class="flex items-center gap-2 text-sm">
                    {t('sortBy')}
                    {sort}
                  </div>
                  <div class="flex items-center gap-2 text-sm">{filter}</div>
                </div>
              </Dialog>
            </>
          )

          return (
            <div class="flex flex-col gap-2 p-2">
              {hasProviders.value && (
                <div class="flex gap-2">
                  {tabs}
                  {upgradeAll}
                </div>
              )}
              <div class="flex w-full gap-2">
                {modeSelect}
                {settingsModal}
                {latencyTestAll}
              </div>
            </div>
          )
        }
        return (
          <div class="flex gap-2 p-2">
            {hasProviders.value && tabs}
            {upgradeAll}
            {modeSelect}
            {sort}
            {filter}
            {latencyTestAll}
          </div>
        )
      }

      return (
        <div class="flex flex-col gap-2 p-2">
          {upgradeAll}
          {hasProviders.value && tabs}
          {
            <div class="flex gap-2">
              {modeSelect}
              {latencyTestAll}
            </div>
          }
          {
            <div class="flex gap-2">
              {sort}
              {filter}
            </div>
          }
        </div>
      )
    }
  },
})
