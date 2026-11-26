import { initLogs, isPaused, logLevel, logs, supportedLogLevels } from '@/assembly/logs'
import { useCtrlsBar } from '@/composables/use-ctrls-bar'
import { useTooltip } from '@/composables/use-tooltip'
import { LIST_DISPLAY_STYLE, LOG_LEVEL, SEARCH_HISTORY_LIMIT } from '@/constant'
import { logFilter, logFilterEnabled, logFilterRegex, logTypeFilter } from '@/store/logs'
import { logDisplayStyle, logRetentionLimit, logSearchHistory } from '@/store/settings'
import {
  ArrowDownTrayIcon,
  LinkIcon,
  LinkSlashIcon,
  PauseIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { computed, defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CtrlsBar from '../common/CtrlsBar.vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import SelectInput from '../common/SelectInput.vue'
import TextInput from '../common/TextInput.vue'

export default defineComponent({
  setup() {
    const { t } = useI18n()
    const settingsModel = ref(false)
    const { isLargeCtrlsBar } = useCtrlsBar()
    const { showTip, updateTip } = useTooltip()

    const logLevels = supportedLogLevels

    const logFilterOptions = computed(() => {
      const types: string[] = []
      const levels: string[] = []

      for (const log of logs.value) {
        const index = log.payload.indexOf(' ')
        const type = index === -1 ? log.payload : log.payload.slice(0, index)

        if (!types.includes(type)) {
          types.push(type)
        }

        if (!levels.includes(log.type)) {
          levels.push(log.type)
        }
      }

      return {
        levels: levels.sort((a, b) => {
          const aIdx = logLevels.value.indexOf(a as LOG_LEVEL)
          const bIdx = logLevels.value.indexOf(b as LOG_LEVEL)
          return aIdx - bIdx
        }),
        types: types.sort(),
      }
    })

    const downloadAllLogs = () => {
      const blob = new Blob(
        [
          logs.value
            .map((log) =>
              [
                log.seq.toString().padEnd(5, ' '),
                log.time,
                log.type.padEnd(7, ' '),
                log.payload,
              ].join('\t'),
            )
            .join('\n'),
        ],
        {
          type: 'text/plain',
        },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = dayjs().format('YYYY-MM-DD HH-mm-ss') + '.log'
      a.click()
      URL.revokeObjectURL(url)
    }

    return () => {
      const levelSelect = (
        <SelectInput
          class={['select select-sm min-w-30']}
          modelValue={logLevel.value}
          onUpdate:modelValue={(value) => (logLevel.value = value as string)}
          onChange={initLogs}
          options={logLevels.value.map((value) => ({ value, label: value }))}
        />
      )
      const searchInput = (
        <TextInput
          v-model={logFilter.value}
          class="join-item min-w-0 flex-1"
          placeholder={`${t('search')} | Regex`}
          clearable={true}
          menus={logSearchHistory.value}
          menusDeleteable={true}
          menuHistoryLimit={SEARCH_HISTORY_LIMIT}
          onUpdate:menus={(val) => (logSearchHistory.value = val)}
        />
      )

      const logTypeSelect = (
        <SelectInput
          class={[
            'join-item select select-sm',
            isLargeCtrlsBar.value ? 'w-36' : 'w-24 max-w-40 flex-1',
          ]}
          modelValue={logTypeFilter.value}
          onUpdate:modelValue={(value) => (logTypeFilter.value = value as string)}
          options={[
            { value: '', label: t('all') },
            ...logFilterOptions.value.levels.map((value) => ({
              value,
              label: value,
              group: t('logLevel'),
            })),
            ...logFilterOptions.value.types.map((value) => ({
              value,
              label: value,
              group: t('logType'),
            })),
          ]}
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
            title={t('logSettings')}
          >
            <div class="flex flex-col gap-3 text-sm">
              <div class="settings-grid">
                <div class="setting-item">
                  <div class="setting-item-label">{t('logStyle')}</div>
                  <SelectInput
                    class="select select-sm min-w-24"
                    modelValue={logDisplayStyle.value}
                    onUpdate:modelValue={(value) =>
                      (logDisplayStyle.value = value as LIST_DISPLAY_STYLE)
                    }
                    options={Object.values(LIST_DISPLAY_STYLE).map((value) => ({
                      value,
                      label: t(value),
                    }))}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label">{t('logRetentionLimit')}</div>
                  <input
                    class="input input-sm w-20"
                    type="number"
                    max="9999"
                    v-model={logRetentionLimit.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label shrink-0!">{t('hideLogRegex')}</div>
                  <TextInput
                    class="w-32 max-w-64 flex-1"
                    v-model={logFilterRegex.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label flex items-center gap-2">
                    <span>{t('hideLog')}</span>
                    <div
                      onMouseenter={(e) =>
                        showTip(e, t('hideLogTip'), {
                          appendTo: 'parent',
                        })
                      }
                    >
                      <QuestionMarkCircleIcon class="h-4 w-4" />
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle"
                    v-model={logFilterEnabled.value}
                  />
                </div>
              </div>
            </div>
          </DialogWrapper>
        </>
      )

      const buttons = (
        <div class="flex items-center gap-2">
          {settingsModal}
          <button
            class="btn btn-circle btn-sm"
            onClick={downloadAllLogs}
          >
            <ArrowDownTrayIcon class="h-4 w-4" />
          </button>
          <button
            class="btn btn-circle btn-sm"
            onClick={() => {
              logFilterEnabled.value = !logFilterEnabled.value
              updateTip(logFilterEnabled.value ? t('showLog') : t('hideLog'))
            }}
            onMouseenter={(e) =>
              showTip(e, logFilterEnabled.value ? t('showLog') : t('hideLog'), {
                appendTo: 'parent',
              })
            }
          >
            {logFilterEnabled.value ? (
              <LinkSlashIcon class="h-4 w-4" />
            ) : (
              <LinkIcon class="h-4 w-4" />
            )}
          </button>
          <button
            class="btn btn-circle btn-sm"
            onClick={() => (isPaused.value = !isPaused.value)}
          >
            {isPaused.value ? <PlayIcon class="h-4 w-4" /> : <PauseIcon class="h-4 w-4" />}
          </button>
          <button
            class="btn btn-circle btn-sm"
            onClick={() => (logs.value = [])}
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>
      )

      const content = !isLargeCtrlsBar.value ? (
        <div class="flex flex-col gap-2 p-2">
          <div class="flex w-full justify-between gap-2">
            <div class="flex flex-1">{levelSelect}</div>
            {buttons}
          </div>
          <div class="join">
            {logTypeSelect}
            {searchInput}
          </div>
        </div>
      ) : (
        <div class="flex items-center justify-between gap-2 p-2">
          <div class="flex items-center gap-2">
            {levelSelect}
            <div class="join w-96">
              {logTypeSelect}
              {searchInput}
            </div>
          </div>
          {buttons}
        </div>
      )

      return <CtrlsBar>{content}</CtrlsBar>
    }
  },
})
