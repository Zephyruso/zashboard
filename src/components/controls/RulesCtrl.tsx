import {
  fetchRules,
  ruleProviderList,
  rules,
  rulesFilter,
  rulesTabShow,
  updateRuleProviderAPI,
} from '@/assembly/rules'
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { RULE_TAB_TYPE } from '@/constant'
import { showNotification } from '@/helper/notification'
import {
  disconnectOnRuleDisable,
  displayLatencyInRule,
  displayNowNodeInRule,
} from '@/store/settings'
import { ArrowPathIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import { computed, defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CtrlsBar from '../common/CtrlsBar.vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import SegmentedControl from '../common/SegmentedControl.vue'
import TextInput from '../common/TextInput.vue'

export default defineComponent({
  name: 'RulesCtrl',
  setup() {
    const { t } = useI18n()
    const settingsModel = ref(false)
    const isUpgrading = ref(false)
    const { isLargeCtrlsBar } = useCtrlsBar()
    const hasProviders = computed(() => {
      return ruleProviderList.value.length > 0
    })

    const handlerClickUpgradeAllProviders = async () => {
      if (isUpgrading.value) return
      isUpgrading.value = true
      try {
        let updateCount = 0

        await Promise.all(
          ruleProviderList.value.map((provider) =>
            updateRuleProviderAPI(provider.name).then(() => {
              updateCount++

              const isFinished = updateCount === ruleProviderList.value.length

              showNotification({
                key: 'updateFinishedTip',
                content: 'updateFinishedTip',
                params: {
                  number: `${updateCount}/${ruleProviderList.value.length}`,
                },
                type: isFinished ? 'alert-success' : 'alert-info',
                timeout: isFinished ? 2000 : 0,
              })
            }),
          ),
        )
        await fetchRules()
        isUpgrading.value = false
      } catch {
        await fetchRules()
        isUpgrading.value = false
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

    return () => {
      const tabs = (
        <SegmentedControl
          modelValue={rulesTabShow.value}
          onUpdate:modelValue={(value) => (rulesTabShow.value = value as RULE_TAB_TYPE)}
          options={tabsWithNumbers.value.map(({ type, count }) => ({
            value: type,
            label: t(type),
            count,
          }))}
        />
      )
      const upgradeAllIcon = rulesTabShow.value === RULE_TAB_TYPE.PROVIDER && (
        <button
          class="btn btn-circle btn-sm"
          onClick={handlerClickUpgradeAllProviders}
        >
          <ArrowPathIcon class={['h-4 w-4', isUpgrading.value && 'animate-spin']} />
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
            class={'btn btn-circle btn-sm'}
            onClick={() => (settingsModel.value = true)}
          >
            <WrenchScrewdriverIcon class="h-4 w-4" />
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
                    class="toggle"
                    type="checkbox"
                    v-model={displayNowNodeInRule.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('displayLatencyNumber')}</div>
                  <input
                    class="toggle"
                    type="checkbox"
                    v-model={displayLatencyInRule.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('disconnectOnRuleDisable')}</div>
                  <input
                    class="toggle"
                    type="checkbox"
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
