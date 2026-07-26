import { disconnectAllAPI, disconnectByIdAPI } from '@/assembly/connections'
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { ROUTE_NAME, SETTINGS_MENU_KEY, SORT_DIRECTION, SORT_TYPE } from '@/constant'
import { useTooltip } from '@/helper/tooltip'
import {
  connectionFilter,
  connections,
  connectionSortDirection,
  connectionSortType,
  isPaused,
  quickFilterEnabled,
  quickFilterRegex,
  renderConnections,
} from '@/store/connections'
import { isConnectionCard } from '@/store/settings'
import {
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  LinkIcon,
  LinkSlashIcon,
  PauseIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CtrlsBar from '../common/CtrlsBar.vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import TextInput from '../common/TextInput.vue'
import ConnectionCardSettings from '../settings/connections/ConnectionCardSettings.vue'
import TableSettings from '../settings/connections/TableSettings.vue'
import ConnectionTabs from './ConnectionTabs.vue'
import SourceIPFilter from './SourceIPFilter.vue'

const handlerClickCloseAll = () => {
  if (renderConnections.value.length === connections.value.length) {
    disconnectAllAPI()
  } else {
    renderConnections.value.forEach((conn) => {
      disconnectByIdAPI(conn.id)
    })
  }
}

export default defineComponent({
  name: 'ConnectionCtrl',
  components: {
    TextInput,
    ConnectionTabs,
    SourceIPFilter,
  },
  setup() {
    const { t } = useI18n()
    const router = useRouter()
    const settingsModel = ref(false)
    const { showTip, updateTip } = useTooltip()
    const { isLargeCtrlsBar } = useCtrlsBar(() => (isConnectionCard.value ? 860 : 720))

    return () => {
      const sortForCards = (
        <div class={`join flex-1 ${isLargeCtrlsBar.value ? 'min-w-46' : ''}`}>
          <select
            class="join-item select select-sm flex-1"
            v-model={connectionSortType.value}
          >
            {(Object.values(SORT_TYPE) as string[]).map((opt) => (
              <option
                key={opt}
                value={opt}
              >
                {t(opt) || opt}
              </option>
            ))}
          </select>
          <button
            class="btn join-item btn-sm"
            onClick={() => {
              connectionSortDirection.value =
                connectionSortDirection.value === SORT_DIRECTION.ASC
                  ? SORT_DIRECTION.DESC
                  : SORT_DIRECTION.ASC
            }}
          >
            {connectionSortDirection.value === SORT_DIRECTION.ASC ? (
              <BarsArrowUpIcon class="h-4 w-4" />
            ) : (
              <BarsArrowDownIcon class="h-4 w-4" />
            )}
          </button>
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
            title={t('connectionSettings')}
          >
            <div class="flex flex-col gap-3 text-sm">
              <div class="settings-grid">
                <div class="setting-item">
                  <div class="setting-item-label shrink-0!">{t('hideConnectionRegex')}</div>
                  <TextInput
                    class="w-32 max-w-64 flex-1"
                    v-model={quickFilterRegex.value}
                  />
                </div>
                <div class="setting-item">
                  <div class="setting-item-label flex items-center gap-2">
                    <span>{t('hideConnection')}</span>
                    <div
                      onMouseenter={(e) =>
                        showTip(e, t('hideConnectionTip'), {
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
                    v-model={quickFilterEnabled.value}
                  />
                </div>
                {isConnectionCard.value ? <ConnectionCardSettings /> : <TableSettings />}
              </div>
              <div class="divider m-0"></div>
              <button
                class="btn btn-block"
                onClick={() => {
                  settingsModel.value = false
                  router.push({
                    name: ROUTE_NAME.settings,
                    query: { scrollTo: SETTINGS_MENU_KEY.connections },
                  })
                }}
              >
                {t('moreSettings')}
              </button>
            </div>
          </DialogWrapper>
        </>
      )

      const searchInput = (
        <TextInput
          v-model={connectionFilter.value}
          placeholder={`${t('search')} | Regex`}
          clearable={true}
          before-close={true}
          class={isLargeCtrlsBar.value ? 'w-32 max-w-80 flex-1' : 'w-full'}
        />
      )

      const buttons = (
        <>
          <button
            class="btn btn-circle btn-sm"
            onClick={() => {
              quickFilterEnabled.value = !quickFilterEnabled.value
              updateTip(quickFilterEnabled.value ? t('showConnection') : t('hideConnection'))
            }}
            onMouseenter={(e) =>
              showTip(e, quickFilterEnabled.value ? t('showConnection') : t('hideConnection'), {
                appendTo: 'parent',
              })
            }
          >
            {quickFilterEnabled.value ? (
              <LinkSlashIcon class="h-4 w-4" />
            ) : (
              <LinkIcon class="h-4 w-4" />
            )}
          </button>
          <button
            class="btn btn-circle btn-sm"
            onClick={() => {
              isPaused.value = !isPaused.value
            }}
          >
            {isPaused.value ? <PlayIcon class="h-4 w-4" /> : <PauseIcon class="h-4 w-4" />}
          </button>
          <button
            class="btn btn-circle btn-sm"
            onClick={handlerClickCloseAll}
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </>
      )

      const content = !isLargeCtrlsBar.value ? (
        <div class="flex flex-wrap items-center gap-2 p-2">
          <div class="flex w-full items-center justify-between gap-2">
            <ConnectionTabs />
            {!isConnectionCard.value && (
              <div class="flex items-center gap-1">
                {settingsModal}
                {buttons}
              </div>
            )}
          </div>
          {isConnectionCard.value && (
            <div class="flex w-full items-center gap-2">
              {sortForCards}
              {settingsModal}
              {buttons}
            </div>
          )}
          <div class="join w-full">
            <SourceIPFilter class="w-40" />
            {searchInput}
          </div>
        </div>
      ) : (
        <div class="flex items-center gap-2 p-2">
          <ConnectionTabs />
          {isConnectionCard.value && sortForCards}
          <SourceIPFilter class="w-40" />
          <div class="flex flex-1">{searchInput}</div>
          {settingsModal}
          {buttons}
        </div>
      )

      return <CtrlsBar>{content}</CtrlsBar>
    }
  },
})
