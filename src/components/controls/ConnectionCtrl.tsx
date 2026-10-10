import { can } from '@/assembly/backend'
import { activeConnections, disconnectAll, disconnectById, isPaused } from '@/assembly/connections'
import { useCtrlsBar } from '@/composables/use-ctrls-bar'
import { useTooltip } from '@/composables/use-tooltip'
import {
  CONNECTION_GROUPABLE_KEYS,
  naturalSortDirection,
  ROUTE_NAME,
  SETTINGS_MENU_KEY,
  SORT_DIRECTION,
  SORT_DIRECTION_LABEL_KEY,
  SORT_TYPE,
  SORT_TYPE_GROUPS,
  SORT_TYPE_VALUE_KIND,
  type ConnectionGroupableKey,
} from '@/constant'
import {
  hasConnectionCardGroups,
  hasExpandedConnectionCardGroups,
  toggleAllConnectionCardGroups,
} from '@/helper/connection-card-groups'
import {
  connectionCardGroupKey,
  connectionFilter,
  connectionSortDirection,
  connectionSortType,
  isClosedConnection,
  isClosedOnlyView,
  quickFilterEnabled,
  quickFilterRegex,
  renderConnections,
  searchHiddenColumns,
  sourceIPFilter,
} from '@/store/connections'
import { isConnectionCard } from '@/store/settings'
import {
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
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
import SelectInput from '../common/SelectInput.vue'
import TextInput from '../common/TextInput.vue'
import ConnectionCardSettings from '../settings/connections/ConnectionCardSettings.vue'
import TableSettings from '../settings/connections/TableSettings.vue'
import ConnectionTabs from './ConnectionTabs.vue'
import SourceIPFilter from './SourceIPFilter.vue'

const handlerClickCloseAll = () => {
  const targets = renderConnections.value.filter((conn) => !isClosedConnection(conn))

  if (!targets.length) {
    return
  }

  if (targets.length === activeConnections.value.length) {
    disconnectAll()
    return
  }

  const sourceIPs = sourceIPFilter.value

  if (
    can('connectionsFilterClose') &&
    sourceIPs?.length === 1 &&
    !connectionFilter.value &&
    !quickFilterEnabled.value
  ) {
    disconnectAll({ src: sourceIPs[0] })
    return
  }

  targets.forEach((conn) => {
    disconnectById(conn.id)
  })
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

    const sortDirectionLabel = () =>
      t(
        SORT_DIRECTION_LABEL_KEY[SORT_TYPE_VALUE_KIND[connectionSortType.value]][
          connectionSortDirection.value
        ],
      )

    return () => {
      const sortForCards = (
        <div class={`join flex-1 ${isLargeCtrlsBar.value ? 'min-w-46' : ''}`}>
          <SelectInput
            class="join-item select select-sm flex-1"
            aria-label={t('sortBy')}
            modelValue={connectionSortType.value}
            onUpdate:modelValue={(value) => {
              const sortType = value as SORT_TYPE

              connectionSortType.value = sortType
              connectionSortDirection.value = naturalSortDirection(sortType)
            }}
            options={SORT_TYPE_GROUPS.flatMap((sortGroup) =>
              sortGroup.types.map((value) => ({
                value: value as string,
                label: t(value) || value,
                group: t(sortGroup.labelKey),
              })),
            )}
          />
          <button
            class="btn join-item btn-sm"
            aria-label={sortDirectionLabel()}
            onClick={() => {
              connectionSortDirection.value =
                connectionSortDirection.value === SORT_DIRECTION.ASC
                  ? SORT_DIRECTION.DESC
                  : SORT_DIRECTION.ASC
              updateTip(sortDirectionLabel())
            }}
            onMouseenter={(e) => showTip(e, sortDirectionLabel(), { appendTo: 'parent' })}
          >
            {connectionSortDirection.value === SORT_DIRECTION.ASC ? (
              <BarsArrowUpIcon class="h-4 w-4" />
            ) : (
              <BarsArrowDownIcon class="h-4 w-4" />
            )}
          </button>
        </div>
      )

      const groupForCards = (
        <SelectInput
          class="select select-sm min-w-0 flex-1"
          modelValue={connectionCardGroupKey.value}
          onUpdate:modelValue={(value) =>
            (connectionCardGroupKey.value = value as ConnectionGroupableKey | null)
          }
          options={[
            { value: null, label: t('noGrouping') },
            ...CONNECTION_GROUPABLE_KEYS.map((value) => ({
              value,
              label: t(value),
            })),
          ]}
        />
      )

      const toggleGroupsLabel = () =>
        hasExpandedConnectionCardGroups.value ? t('collapseAllGroups') : t('expandAllGroups')
      const toggleGroupsButton =
        isConnectionCard.value && connectionCardGroupKey.value !== null ? (
          <button
            class="btn btn-circle btn-sm"
            disabled={!hasConnectionCardGroups.value}
            aria-label={toggleGroupsLabel()}
            onClick={() => {
              toggleAllConnectionCardGroups()
              updateTip(toggleGroupsLabel())
            }}
            onMouseenter={(e) => showTip(e, toggleGroupsLabel(), { appendTo: 'parent' })}
          >
            {hasExpandedConnectionCardGroups.value ? (
              <ChevronUpIcon class="h-4 w-4" />
            ) : (
              <ChevronDownIcon class="h-4 w-4" />
            )}
          </button>
        ) : null

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
                {isConnectionCard.value && (
                  <div class="setting-item">
                    <div class="setting-item-label">{t('groupBy')}</div>
                    {groupForCards}
                  </div>
                )}
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
              <button
                class="btn btn-block"
                onClick={() => {
                  settingsModel.value = false
                  router.push({
                    name: ROUTE_NAME.settings,
                    query: { section: SETTINGS_MENU_KEY.connections },
                  })
                }}
              >
                {t('moreSettings')}
              </button>
            </div>
          </DialogWrapper>
        </>
      )

      const searchScopeLabel = () =>
        searchHiddenColumns.value ? t('searchHiddenColumns') : t('searchVisibleColumns')
      const searchInput = (
        <div class={['relative w-32 min-w-0 flex-1', isLargeCtrlsBar.value && 'max-w-80']}>
          <button
            class="btn btn-circle btn-ghost btn-xs absolute top-1/2 left-1 z-20 h-6 min-h-6 w-6 -translate-y-1/2 p-0"
            aria-label={searchScopeLabel()}
            aria-pressed={searchHiddenColumns.value}
            onClick={() => {
              searchHiddenColumns.value = !searchHiddenColumns.value
              updateTip(searchScopeLabel())
            }}
            onMouseenter={(e) => showTip(e, searchScopeLabel())}
          >
            <FunnelIcon
              class={`h-3.5 w-3.5 ${
                searchHiddenColumns.value ? 'text-primary fill-primary/40' : 'opacity-50'
              }`}
            />
          </button>
          <TextInput
            v-model={connectionFilter.value}
            placeholder={`${t('search')} | Regex`}
            clearable={true}
            class={['w-full pl-7', !isLargeCtrlsBar.value && 'join-item']}
          />
        </div>
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
          {can('connectionsClose') && (
            <button
              class="btn btn-circle btn-sm"
              disabled={isClosedOnlyView.value}
              onClick={handlerClickCloseAll}
            >
              <XMarkIcon class="h-4 w-4" />
            </button>
          )}
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
              {toggleGroupsButton}
              {settingsModal}
              {buttons}
            </div>
          )}
          <div class="join w-full">
            <SourceIPFilter class="join-item w-40" />
            {searchInput}
          </div>
        </div>
      ) : (
        <div class="flex items-center gap-2 p-2">
          <ConnectionTabs />
          {isConnectionCard.value && sortForCards}
          <SourceIPFilter class="w-40" />
          <div class="flex flex-1">{searchInput}</div>
          {toggleGroupsButton}
          {settingsModal}
          {buttons}
        </div>
      )

      return <CtrlsBar>{content}</CtrlsBar>
    }
  },
})
