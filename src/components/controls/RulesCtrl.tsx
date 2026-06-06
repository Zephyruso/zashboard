import { isRequestCanceled, updateRuleProviderAPI } from '@/api'
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { RULE_TAB_TYPE } from '@/constant'
import { showNotification } from '@/helper/notification'
import { fetchRules, ruleProviderList, rules, rulesFilter, rulesTabShow } from '@/store/rules'
import {
  disconnectOnRuleDisable,
  displayLatencyInRule,
  displayNowNodeInRule,
} from '@/store/settings'
import { ArrowPathIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import { computed, defineComponent, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CtrlsBar from '../common/CtrlsBar.vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import TextInput from '../common/TextInput.vue'

export default defineComponent({
  name: 'RulesCtrl',
  setup() {
    const { t } = useI18n()
    const settingsModel = ref(false)
    const isUpgrading = ref(false)
    const { isLargeCtrlsBar } = useCtrlsBar()
    let updateAllProvidersController: AbortController | undefined
    let updateAllProvidersSeq = 0

    const isCurrentUpdateAllProviders = (controller: AbortController, seq: number) => {
      return updateAllProvidersController === controller && updateAllProvidersSeq === seq
    }

    const hasProviders = computed(() => {
      return ruleProviderList.value.length > 0
    })

    const handlerClickUpgradeAllProviders = async () => {
      if (isUpgrading.value) return

      updateAllProvidersController?.abort()
      const controller = new AbortController()
      const seq = ++updateAllProvidersSeq
      updateAllProvidersController = controller
      isUpgrading.value = true
      try {
        const providers = [...ruleProviderList.value]
        let updateCount = 0
        let failedCount = 0

        await Promise.allSettled(
          providers.map(async (provider) => {
            try {
              await updateRuleProviderAPI(provider.name, controller.signal)
            } catch (error) {
              if (isRequestCanceled(error)) return
              failedCount++
            } finally {
              if (!isCurrentUpdateAllProviders(controller, seq)) return
              updateCount++

              const isFinished = updateCount === providers.length

              showNotification({
                key: 'updateFinishedTip',
                content: 'updateFinishedTip',
                params: {
                  number: `${updateCount}/${providers.length}`,
                },
                type: isFinished ? (failedCount ? 'alert-warning' : 'alert-success') : 'alert-info',
                timeout: isFinished ? 2000 : 0,
              })
            }
          }),
        )
        if (isCurrentUpdateAllProviders(controller, seq)) await fetchRules()
      } catch {
        try {
          if (isCurrentUpdateAllProviders(controller, seq)) await fetchRules()
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

    const tabsWithNumbers = computed(() => {
      return Object.values(RULE_TAB_TYPE).map((type) => {
        return {
          type,
          count: type === RULE_TAB_TYPE.RULES ? rules.value.length : ruleProviderList.value.length,
        }
      })
    })

    onBeforeUnmount(() => {
      updateAllProvidersController?.abort()
      updateAllProvidersSeq += 1
      updateAllProvidersController = undefined
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
                aria-selected={rulesTabShow.value === type}
                class={['tab', rulesTabShow.value === type && 'tab-active']}
                onClick={() => (rulesTabShow.value = type)}
              >
                {t(type)} ({count})
              </button>
            )
          })}
        </div>
      )
      const upgradeAllIcon = rulesTabShow.value === RULE_TAB_TYPE.PROVIDER && (
        <button
          type="button"
          class="btn btn-circle btn-sm shrink-0"
          aria-label={t('updateAllProviders')}
          disabled={isUpgrading.value}
          aria-busy={isUpgrading.value}
          onClick={handlerClickUpgradeAllProviders}
        >
          <ArrowPathIcon
            class={['h-4 w-4', isUpgrading.value && 'animate-spin']}
            aria-hidden="true"
          />
        </button>
      )

      const searchInput = (
        <TextInput
          class={isLargeCtrlsBar.value ? 'w-80' : 'w-32 flex-1'}
          v-model={rulesFilter.value}
          placeholder={`${t('search')} | Regex`}
          clearable={true}
        />
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
            title={t('ruleSettings')}
          >
            <div class="flex flex-col gap-3 text-sm">
              <div class="settings-grid">
                <div class="setting-item">
                  <div class="setting-item-label">{t('displaySelectedNode')}</div>
                  <input
                    class="toggle toggle-sm"
                    type="checkbox"
                    aria-label={t('displaySelectedNode')}
                    v-model={displayNowNodeInRule.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('displayLatencyNumber')}</div>
                  <input
                    class="toggle toggle-sm"
                    type="checkbox"
                    aria-label={t('displayLatencyNumber')}
                    v-model={displayLatencyInRule.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('disconnectOnRuleDisable')}</div>
                  <input
                    class="toggle toggle-sm"
                    type="checkbox"
                    aria-label={t('disconnectOnRuleDisable')}
                    v-model={disconnectOnRuleDisable.value}
                  />
                </div>
              </div>
            </div>
          </DialogWrapper>
        </>
      )

      const content = !isLargeCtrlsBar.value ? (
        <div class="flex flex-col gap-2 p-2">
          {hasProviders.value && (
            <div class="flex items-center gap-2">
              {tabs}
              {upgradeAllIcon}
            </div>
          )}
          <div class="flex w-full items-center gap-2">
            {searchInput}
            {settingsModal}
          </div>
        </div>
      ) : (
        <div class="flex flex-wrap items-center gap-2 p-2">
          {hasProviders.value && tabs}
          {searchInput}
          <div class="flex-1"></div>
          {upgradeAllIcon}
          {settingsModal}
        </div>
      )

      return <CtrlsBar>{content}</CtrlsBar>
    }
  },
})
