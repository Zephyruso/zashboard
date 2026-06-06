import { disconnectAllAPI, disconnectByIdAPI, isRequestCanceled } from '@/api'
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
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CtrlsBar from '../common/CtrlsBar.vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import TextInput from '../common/TextInput.vue'
import ConnectionCardSettings from '../settings/connections/ConnectionCardSettings.vue'
import TableSettings from '../settings/connections/TableSettings.vue'
import ConnectionTabs from './ConnectionTabs.vue'
import SourceIPFilter from './SourceIPFilter.vue'

const isClosingAllConnections = ref(false)
let closeAllConnectionsController: AbortController | undefined
let closeAllConnectionsSeq = 0

const isCurrentCloseAll = (controller: AbortController, seq: number) => {
  return closeAllConnectionsController === controller && closeAllConnectionsSeq === seq
}

const handlerClickCloseAll = async () => {
  if (isClosingAllConnections.value) return

  closeAllConnectionsController?.abort()
  const controller = new AbortController()
  const seq = ++closeAllConnectionsSeq
  const targetConnections = [...renderConnections.value]
  closeAllConnectionsController = controller
  isClosingAllConnections.value = true
  try {
    if (targetConnections.length === connections.value.length) {
      await disconnectAllAPI(controller.signal)
    } else {
      await Promise.allSettled(
        targetConnections.map((conn) => disconnectByIdAPI(conn.id, controller.signal)),
      )
    }
  } catch (error) {
    if (isRequestCanceled(error)) return
    // Request interceptor surfaces API failures; keep the toolbar action settled.
  } finally {
    if (isCurrentCloseAll(controller, seq)) {
      isClosingAllConnections.value = false
      closeAllConnectionsController = undefined
    }
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

    onBeforeUnmount(() => {
      closeAllConnectionsController?.abort()
      closeAllConnectionsSeq += 1
      closeAllConnectionsController = undefined
      isClosingAllConnections.value = false
    })

    return () => {
      const sortDirectionLabel =
        connectionSortDirection.value === SORT_DIRECTION.ASC
          ? t('sortAscending')
          : t('sortDescending')
      const sortForCards = (
        <div class={`join flex-1 ${isLargeCtrlsBar.value ? 'min-w-46' : ''}`}>
          <select
            class="join-item select select-sm flex-1"
            aria-label={t('sortBy')}
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
            type="button"
            class="btn join-item btn-sm"
            aria-label={sortDirectionLabel}
            title={sortDirectionLabel}
            onClick={() => {
              connectionSortDirection.value =
                connectionSortDirection.value === SORT_DIRECTION.ASC
                  ? SORT_DIRECTION.DESC
                  : SORT_DIRECTION.ASC
            }}
          >
            {connectionSortDirection.value === SORT_DIRECTION.ASC ? (
              <BarsArrowUpIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            ) : (
              <BarsArrowDownIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            )}
          </button>
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
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
                      aria-label={t('hideConnectionTip')}
                      title={t('hideConnectionTip')}
                      onMouseenter={(e) =>
                        showTip(e, t('hideConnectionTip'), {
                          appendTo: 'parent',
                        })
                      }
                      onFocus={(e) =>
                        showTip(e, t('hideConnectionTip'), {
                          appendTo: 'parent',
                        })
                      }
                    >
                      <QuestionMarkCircleIcon
                        class="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    aria-label={t('hideConnection')}
                    v-model={quickFilterEnabled.value}
                  />
                </div>
                {isConnectionCard.value ? <ConnectionCardSettings /> : <TableSettings />}
              </div>
              <div class="divider m-0"></div>
              <button
                type="button"
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
            type="button"
            class="btn btn-circle btn-sm shrink-0"
            aria-label={quickFilterEnabled.value ? t('showConnection') : t('hideConnection')}
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
              <LinkSlashIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            ) : (
              <LinkIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            )}
          </button>
          <button
            type="button"
            class="btn btn-circle btn-sm shrink-0"
            aria-label={isPaused.value ? t('resumeStream') : t('pauseStream')}
            onClick={() => {
              isPaused.value = !isPaused.value
            }}
          >
            {isPaused.value ? (
              <PlayIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            ) : (
              <PauseIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            )}
          </button>
          <button
            type="button"
            class="btn btn-circle btn-sm shrink-0"
            aria-label={t('closeAllConnections')}
            disabled={isClosingAllConnections.value}
            aria-busy={isClosingAllConnections.value}
            onClick={() => {
              void handlerClickCloseAll()
            }}
          >
            <XMarkIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
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
