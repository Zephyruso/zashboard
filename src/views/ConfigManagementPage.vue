<template>
  <div class="relative h-full overflow-y-auto">
    <CtrlsBar>
      <div class="scrollbar-hidden p-1 px-2">
        <div class="flex w-full gap-2">
          <div class="relative mx-auto flex max-w-6xl flex-1 gap-2">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="btn btn-ghost btn-sm hover:btn hover:btn-neutral my-1 flex-1 gap-2"
              :class="activeTab === tab.key ? 'btn-active btn-neutral text-neutral-content' : ''"
              @click="activeTab = tab.key"
            >
              <component
                :is="tab.icon"
                class="h-5 w-5"
              />
              <span class="hidden text-sm lg:block">{{ tab.label }}</span>
              <span class="badge badge-ghost badge-xs hidden xl:inline-flex">{{ tab.count }}</span>
            </button>
          </div>
          <button
            class="btn btn-circle btn-sm my-auto"
            @click="refreshPage"
          >
            <Cog6ToothIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </CtrlsBar>

    <div
      class="mx-auto w-full max-w-6xl space-y-4 p-3 md:px-6 md:py-5"
      :style="padding"
    >
      <section
        v-if="activeTab === 'inbounds'"
        class="flex h-full min-h-0 flex-col"
      >
        <div class="space-y-4">
          <div v-if="filteredInboundCards.length">
            <Draggable
              :model-value="filteredInboundCards"
              item-key="id"
              handle=".inbound-drag-handle"
              ghost-class="ghost"
              :animation="180"
              class="grid grid-cols-1 content-start items-start gap-4 md:grid-cols-2"
              @update:model-value="reorderInboundCards"
            >
              <template #item="{ element: card }">
                <section
                  class="group base-container collapse w-full shadow-sm"
                  :class="isInboundCardExpanded(card.id) ? 'collapse-open' : 'collapse-close'"
                >
                  <div
                    class="collapse-title cursor-pointer p-5"
                    @click="toggleInboundCardExpanded(card.id)"
                  >
                    <div class="relative flex w-full items-start gap-3 overflow-hidden">
                      <div class="flex min-w-0 flex-1 flex-col gap-3">
                        <div class="flex min-w-0 items-center gap-3">
                          <Bars3Icon
                            class="inbound-drag-handle text-base-content/45 h-4 w-4 shrink-0 cursor-grab"
                          />
                          <ChevronRightIcon
                            class="h-4 w-4 shrink-0 transition-transform"
                            :class="isInboundCardExpanded(card.id) && 'rotate-90'"
                          />
                          <div class="min-w-0 flex-1">
                            <div class="flex min-w-0 items-center gap-2 overflow-hidden">
                              <h4 class="truncate text-base font-semibold">
                                {{ card.values.tag || '未命名入站' }}
                              </h4>
                              <span class="text-base-content/60 shrink-0 text-xs tabular-nums">
                                · {{ inboundTypeLabelMap[card.type as InboundType] }} ·
                                {{ inboundPreviewEntries(card).length }} 项
                              </span>
                            </div>
                            <div class="text-base-content/80 mt-1.5 flex items-center gap-2">
                              <div class="flex flex-1 items-center gap-2 truncate text-sm">
                                <div class="flex flex-1 items-center gap-1 truncate">
                                  <span class="truncate text-xs md:text-sm">
                                    {{ describeInboundCard(card) }}
                                  </span>
                                </div>
                              </div>
                              <div class="shrink-0 text-right text-xs">
                                {{ card.enabled ? '启用中' : '已禁用' }}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="flex flex-wrap gap-2">
                          <span class="badge badge-ghost h-5 min-h-5 rounded-md px-1.5 text-[10px]">
                            {{ inboundTypeLabelMap[card.type as InboundType] }}
                          </span>
                          <span
                            v-if="inboundInjectSupportMap[card.type as InboundType]"
                            class="badge badge-outline h-5 min-h-5 rounded-md px-1.5 text-[10px]"
                          >
                            注入 {{ inboundInjectSupportMap[card.type as InboundType] }}
                          </span>
                          <span
                            v-if="!inboundAuditByCard.get(card.id)?.length"
                            class="badge badge-success badge-outline h-5 min-h-5 rounded-md px-1.5 text-[10px]"
                          >
                            双核心可编译
                          </span>
                          <span
                            v-else
                            class="badge badge-warning badge-outline h-5 min-h-5 rounded-md px-1.5 text-[10px]"
                          >
                            {{ inboundAuditByCard.get(card.id)?.length }} 条审计提示
                          </span>
                        </div>
                      </div>

                      <div
                        class="absolute top-0 right-0 flex items-center gap-1"
                        @click.stop
                      >
                        <button
                          class="btn btn-circle btn-ghost btn-xs text-base-content/70 hover:text-base-content opacity-0 transition-all duration-200 group-hover:opacity-100 [@media(any-pointer:coarse)]:opacity-100"
                          type="button"
                          title="编辑入站"
                          :disabled="inboundSaving"
                          @click="openEditInboundDialog(card.id)"
                        >
                          <PencilSquareIcon class="h-3.5 w-3.5" />
                        </button>
                        <button
                          class="btn btn-circle btn-ghost btn-xs text-base-content/70 hover:text-error opacity-0 transition-all duration-200 group-hover:opacity-100 [@media(any-pointer:coarse)]:opacity-100"
                          type="button"
                          title="删除入站"
                          :disabled="inboundSaving"
                          @click="removeInboundCard(card.id)"
                        >
                          <TrashIcon class="h-3.5 w-3.5" />
                        </button>
                        <label class="ml-1 flex items-center">
                          <input
                            class="toggle toggle-primary toggle-sm"
                            type="checkbox"
                            :disabled="inboundSaving"
                            :checked="card.enabled"
                            @change="
                              toggleInboundCard(
                                card.id,
                                ($event.target as HTMLInputElement).checked,
                              )
                            "
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="collapse-content p-0">
                    <div
                      v-if="isInboundCardExpanded(card.id)"
                      class="space-y-3 px-5 pb-5"
                    >
                      <div
                        v-if="inboundAuditByCard.get(card.id)?.length"
                        class="border-base-300/70 bg-base-200/50 rounded-2xl border p-4"
                      >
                        <div
                          v-for="issue in inboundAuditByCard.get(card.id)"
                          :key="`${issue.core}-${issue.field}-${issue.message}`"
                          class="text-sm leading-6"
                          :class="
                            issue.severity === 'error'
                              ? 'text-error'
                              : issue.severity === 'warning'
                                ? 'text-warning'
                                : 'text-base-content/65'
                          "
                        >
                          {{ issue.core }} · {{ issue.message }}
                        </div>
                      </div>

                      <div class="grid gap-3 md:grid-cols-2">
                        <div
                          v-for="entry in inboundPreviewEntries(card)"
                          :key="entry.key"
                          class="border-base-300/50 bg-base-200/35 rounded-2xl border p-4"
                        >
                          <div class="text-base-content/50 text-xs font-semibold uppercase">
                            {{ entry.key }}
                          </div>
                          <div class="mt-1 font-mono text-sm break-all">
                            {{ entry.value }}
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="!inboundPreviewEntries(card).length"
                        class="text-base-content/55 py-8 text-center text-sm"
                      >
                        暂无更多字段
                      </div>
                    </div>
                  </div>
                </section>
              </template>
            </Draggable>
          </div>

          <div
            v-else
            class="base-container"
          >
            <div
              class="text-base-content/55 flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-10 text-center"
            >
              <div class="text-xl font-semibold">
                {{ inboundCards.length ? '没有匹配的入站卡片' : '还没有入站配置' }}
              </div>
              <p class="max-w-xl text-sm leading-6">
                {{
                  inboundCards.length
                    ? '换个关键词试试，或者直接新增一个新的入站入口。'
                    : '先创建一个入站入口，按类型填写不同字段。'
                }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        v-else-if="activeTab === 'rule-sets'"
        class="flex h-full min-h-0 flex-col"
      >
        <div class="space-y-4">
          <article class="base-container min-h-0 p-4">
            <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div class="space-y-1">
                <h4 class="text-base font-semibold">MetaCubeX/meta-rules-dat</h4>
                <p class="text-base-content/60 text-sm">
                  {{ builtInRuleIndexSummary }}
                </p>
              </div>
              <div class="flex flex-col gap-2 md:items-end">
                <div class="flex min-w-64 items-center gap-2">
                  <label class="input input-sm input-bordered flex flex-1 items-center gap-2">
                    <input
                      v-model="builtInRuleSearch"
                      class="grow"
                      type="search"
                      placeholder="搜索名称、路径"
                      @keydown.enter="triggerBuiltInRuleSearch"
                    />
                  </label>
                  <button
                    class="btn btn-sm btn-outline"
                    type="button"
                    @click="triggerBuiltInRuleSearch"
                  >
                    搜索
                  </button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="badge badge-outline">sing-box: sing</span>
                  <span class="badge badge-outline">mihomo: meta</span>
                  <span class="badge badge-ghost">{{ builtInRuleTableData.total || 0 }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="builtInRuleIndexError"
              class="text-error mb-3 text-sm"
            >
              {{ builtInRuleIndexError }}
            </div>

            <div class="rounded-box border-base-300/60 bg-base-200/30 overflow-hidden border">
              <div
                v-if="(builtInRuleTableData.entries || []).length > 0"
                class="overflow-x-auto"
              >
                <table class="table-pin-rows table-zebra table min-w-[980px]">
                  <thead class="bg-base-100/95">
                    <tr>
                      <th>名称</th>
                      <th>逻辑路径</th>
                      <th>sing-box</th>
                      <th>mihomo</th>
                      <th>链接</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in builtInRuleTableData.entries || []"
                      :key="entry.logicalPath"
                    >
                      <td class="font-medium whitespace-nowrap">{{ entry.name }}</td>
                      <td class="max-w-xl font-mono text-xs">{{ entry.logicalPath }}</td>
                      <td>
                        <div
                          v-if="entry.files['sing-box']"
                          class="flex flex-wrap items-center gap-1 text-xs"
                        >
                          <span class="badge badge-outline badge-sm">
                            {{ entry.files['sing-box']?.format || '-' }}
                          </span>
                        </div>
                        <span
                          v-else
                          class="text-base-content/45 text-xs"
                        >
                          -
                        </span>
                      </td>
                      <td>
                        <div
                          v-if="entry.files.mihomo"
                          class="flex flex-wrap items-center gap-1 text-xs"
                        >
                          <span class="badge badge-outline badge-sm">
                            {{ entry.files.mihomo?.behavior || '-' }}
                          </span>
                          <span class="badge badge-outline badge-sm">
                            {{ entry.files.mihomo?.format || '-' }}
                          </span>
                        </div>
                        <span
                          v-else
                          class="text-base-content/45 text-xs"
                        >
                          -
                        </span>
                      </td>
                      <td>
                        <div class="flex gap-2 text-xs">
                          <a
                            v-if="entry.files['sing-box']?.rawUrl"
                            class="link"
                            :href="entry.files['sing-box']?.rawUrl"
                            target="_blank"
                            rel="noreferrer"
                          >
                            sing
                          </a>
                          <a
                            v-if="entry.files.mihomo?.rawUrl"
                            class="link"
                            :href="entry.files.mihomo?.rawUrl"
                            target="_blank"
                            rel="noreferrer"
                          >
                            meta
                          </a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                v-else
                class="text-base-content/55 py-8 text-center text-sm"
              >
                {{ builtInRuleSearch.trim() ? '没有匹配的内置规则集' : '尚未刷新内置规则集索引' }}
              </div>
            </div>

            <div
              v-if="builtInRuleTotalPages > 1"
              class="mt-4 flex items-center justify-between gap-3"
            >
              <div class="text-base-content/55 text-sm">
                第 {{ builtInRuleTablePage }} / {{ builtInRuleTotalPages }} 页
              </div>
              <div class="join">
                <button
                  class="btn btn-sm join-item"
                  :disabled="builtInRuleTablePage <= 1"
                  @click="builtInRuleTablePage -= 1"
                >
                  上一页
                </button>
                <button
                  class="btn btn-sm join-item"
                  :disabled="builtInRuleTablePage >= builtInRuleTotalPages"
                  @click="builtInRuleTablePage += 1"
                >
                  下一页
                </button>
              </div>
            </div>
          </article>

          <div class="space-y-4">
            <article class="base-container min-h-0 p-4">
              <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 class="text-base font-semibold">自定义规则来源仓库</h4>
                  <p class="text-base-content/60 mt-1 text-sm">内置仓库只读，自定义仓库可编辑。</p>
                </div>
                <div class="flex flex-col gap-2 md:items-end">
                  <div class="flex min-w-64 items-center gap-2">
                    <label class="input input-sm input-bordered flex flex-1 items-center gap-2">
                      <input
                        v-model="repositoryTableSearch"
                        class="grow"
                        type="search"
                        placeholder="搜索名称、仓库、ID"
                        @keydown.enter="triggerRepositoryTableSearch"
                      />
                    </label>
                    <button
                      class="btn btn-sm btn-outline"
                      type="button"
                      @click="triggerRepositoryTableSearch"
                    >
                      搜索
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="badge badge-ghost">{{ repositoryTableData.total }}</span>
                    <button
                      class="btn btn-sm btn-outline"
                      type="button"
                      @click="openCreateRepositoryDialog()"
                    >
                      新建仓库
                    </button>
                  </div>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="table-pin-rows table-zebra table-sm table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>仓库</th>
                      <th>支持内核</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in repositoryTableData.items"
                      :key="item.id"
                    >
                      <td>
                        <div class="font-medium">{{ item.name }}</div>
                        <div class="text-base-content/55 text-xs">{{ item.id }}</div>
                      </td>
                      <td class="font-mono text-xs">{{ item.owner }}/{{ item.repository }}</td>
                      <td class="text-xs">
                        {{ (item.supportedCores || []).join(' / ') || '-' }}
                      </td>
                      <td>
                        <div class="flex justify-end gap-2">
                          <span
                            v-if="item.builtIn"
                            class="badge badge-outline"
                          >
                            内置
                          </span>
                          <template v-else>
                            <button
                              class="btn btn-ghost btn-xs"
                              type="button"
                              @click="openEditRepositoryDialog(item.id)"
                            >
                              编辑
                            </button>
                            <button
                              class="btn btn-ghost btn-xs text-error"
                              type="button"
                              @click="deleteRepository(item.id)"
                            >
                              删除
                            </button>
                          </template>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="repositoryTableData.items.length === 0">
                      <td
                        class="text-base-content/55 py-8 text-center text-sm"
                        colspan="4"
                      >
                        {{
                          repositoryTableSearch.trim() ? '没有匹配的规则来源仓库' : '暂无自定义仓库'
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                v-if="repositoryTableTotalPages > 1"
                class="mt-4 flex items-center justify-between gap-3"
              >
                <div class="text-base-content/55 text-sm">
                  第 {{ repositoryTablePage }} / {{ repositoryTableTotalPages }} 页
                </div>
                <div class="join">
                  <button
                    class="btn btn-sm join-item"
                    :disabled="repositoryTablePage <= 1"
                    @click="repositoryTablePage -= 1"
                  >
                    上一页
                  </button>
                  <button
                    class="btn btn-sm join-item"
                    :disabled="repositoryTablePage >= repositoryTableTotalPages"
                    @click="repositoryTablePage += 1"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </article>

            <article class="base-container min-h-0 p-4">
              <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 class="text-base font-semibold">自定义 Sing-box Rule-sets</h4>
                  <p class="text-base-content/60 mt-1 text-sm">
                    路由页在 `sing-box` 模式下会直接引用这里的 `tag`。
                  </p>
                </div>
                <div class="flex flex-col gap-2 md:items-end">
                  <div class="flex min-w-64 items-center gap-2">
                    <label class="input input-sm input-bordered flex flex-1 items-center gap-2">
                      <input
                        v-model="singBoxRuleSetTableSearch"
                        class="grow"
                        type="search"
                        placeholder="搜索名称、tag、来源"
                        @keydown.enter="triggerSingBoxRuleSetTableSearch"
                      />
                    </label>
                    <button
                      class="btn btn-sm btn-outline"
                      type="button"
                      @click="triggerSingBoxRuleSetTableSearch"
                    >
                      搜索
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="badge badge-ghost">{{ singBoxRuleSetTableData.total }}</span>
                    <button
                      class="btn btn-sm btn-outline"
                      type="button"
                      @click="openCreateRuleResourceDialog('sing-box-rule-set')"
                    >
                      新建
                    </button>
                  </div>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="table-pin-rows table-zebra table-sm table min-w-[820px]">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>tag</th>
                      <th>来源</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in singBoxRuleSetTableData.items"
                      :key="item.id"
                    >
                      <td>
                        <div class="font-medium">{{ item.name }}</div>
                        <div class="text-base-content/55 text-xs">{{ item.id }}</div>
                      </td>
                      <td class="font-mono text-xs">{{ item.tag }}</td>
                      <td class="text-xs">{{ item.sourceMode }}</td>
                      <td>
                        <div class="flex justify-end gap-2">
                          <button
                            class="btn btn-ghost btn-xs"
                            type="button"
                            @click="openEditRuleResourceDialog('sing-box-rule-set', item.id)"
                          >
                            编辑
                          </button>
                          <button
                            class="btn btn-ghost btn-xs text-error"
                            type="button"
                            @click="deleteRuleResource('sing-box-rule-set', item.id)"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="singBoxRuleSetTableData.items.length === 0">
                      <td
                        class="text-base-content/55 py-8 text-center text-sm"
                        colspan="4"
                      >
                        {{
                          singBoxRuleSetTableSearch.trim()
                            ? '没有匹配的 Sing-box 规则集'
                            : '暂无自定义 Sing-box 规则集'
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                v-if="singBoxRuleSetTableTotalPages > 1"
                class="mt-4 flex items-center justify-between gap-3"
              >
                <div class="text-base-content/55 text-sm">
                  第 {{ singBoxRuleSetTablePage }} / {{ singBoxRuleSetTableTotalPages }} 页
                </div>
                <div class="join">
                  <button
                    class="btn btn-sm join-item"
                    :disabled="singBoxRuleSetTablePage <= 1"
                    @click="singBoxRuleSetTablePage -= 1"
                  >
                    上一页
                  </button>
                  <button
                    class="btn btn-sm join-item"
                    :disabled="singBoxRuleSetTablePage >= singBoxRuleSetTableTotalPages"
                    @click="singBoxRuleSetTablePage += 1"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </article>

            <article class="base-container min-h-0 p-4">
              <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 class="text-base font-semibold">自定义 Mihomo Rule-providers</h4>
                  <p class="text-base-content/60 mt-1 text-sm">
                    路由页在 `mihomo` 模式下会直接引用这里的 provider 名称。
                  </p>
                </div>
                <div class="flex flex-col gap-2 md:items-end">
                  <div class="flex min-w-64 items-center gap-2">
                    <label class="input input-sm input-bordered flex flex-1 items-center gap-2">
                      <input
                        v-model="mihomoRuleProviderTableSearch"
                        class="grow"
                        type="search"
                        placeholder="搜索名称、provider、来源"
                        @keydown.enter="triggerMihomoRuleProviderTableSearch"
                      />
                    </label>
                    <button
                      class="btn btn-sm btn-outline"
                      type="button"
                      @click="triggerMihomoRuleProviderTableSearch"
                    >
                      搜索
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="badge badge-ghost">{{ mihomoRuleProviderTableData.total }}</span>
                    <button
                      class="btn btn-sm btn-primary"
                      type="button"
                      @click="openCreateRuleResourceDialog('mihomo-rule-provider')"
                    >
                      新建
                    </button>
                  </div>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="table-pin-rows table-zebra table-sm table min-w-[820px]">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>provider</th>
                      <th>来源</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in mihomoRuleProviderTableData.items"
                      :key="item.id"
                    >
                      <td>
                        <div class="font-medium">{{ item.name }}</div>
                        <div class="text-base-content/55 text-xs">{{ item.id }}</div>
                      </td>
                      <td class="font-mono text-xs">{{ item.provider }}</td>
                      <td class="text-xs">{{ item.sourceMode }}</td>
                      <td>
                        <div class="flex justify-end gap-2">
                          <button
                            class="btn btn-ghost btn-xs"
                            type="button"
                            @click="openEditRuleResourceDialog('mihomo-rule-provider', item.id)"
                          >
                            编辑
                          </button>
                          <button
                            class="btn btn-ghost btn-xs text-error"
                            type="button"
                            @click="deleteRuleResource('mihomo-rule-provider', item.id)"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="mihomoRuleProviderTableData.items.length === 0">
                      <td
                        class="text-base-content/55 py-8 text-center text-sm"
                        colspan="4"
                      >
                        {{
                          mihomoRuleProviderTableSearch.trim()
                            ? '没有匹配的 Mihomo Provider'
                            : '暂无自定义 Mihomo Provider'
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                v-if="mihomoRuleProviderTableTotalPages > 1"
                class="mt-4 flex items-center justify-between gap-3"
              >
                <div class="text-base-content/55 text-sm">
                  第 {{ mihomoRuleProviderTablePage }} / {{ mihomoRuleProviderTableTotalPages }} 页
                </div>
                <div class="join">
                  <button
                    class="btn btn-sm join-item"
                    :disabled="mihomoRuleProviderTablePage <= 1"
                    @click="mihomoRuleProviderTablePage -= 1"
                  >
                    上一页
                  </button>
                  <button
                    class="btn btn-sm join-item"
                    :disabled="mihomoRuleProviderTablePage >= mihomoRuleProviderTableTotalPages"
                    @click="mihomoRuleProviderTablePage += 1"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        v-else-if="activeTab === 'diagnostics'"
        class="space-y-4"
      >
        <article class="base-container p-4">
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 class="text-lg font-semibold">最近错误</h3>
            </div>
            <button
              class="btn btn-sm"
              type="button"
              :disabled="operationEventsLoading"
              @click="loadOperationEvents"
            >
              {{ operationEventsLoading ? '刷新中…' : '刷新诊断' }}
            </button>
          </div>
          <div
            v-if="operationEventsError"
            class="text-error text-sm"
          >
            {{ operationEventsError }}
          </div>
          <div
            v-else-if="recentErrorEvents.length === 0"
            class="text-base-content/55 py-8 text-center text-sm"
          >
            暂无错误事件
          </div>
          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="table-sm table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>类型</th>
                  <th>资源</th>
                  <th>消息</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="event in recentErrorEvents"
                  :key="event.id || `${event.eventType}-${event.createdAt}`"
                >
                  <td class="whitespace-nowrap">
                    {{ formatOperationEventTime(event.createdAt) }}
                  </td>
                  <td>{{ event.eventType }}</td>
                  <td>{{ operationEventResourceLabel(event) }}</td>
                  <td>
                    <div class="max-w-xl truncate">{{ event.message }}</div>
                    <div
                      v-if="event.errorCode"
                      class="text-base-content/55 text-xs"
                    >
                      {{ event.errorCode }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <div class="grid gap-4 xl:grid-cols-2">
          <article class="base-container p-4">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h3 class="text-lg font-semibold">节点健康</h3>
              <span class="badge badge-ghost">{{ recentHealthSamples.length }}</span>
            </div>
            <div
              v-if="recentHealthSamples.length === 0"
              class="text-base-content/55 py-8 text-center text-sm"
            >
              暂无健康检查样本
            </div>
            <div
              v-else
              class="overflow-x-auto"
            >
              <table class="table-sm table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>节点</th>
                    <th>状态</th>
                    <th>延迟</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="sample in recentHealthSamples"
                    :key="sample.id || `${sample.nodeId}-${sample.checkedAt}`"
                  >
                    <td class="whitespace-nowrap">
                      {{ formatOperationEventTime(sample.checkedAt) }}
                    </td>
                    <td>{{ sample.nodeId }}</td>
                    <td>
                      <span
                        class="badge badge-sm"
                        :class="
                          sample.success
                            ? 'badge-success badge-outline'
                            : 'badge-error badge-outline'
                        "
                      >
                        {{ sample.success ? 'ok' : 'failed' }}
                      </span>
                    </td>
                    <td>
                      {{ sample.success ? `${sample.latencyMs}ms` : sample.errorSummary || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <article class="base-container p-4">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold">操作历史</h3>
            <span class="badge badge-ghost">{{ operationEvents.length }}</span>
          </div>
          <div
            v-if="operationEvents.length === 0"
            class="text-base-content/55 py-8 text-center text-sm"
          >
            暂无操作事件
          </div>
          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="table-sm table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>级别</th>
                  <th>类型</th>
                  <th>关联</th>
                  <th>消息</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="event in operationEvents"
                  :key="event.id || `${event.eventType}-${event.createdAt}`"
                >
                  <td class="whitespace-nowrap">
                    {{ formatOperationEventTime(event.createdAt) }}
                  </td>
                  <td>
                    <span
                      class="badge badge-sm"
                      :class="
                        event.severity === 'error' ? 'badge-error badge-outline' : 'badge-ghost'
                      "
                    >
                      {{ event.severity }}
                    </span>
                  </td>
                  <td>{{ event.eventType }}</td>
                  <td>{{ event.core || operationEventResourceLabel(event) }}</td>
                  <td class="max-w-xl truncate">{{ event.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section
        v-else-if="activeTab !== 'outbounds'"
        :class="
          activeTab === 'network'
            ? 'space-y-4 xl:columns-2 xl:gap-12 xl:space-y-0'
            : 'grid items-start gap-4 xl:grid-cols-2'
        "
      >
        <div
          v-for="section in visibleFormSections"
          :key="section.title"
          :class="[
            getSectionCardClass(section),
            activeTab === 'network' ? 'mb-4 break-inside-avoid xl:inline-block xl:w-full' : '',
          ]"
        >
          <div class="settings-section-label flex items-center justify-between gap-3 px-1">
            <span>{{ section.title }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-if="section.title === '时间同步'"
                class="btn btn-sm btn-outline"
                type="button"
                @click="openNtpDialDialog"
              >
                更多配置
              </button>
              <span
                v-if="section.title === '时间同步' && ntpDialConfiguredCount"
                class="badge badge-primary badge-outline"
              >
                已配置 {{ ntpDialConfiguredCount }} 项
              </span>
              <span
                v-if="getSectionItemCount(section)"
                class="badge badge-ghost badge-sm"
              >
                {{ getSectionItemCount(section) }} 项
              </span>
            </div>
          </div>

          <div
            v-if="section.kind === 'managed-dns-servers'"
            class="base-container space-y-4 p-4"
          >
            <div class="overflow-x-auto">
              <table class="table-pin-rows table-zebra table min-w-[1240px]">
                <thead>
                  <tr class="bg-base-100/95">
                    <th>#</th>
                    <th>名称</th>
                    <th>角色</th>
                    <th>协议</th>
                    <th>地址</th>
                    <th>端口</th>
                    <th>路径</th>
                    <th>detour</th>
                    <th>client_subnet</th>
                    <th>跳过证书</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(server, index) in dnsServers"
                    :key="server.id"
                  >
                    <td>{{ index + 1 }}</td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-36"
                        :value="server.name"
                        @input="
                          setDnsServerField(
                            index,
                            'name',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                    </td>
                    <td>
                      <select
                        class="select select-bordered select-sm w-32"
                        :value="server.role"
                        @change="
                          setDnsServerField(
                            index,
                            'role',
                            ($event.target as HTMLSelectElement).value as DnsServerRole,
                          )
                        "
                      >
                        <option
                          v-for="option in dnsServerRoleOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <select
                        class="select select-bordered select-sm w-28"
                        :value="server.protocol"
                        @change="
                          setDnsServerField(
                            index,
                            'protocol',
                            ($event.target as HTMLSelectElement).value as DnsServerProtocol,
                          )
                        "
                      >
                        <option
                          v-for="option in dnsServerProtocolOptions"
                          :key="option"
                          :value="option"
                        >
                          {{ option }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-52"
                        :value="server.address"
                        @input="
                          setDnsServerField(
                            index,
                            'address',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                    </td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-24"
                        :value="server.port"
                        @input="
                          setDnsServerField(
                            index,
                            'port',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                    </td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-36"
                        :value="server.path"
                        @input="
                          setDnsServerField(
                            index,
                            'path',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                    </td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-32"
                        :value="server.detour"
                        @input="
                          setDnsServerField(
                            index,
                            'detour',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                    </td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-40"
                        :value="server.clientSubnet"
                        @input="
                          setDnsServerField(
                            index,
                            'clientSubnet',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                    </td>
                    <td>
                      <input
                        class="checkbox checkbox-primary checkbox-sm"
                        type="checkbox"
                        :checked="server.skipCertVerify"
                        @change="
                          setDnsServerField(
                            index,
                            'skipCertVerify',
                            ($event.target as HTMLInputElement).checked,
                          )
                        "
                      />
                    </td>
                    <td>
                      <button
                        class="btn btn-ghost btn-xs text-error"
                        type="button"
                        @click="removeDnsServer(index)"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-end">
              <button
                class="btn btn-sm btn-outline"
                type="button"
                @click="addDnsServer"
              >
                新增服务器
              </button>
            </div>
          </div>

          <div
            v-else-if="section.kind === 'managed-dns-policies'"
            class="base-container space-y-4 p-4"
          >
            <div class="overflow-x-auto">
              <table class="table-pin-rows table-zebra table min-w-[920px]">
                <thead>
                  <tr class="bg-base-100/95">
                    <th>#</th>
                    <th>匹配类型</th>
                    <th>匹配值</th>
                    <th>解析服务器</th>
                    <th>strategy</th>
                    <th>client_subnet</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(rule, index) in dnsRules"
                    :key="rule.id"
                  >
                    <td>{{ index + 1 }}</td>
                    <td>
                      <select
                        class="select select-bordered select-sm w-32"
                        :value="rule.matcher"
                        @change="
                          setDnsRuleField(
                            index,
                            'matcher',
                            ($event.target as HTMLSelectElement).value as DnsPolicyMatcher,
                          )
                        "
                      >
                        <option
                          v-for="option in dnsPolicyMatcherOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-52"
                        :value="rule.value"
                        @input="
                          setDnsRuleField(index, 'value', ($event.target as HTMLInputElement).value)
                        "
                      />
                    </td>
                    <td>
                      <select
                        class="select select-bordered select-sm w-36"
                        :value="rule.serverName"
                        @change="
                          setDnsRuleField(
                            index,
                            'serverName',
                            ($event.target as HTMLSelectElement).value,
                          )
                        "
                      >
                        <option value="">默认解析</option>
                        <option
                          v-for="server in dnsServers"
                          :key="server.id"
                          :value="server.name"
                        >
                          {{ server.name || server.id }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <select
                        class="select select-bordered select-sm w-32"
                        :value="rule.strategy"
                        @change="
                          setDnsRuleField(
                            index,
                            'strategy',
                            ($event.target as HTMLSelectElement).value,
                          )
                        "
                      >
                        <option value=""></option>
                        <option
                          v-for="option in dnsStrategyOptions"
                          :key="option"
                          :value="option"
                        >
                          {{ option }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <input
                        class="input input-bordered input-sm w-40"
                        :value="rule.clientSubnet"
                        @input="
                          setDnsRuleField(
                            index,
                            'clientSubnet',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                    </td>
                    <td>
                      <button
                        class="btn btn-ghost btn-xs text-error"
                        type="button"
                        @click="removeDnsRule(index)"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-end">
              <button
                class="btn btn-sm btn-outline"
                type="button"
                @click="addDnsRule"
              >
                新增规则
              </button>
            </div>
          </div>

          <div
            v-else-if="section.kind === 'managed-dns-preview'"
            class="base-container grid gap-4 p-4 xl:grid-cols-2"
          >
            <div class="border-base-300/70 rounded-lg border">
              <div class="border-base-300/70 border-b px-4 py-3 text-sm font-semibold">mihomo</div>
              <pre class="max-h-[560px] overflow-auto p-4 text-xs leading-5">{{
                mihomoDnsPreview
              }}</pre>
            </div>
            <div class="border-base-300/70 rounded-lg border">
              <div class="border-base-300/70 border-b px-4 py-3 text-sm font-semibold">
                sing-box
              </div>
              <pre class="max-h-[560px] overflow-auto p-4 text-xs leading-5">{{
                singBoxDnsPreview
              }}</pre>
            </div>
          </div>

          <div
            v-else-if="section.kind === 'field-table'"
            class="settings-grid"
          >
            <div
              v-for="field in section.fields"
              :key="field.key"
              class="setting-item"
            >
              <div class="setting-item-label">
                {{ field.label }}
                <QuestionMarkCircleIcon
                  v-if="field.hint"
                  class="h-4 w-4 shrink-0"
                  :title="`${field.key}\n${field.hint}`"
                />
              </div>

              <input
                v-if="field.type === 'boolean'"
                class="toggle"
                type="checkbox"
                :checked="Boolean(baseConfigForm[field.key])"
                @change="setBooleanField(field.key, ($event.target as HTMLInputElement).checked)"
              />

              <select
                v-else-if="field.type === 'select'"
                class="select select-sm min-w-24"
                :value="String(baseConfigForm[field.key] ?? '')"
                @change="setTextField(field.key, ($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-for="option in field.options || []"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>

              <textarea
                v-else-if="field.type === 'textarea'"
                class="textarea textarea-sm my-2 min-h-[96px] min-w-0 flex-1 font-mono text-sm"
                :rows="field.rows || 4"
                :value="String(baseConfigForm[field.key] ?? '')"
                @input="setTextField(field.key, ($event.target as HTMLTextAreaElement).value)"
              />

              <div
                v-else
                class="text-base-content/55 flex min-w-0 flex-1 items-center justify-end gap-2"
              >
                <span class="hidden font-mono text-xs md:inline">{{ field.key }}</span>
                <input
                  class="input input-sm min-w-0 flex-1 md:max-w-md"
                  :type="field.type"
                  :value="String(baseConfigForm[field.key] ?? '')"
                  @input="setTextField(field.key, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>

          <div
            v-else
            class="settings-grid"
          >
            <div
              v-for="field in section.fields"
              :key="field.key"
              class="setting-item"
            >
              <div class="setting-item-label">
                {{ field.label }}
                <QuestionMarkCircleIcon
                  v-if="field.hint"
                  class="h-4 w-4 shrink-0"
                  :title="field.hint"
                />
              </div>

              <input
                v-if="field.type === 'boolean'"
                class="toggle"
                type="checkbox"
                :checked="Boolean(baseConfigForm[field.key])"
                @change="setBooleanField(field.key, ($event.target as HTMLInputElement).checked)"
              />

              <select
                v-else-if="field.type === 'select'"
                class="select select-sm min-w-24"
                :value="String(baseConfigForm[field.key] ?? '')"
                @change="setTextField(field.key, ($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-for="option in field.options || []"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>

              <textarea
                v-else-if="field.type === 'textarea'"
                class="textarea textarea-sm my-2 min-h-[108px] min-w-0 flex-1 font-mono text-sm"
                :rows="field.rows || 5"
                :placeholder="field.placeholder"
                :value="String(baseConfigForm[field.key] ?? '')"
                @input="setTextField(field.key, ($event.target as HTMLTextAreaElement).value)"
              />

              <input
                v-else
                class="input input-sm min-w-0 flex-1 md:max-w-md"
                :type="field.type"
                :placeholder="field.placeholder"
                :value="String(baseConfigForm[field.key] ?? '')"
                @input="setTextField(field.key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>

          <div
            v-if="!section.fields.length && !section.kind"
            class="border-base-300/50 bg-base-200/20 text-base-content/55 rounded-2xl border border-dashed px-4 py-8 text-sm"
          >
            这一组暂时作为结构占位，后续可接入 sing-box 原生字段。
          </div>
        </div>

        <article
          v-if="!visibleFormSections.length"
          class="base-container p-5 xl:col-span-2"
        >
          <div
            class="border-base-300/50 bg-base-200/20 text-base-content/55 rounded-2xl border border-dashed px-4 py-8 text-sm"
          >
            这一组暂时作为结构占位，后续可接入 sing-box 原生字段。
          </div>
        </article>
      </section>

      <section
        v-else-if="activeTab === 'outbounds'"
        class="flex h-full min-h-0 flex-col"
      >
        <div class="base-container m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="min-h-0 flex-1 overflow-auto">
            <table class="table-pin-rows table-zebra table-xs table min-w-[720px]">
              <thead class="bg-base-100 border-base-300/60 sticky top-0 z-10 border-b">
                <tr class="bg-base-100/95">
                  <th>来源</th>
                  <th>类型</th>
                  <th>标签</th>
                  <th>地址</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in outboundTableRows"
                  :key="row.id"
                  class="cursor-pointer"
                >
                  <td class="text-sm whitespace-nowrap">{{ row.sourceLabel }}</td>
                  <td class="text-sm whitespace-nowrap">{{ row.type }}</td>
                  <td class="font-mono text-sm whitespace-nowrap">{{ row.tag }}</td>
                  <td class="text-sm whitespace-nowrap">{{ row.address }}</td>
                  <td class="text-sm whitespace-nowrap">
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        class="btn btn-square btn-ghost btn-xs"
                        :disabled="!row.shareUri"
                        :title="row.shareUri ? '展示二维码' : '缺少节点信息'"
                        aria-label="展示二维码"
                        @click="openOutboundQrDialog(row)"
                      >
                        <QrCodeIcon class="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-square btn-ghost btn-xs"
                        :disabled="!row.shareUri"
                        :title="row.shareUri ? '复制节点信息' : '缺少节点信息'"
                        aria-label="复制节点信息"
                        @click="copyOutboundShareUri(row)"
                      >
                        <ClipboardDocumentIcon class="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-square btn-ghost btn-xs"
                        :disabled="!row.node"
                        :title="row.node ? '编辑节点' : '缺少节点信息'"
                        aria-label="编辑节点"
                        @click="openNodeEditDialog(row)"
                      >
                        <PencilSquareIcon class="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-square btn-ghost btn-xs text-error"
                        :disabled="!row.editable"
                        :title="row.editable ? '删除节点' : '只能删除手动添加节点'"
                        aria-label="删除节点"
                        @click="deleteOutboundNode(row)"
                      >
                        <TrashIcon class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        v-else
        class="space-y-4"
      ></section>
    </div>

    <div class="fixed right-6 bottom-6 z-30 flex flex-col items-end gap-2">
      <button
        v-for="action in floatingActions"
        :key="action.key"
        type="button"
        class="btn btn-sm shadow-lg"
        :class="action.primary ? 'btn-primary' : 'btn-neutral'"
        :disabled="action.disabled"
        @click="action.onClick"
      >
        <component
          :is="action.icon"
          class="h-4 w-4"
        />
        {{ action.label }}
      </button>
    </div>

    <DialogWrapper
      v-model="manualNodeDialogOpen"
      title="添加节点"
      box-class="max-w-2xl"
      @enter="submitManualNodeLink"
    >
      <div class="grid gap-4">
        <label class="form-control flex w-full flex-col gap-3">
          <span class="label-text block text-sm font-medium">节点链接</span>
          <textarea
            v-model.trim="manualNodeLink"
            class="textarea textarea-bordered textarea-sm min-h-32 w-full font-mono text-sm"
            placeholder="vless://... 或 trojan://..."
          />
        </label>
        <div
          v-if="manualNodeError"
          class="alert alert-error py-2 text-sm"
        >
          {{ manualNodeError }}
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="btn btn-ghost"
            @click="manualNodeDialogOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="manualNodeSubmitting || !manualNodeLink.trim()"
            @click="submitManualNodeLink"
          >
            添加
          </button>
        </div>
      </div>
    </DialogWrapper>

    <DialogWrapper
      v-model="nodeEditDialogOpen"
      title="编辑节点"
      box-class="max-w-4xl"
      @enter="submitNodeEditForm"
    >
      <div
        v-if="editNodeDraft"
        class="grid gap-4"
      >
        <div class="text-base-content/60 text-sm">保存后写入来源：手动添加。</div>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">tag</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.tag"
              @input="setEditNodeTextField('tag', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">type</span>
            <select
              class="select select-bordered select-sm w-full"
              :value="editNodeDraft.type"
              @change="setEditNodeTextField('type', ($event.target as HTMLSelectElement).value)"
            >
              <option value="vless">vless</option>
              <option value="trojan">trojan</option>
              <option value="shadowsocks">shadowsocks</option>
              <option value="vmess">vmess</option>
            </select>
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">server</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.server || ''"
              @input="setEditNodeTextField('server', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">server_port</span>
            <input
              class="input input-bordered input-sm w-full"
              type="number"
              :value="String(editNodeDraft.server_port || '')"
              @input="
                setEditNodeNumberField('server_port', ($event.target as HTMLInputElement).value)
              "
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">uuid</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.uuid || ''"
              @input="setEditNodeTextField('uuid', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">password</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.password || ''"
              @input="setEditNodeTextField('password', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">method</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.method || ''"
              @input="setEditNodeTextField('method', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">network</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.network || ''"
              @input="setEditNodeTextField('network', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">flow</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.flow || ''"
              @input="setEditNodeTextField('flow', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">tls.server_name</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.tls?.server_name || ''"
              @input="
                setEditNodeTlsTextField('server_name', ($event.target as HTMLInputElement).value)
              "
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">tls.reality.public_key</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.tls?.reality?.public_key || ''"
              @input="
                setEditNodeRealityTextField('public_key', ($event.target as HTMLInputElement).value)
              "
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">tls.reality.short_id</span>
            <input
              class="input input-bordered input-sm w-full"
              :value="editNodeDraft.tls?.reality?.short_id || ''"
              @input="
                setEditNodeRealityTextField('short_id', ($event.target as HTMLInputElement).value)
              "
            />
          </label>
          <label class="label cursor-pointer justify-start gap-3">
            <input
              class="checkbox checkbox-sm"
              type="checkbox"
              :checked="Boolean(editNodeDraft.tls?.enabled)"
              @change="
                setEditNodeTlsBooleanField('enabled', ($event.target as HTMLInputElement).checked)
              "
            />
            <span class="label-text text-sm font-medium">tls.enabled</span>
          </label>
          <label class="label cursor-pointer justify-start gap-3">
            <input
              class="checkbox checkbox-sm"
              type="checkbox"
              :checked="Boolean(editNodeDraft.tls?.insecure)"
              @change="
                setEditNodeTlsBooleanField('insecure', ($event.target as HTMLInputElement).checked)
              "
            />
            <span class="label-text text-sm font-medium">tls.insecure</span>
          </label>
        </div>
        <label class="form-control flex w-full flex-col gap-3">
          <span class="label-text block text-sm font-medium">raw JSON</span>
          <textarea
            v-model.trim="editNodeRawJson"
            class="textarea textarea-bordered textarea-sm min-h-40 w-full font-mono text-sm"
          />
        </label>
        <div
          v-if="editNodeError"
          class="alert alert-error py-2 text-sm"
        >
          {{ editNodeError }}
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="btn btn-ghost"
            @click="nodeEditDialogOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="editNodeSubmitting"
            @click="submitNodeEditForm"
          >
            保存
          </button>
        </div>
      </div>
    </DialogWrapper>

    <DialogWrapper
      v-model="outboundQrDialogOpen"
      :title="selectedOutboundRow?.tag || '节点二维码'"
      box-class="max-w-md"
    >
      <div class="flex flex-col items-center gap-4">
        <div
          class="border-base-300 rounded-lg border bg-white p-3"
          aria-label="节点二维码"
        >
          <img
            v-if="outboundQrCodeDataUrl"
            :src="outboundQrCodeDataUrl"
            class="h-64 w-64"
            alt="节点二维码"
          />
          <div
            v-else
            class="text-base-content/60 flex h-64 w-64 items-center justify-center text-sm"
          >
            正在生成二维码
          </div>
        </div>
        <div class="join w-full">
          <input
            class="input input-bordered join-item min-w-0 flex-1 font-mono text-xs"
            readonly
            :value="selectedOutboundRow?.shareUri || ''"
          />
          <button
            type="button"
            class="btn btn-square join-item"
            aria-label="复制节点信息"
            @click="selectedOutboundRow && copyOutboundShareUri(selectedOutboundRow)"
          >
            <ClipboardDocumentIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </DialogWrapper>

    <DialogWrapper
      v-model="repositoryDialogOpen"
      :title="editingRepositoryId ? '编辑仓库' : '新建仓库'"
      box-class="max-w-4xl"
      @enter="saveRepositoryDraft()"
    >
      <div class="grid gap-4 p-1">
        <p class="text-base-content/60 text-sm">为不同内核维护独立 ref 和根目录映射。</p>

        <label class="form-control gap-2">
          <span class="label-text text-sm font-medium">名称</span>
          <input
            v-model.trim="repositoryDraft.name"
            class="input input-bordered"
            type="text"
          />
        </label>

        <label class="form-control gap-2">
          <span class="label-text text-sm font-medium">描述</span>
          <textarea
            v-model.trim="repositoryDraft.description"
            class="textarea textarea-bordered min-h-24"
          />
        </label>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">Owner</span>
            <input
              v-model.trim="repositoryDraft.owner"
              class="input input-bordered"
              type="text"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">Repository</span>
            <input
              v-model.trim="repositoryDraft.repository"
              class="input input-bordered"
              type="text"
            />
          </label>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">内核映射</span>
            <button
              class="btn btn-ghost btn-xs"
              type="button"
              @click="addRepositoryMapping()"
            >
              添加映射
            </button>
          </div>
          <div
            v-for="(mapping, index) in repositoryDraft.coreMappings"
            :key="`${mapping.core}-${index}`"
            class="border-base-300/60 grid gap-3 rounded-2xl border p-3"
          >
            <div class="grid gap-3 md:grid-cols-3">
              <label class="form-control gap-2">
                <span class="label-text text-xs">内核</span>
                <select
                  v-model="mapping.core"
                  class="select select-bordered"
                >
                  <option
                    v-for="core in coreOptions"
                    :key="core"
                    :value="core"
                  >
                    {{ core }}
                  </option>
                </select>
              </label>
              <label class="form-control gap-2">
                <span class="label-text text-xs">Ref</span>
                <input
                  v-model.trim="mapping.ref"
                  class="input input-bordered"
                  type="text"
                />
              </label>
              <label class="form-control gap-2">
                <span class="label-text text-xs">根目录</span>
                <input
                  v-model.trim="mapping.rootPath"
                  class="input input-bordered"
                  type="text"
                />
              </label>
            </div>
            <div class="flex justify-end">
              <button
                class="btn btn-ghost btn-xs text-error"
                type="button"
                @click="repositoryDraft.coreMappings.splice(index, 1)"
              >
                删除映射
              </button>
            </div>
          </div>
        </div>

        <div class="mt-2 flex justify-end gap-2">
          <button
            class="btn btn-sm"
            type="button"
            @click="repositoryDialogOpen = false"
          >
            取消
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="repositorySaving || !repositoryDraft.name.trim()"
            @click="saveRepositoryDraft()"
          >
            {{ repositorySaving ? '保存中…' : '保存仓库' }}
          </button>
        </div>
      </div>
    </DialogWrapper>

    <DialogWrapper
      v-model="ruleResourceDialogOpen"
      :title="editingRuleResourceId ? '编辑规则资源' : '新建规则资源'"
      box-class="max-w-4xl"
      @enter="saveRuleResourceDraft()"
    >
      <div class="grid gap-4 p-1">
        <p class="text-base-content/60 text-sm">
          直接维护原生资源对象；如果来自仓库，浏览器只帮你回填路径和推荐名称。
        </p>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">资源类型</span>
            <select
              v-model="ruleResourceDraft.kind"
              class="select select-bordered"
              :disabled="Boolean(editingRuleResourceId)"
            >
              <option value="sing-box-rule-set">sing-box rule-set</option>
              <option value="mihomo-rule-provider">mihomo rule-provider</option>
            </select>
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">来源模式</span>
            <select
              v-model="ruleResourceDraft.sourceMode"
              class="select select-bordered"
            >
              <option
                v-for="mode in ruleAssetSourceModes"
                :key="mode"
                :value="mode"
              >
                {{ mode }}
              </option>
            </select>
          </label>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">名称</span>
            <input
              v-model.trim="ruleResourceDraft.name"
              class="input input-bordered"
              type="text"
            />
          </label>
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">
              {{ ruleResourceDraft.kind === 'sing-box-rule-set' ? 'tag' : 'provider' }}
            </span>
            <input
              :value="
                ruleResourceDraft.kind === 'sing-box-rule-set'
                  ? ruleResourceDraft.tag
                  : ruleResourceDraft.provider
              "
              class="input input-bordered font-mono"
              type="text"
              @input="setRuleResourcePrimaryName(($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <label class="form-control gap-2">
          <span class="label-text text-sm font-medium">描述</span>
          <textarea
            v-model.trim="ruleResourceDraft.description"
            class="textarea textarea-bordered min-h-24"
          />
        </label>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">Format</span>
            <input
              v-model.trim="ruleResourceDraft.format"
              class="input input-bordered"
              type="text"
            />
          </label>
          <label
            v-if="ruleResourceDraft.kind === 'sing-box-rule-set'"
            class="form-control gap-2"
          >
            <span class="label-text text-sm font-medium">更新间隔</span>
            <input
              v-model.trim="ruleResourceDraft.interval"
              class="input input-bordered"
              type="text"
              placeholder="例如：1d / 24h"
            />
          </label>
          <label
            v-else
            class="form-control gap-2"
          >
            <span class="label-text text-sm font-medium">Behavior</span>
            <input
              v-model.trim="ruleResourceDraft.behavior"
              class="input input-bordered"
              type="text"
              placeholder="例如：domain / ipcidr / classical"
            />
          </label>
        </div>

        <div
          v-if="ruleResourceDraft.sourceMode === 'repository-file'"
          class="space-y-3"
        >
          <div class="grid gap-3 md:grid-cols-3">
            <label class="form-control gap-2 md:col-span-2">
              <span class="label-text text-sm font-medium">仓库</span>
              <select
                v-model="ruleResourceDraft.repositoryId"
                class="select select-bordered"
              >
                <option value="">选择仓库</option>
                <option
                  v-for="repositoryItem in repositoryOptionsForDraft"
                  :key="repositoryItem.id"
                  :value="repositoryItem.id"
                >
                  {{ repositoryItem.name }}
                </option>
              </select>
            </label>
            <div class="form-control gap-2">
              <span class="label-text text-sm font-medium">浏览文件</span>
              <button
                class="btn btn-outline"
                type="button"
                :disabled="repositoryBrowsing || !ruleResourceDraft.repositoryId"
                @click="browseRepositoryFiles()"
              >
                {{ repositoryBrowsing ? '刷新中…' : '刷新远程文件信息' }}
              </button>
            </div>
          </div>

          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">文件路径</span>
            <input
              v-model.trim="ruleResourceDraft.path"
              class="input input-bordered"
              type="text"
              :placeholder="
                ruleResourceDraft.kind === 'sing-box-rule-set'
                  ? '例如：geosite/openai.srs'
                  : '例如：ruleset/openai.yaml'
              "
            />
          </label>

          <div
            v-if="isBrowserOpenForDraft"
            class="border-base-300/60 space-y-2 rounded-2xl border p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-medium">可选文件</div>
              <div
                v-if="repositoryBrowserRefreshedAt"
                class="text-base-content/55 text-xs"
              >
                {{ repositoryBrowserRefreshedAt }}
              </div>
            </div>
            <div
              v-if="repositoryBrowserError"
              class="text-error text-xs"
            >
              {{ repositoryBrowserError }}
            </div>
            <div
              v-else-if="repositoryBrowserEntries.length === 0"
              class="text-base-content/55 text-xs"
            >
              暂无文件
            </div>
            <div
              v-else
              class="max-h-40 space-y-2 overflow-y-auto"
            >
              <button
                v-for="entry in repositoryBrowserEntries"
                :key="entry.path"
                class="btn btn-ghost btn-sm h-auto w-full justify-start py-2"
                type="button"
                @click="applyRepositoryFileToDraft(entry)"
              >
                <div class="min-w-0 text-left">
                  <div class="truncate">{{ entry.path }}</div>
                  <div class="text-base-content/55 mt-1 text-xs">
                    {{
                      entry.kind === 'sing-box-rule-set'
                        ? `format: ${entry.format || '-'}`
                        : `behavior: ${entry.behavior || '-'} · format: ${entry.format || '-'}`
                    }}
                  </div>
                </div>
              </button>
              <div
                v-if="repositoryBrowserHasMore"
                class="text-base-content/55 px-1 text-xs"
              >
                还有更多匹配文件
              </div>
            </div>
          </div>
        </div>

        <label
          v-else-if="ruleResourceDraft.sourceMode === 'remote'"
          class="form-control gap-2"
        >
          <span class="label-text text-sm font-medium">URL</span>
          <input
            v-model.trim="ruleResourceDraft.url"
            class="input input-bordered"
            type="text"
          />
        </label>

        <label
          v-else
          class="form-control gap-2"
        >
          <span class="label-text text-sm font-medium">本地路径</span>
          <input
            v-model.trim="ruleResourceDraft.localPath"
            class="input input-bordered"
            type="text"
          />
        </label>

        <div class="mt-2 flex justify-end gap-2">
          <button
            class="btn btn-sm"
            type="button"
            @click="ruleResourceDialogOpen = false"
          >
            取消
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="ruleResourceSaving || !canSaveRuleResource"
            @click="saveRuleResourceDraft()"
          >
            {{ ruleResourceSaving ? '保存中…' : '保存规则资源' }}
          </button>
        </div>
      </div>
    </DialogWrapper>
  </div>

  <DialogWrapper
    v-model="ntpDialDialogOpen"
    title="NTP 更多配置"
    box-class="max-w-5xl"
  >
    <div class="space-y-4">
      <p class="text-base-content/65 text-sm leading-6">
        这些字段来自 sing-box 的共享拨号字段，用于补充 NTP 的上游拨号能力。提交后会追加到 NTP
        配置中。
      </p>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in ntpDialFields"
          :key="field.key"
          class="form-control gap-2"
          :class="getFieldSpanClass(field)"
        >
          <div
            v-if="field.type === 'boolean'"
            class="border-base-300/50 bg-base-200/25 flex min-h-[84px] items-center justify-between rounded-2xl border px-4 py-3"
          >
            <div class="pr-4">
              <div class="text-sm font-medium">{{ field.label }}</div>
              <p
                v-if="field.hint"
                class="text-base-content/60 mt-1 text-xs leading-5"
              >
                {{ field.hint }}
              </p>
            </div>
            <input
              class="toggle toggle-primary"
              type="checkbox"
              :checked="Boolean(ntpDialForm[field.key])"
              @change="
                setNtpDialBooleanField(field.key, ($event.target as HTMLInputElement).checked)
              "
            />
          </div>

          <template v-else>
            <span class="label-text text-sm font-medium">{{ field.label }}</span>

            <select
              v-if="field.type === 'select'"
              class="select select-bordered select-sm w-full"
              :value="String(ntpDialForm[field.key] ?? '')"
              @change="setNtpDialTextField(field.key, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="option in field.options || []"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <textarea
              v-else-if="field.type === 'textarea'"
              class="textarea textarea-bordered min-h-[108px] w-full font-mono text-sm"
              :rows="field.rows || 5"
              :placeholder="field.placeholder"
              :value="String(ntpDialForm[field.key] ?? '')"
              @input="setNtpDialTextField(field.key, ($event.target as HTMLTextAreaElement).value)"
            />

            <input
              v-else
              class="input input-bordered input-sm w-full"
              :type="field.type"
              :placeholder="field.placeholder"
              :value="String(ntpDialForm[field.key] ?? '')"
              @input="setNtpDialTextField(field.key, ($event.target as HTMLInputElement).value)"
            />

            <span
              v-if="field.hint"
              class="text-base-content/55 text-xs leading-5"
            >
              {{ field.hint }}
            </span>
          </template>
        </label>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button
          class="btn btn-ghost"
          type="button"
          @click="ntpDialDialogOpen = false"
        >
          取消
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click="submitNtpDialDialog"
        >
          保存并追加
        </button>
      </div>
    </div>
  </DialogWrapper>

  <DialogWrapper
    v-model="inboundDialogOpen"
    :title="editingInboundId ? '编辑入站' : '新增入站'"
    box-class="max-w-6xl"
  >
    <div class="space-y-6">
      <div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <label class="form-control gap-2">
          <span class="label-text text-sm font-medium">入站类型</span>
          <select
            :value="inboundDraft.type"
            class="select select-bordered select-sm w-full"
            @change="
              changeInboundDraftType(($event.target as HTMLSelectElement).value as InboundType)
            "
          >
            <option
              v-for="option in inboundTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <span class="text-base-content/55 text-xs leading-5">
            依据 sing-box 官方入站类型列表提供选项。
          </span>
        </label>

        <div
          class="border-base-300/60 bg-base-200/35 flex items-center justify-between rounded-2xl border px-4 py-3"
        >
          <div>
            <div class="text-sm font-medium">启用开关</div>
            <p class="text-base-content/55 mt-1 text-xs leading-5">
              关闭后卡片会保留在列表中，但作为禁用项显示。
            </p>
          </div>
          <input
            v-model="inboundDraft.enabled"
            class="toggle toggle-primary"
            type="checkbox"
          />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in currentInboundFields"
          :key="`${inboundDraft.type}-${field.key}`"
          class="form-control gap-2"
          :class="getInboundFieldSpanClass(field)"
        >
          <div
            v-if="field.type === 'boolean'"
            class="border-base-300/60 bg-base-200/30 flex min-h-[84px] items-center justify-between rounded-2xl border px-4 py-3"
          >
            <div class="pr-4">
              <div class="text-sm font-medium">{{ field.label }}</div>
              <p
                v-if="field.hint"
                class="text-base-content/55 mt-1 text-xs leading-5"
              >
                {{ field.hint }}
              </p>
            </div>
            <input
              class="toggle toggle-primary"
              type="checkbox"
              :checked="Boolean(inboundDraft.values[field.key])"
              @change="setInboundDraftValue(field.key, ($event.target as HTMLInputElement).checked)"
            />
          </div>

          <template v-else>
            <span class="label-text text-sm font-medium">{{ field.label }}</span>

            <select
              v-if="field.type === 'select'"
              class="select select-bordered select-sm w-full"
              :value="String(inboundDraft.values[field.key] ?? '')"
              @change="setInboundDraftValue(field.key, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="option in field.options || []"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <textarea
              v-else-if="field.type === 'textarea'"
              class="textarea textarea-bordered min-h-[112px] w-full font-mono text-sm"
              :rows="field.rows || 5"
              :placeholder="field.placeholder"
              :value="String(inboundDraft.values[field.key] ?? '')"
              @input="setInboundDraftValue(field.key, ($event.target as HTMLTextAreaElement).value)"
            />

            <input
              v-else
              class="input input-bordered input-sm w-full"
              :type="field.type"
              :placeholder="field.placeholder"
              :value="String(inboundDraft.values[field.key] ?? '')"
              @input="setInboundDraftValue(field.key, ($event.target as HTMLInputElement).value)"
            />

            <span
              v-if="field.hint"
              class="text-base-content/55 text-xs leading-5"
            >
              {{ field.hint }}
            </span>
          </template>
        </label>
      </div>

      <div class="border-base-300/50 flex items-center justify-end gap-3 border-t pt-4">
        <button
          class="btn btn-ghost"
          type="button"
          @click="inboundDialogOpen = false"
        >
          取消
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="inboundSaving || !canSubmitInboundDraft"
          @click="submitInboundDialog"
        >
          {{ inboundSaving ? '保存中…' : '保存入站' }}
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import {
  createMihomoRuleProviderAPI,
  createManualNodeAPI,
  createRuleSourceRepositoryAPI,
  deleteManualNodeAPI,
  createSingBoxRuleSetAPI,
  deleteMihomoRuleProviderAPI,
  deleteRuleSourceRepositoryAPI,
  deleteSingBoxRuleSetAPI,
  fetchGlobalConfigAPI,
  fetchLatestNodeHealthAPI,
  fetchRuleSourceRepositoryIndexAPI,
  queryMihomoRuleProvidersAPI,
  queryOperationEventsAPI,
  queryRuleSourceRepositoriesAPI,
  querySingBoxRuleSetsAPI,
  refreshRuleSourceRepositoryIndexAPI,
  refreshRuleSourceSelectableFilesAPI,
  searchRuleSourceRepositoryIndexAPI,
  updateGlobalConfigAPI,
  updateGlobalConfigInboundsAPI,
  updateMihomoRuleProviderAPI,
  updateRuleSourceRepositoryAPI,
  updateSingBoxRuleSetAPI,
} from '@/api/fastproxy'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { showNotification } from '@/helper/notification'
import {
  fastProxyBusy,
  fastProxyRepository,
  loadFastProxyWorkspace,
} from '@/store/fastproxyRepository'
import type {
  FastProxyCoreId,
  FastProxyGlobalConfig,
  FastProxyGlobalDNSRule,
  FastProxyGlobalDNSServer,
  FastProxyManagedInbound,
  FastProxyMihomoRuleProviderResource,
  FastProxyHealthCheckSample,
  FastProxyNormalizedNode,
  FastProxyOperationEvent,
  FastProxyMihomoRuleProviderPage,
  FastProxyRuleAssetSourceMode,
  FastProxyRuleSourceIndex,
  FastProxyRuleSourceIndexEntry,
  FastProxyRuleSourceRepositoryPage,
  FastProxyRuleSourceSelectableFile,
  FastProxySingBoxRuleSetPage,
  FastProxySingBoxRuleSetResource,
} from '@/types/fastproxy'
import {
  Bars3Icon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  QrCodeIcon,
  ServerStackIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import * as QRCode from 'qrcode'
import type { Component } from 'vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Draggable from 'vuedraggable'

type ConfigTabKey = 'dns' | 'network' | 'inbounds' | 'outbounds' | 'rule-sets' | 'diagnostics'
type ConfigTabMeta = {
  key: ConfigTabKey
  label: string
  heading: string
  description: string
  icon: Component
  count: number
}
type FloatingAction = {
  key: string
  label: string
  icon: Component
  onClick: () => void | Promise<void>
  disabled?: boolean
  primary?: boolean
}
type BaseFieldType = 'text' | 'number' | 'textarea' | 'select' | 'boolean'

type BaseFormField = {
  key: string
  label: string
  type: BaseFieldType
  defaultValue: string | boolean
  placeholder?: string
  hint?: string
  rows?: number
  span?: 'normal' | 'wide' | 'full'
  options?: Array<{ label: string; value: string }>
}

type BaseFormSection = {
  tab: Exclude<ConfigTabKey, 'outbounds'>
  kind?:
    | 'default'
    | 'managed-dns-servers'
    | 'managed-dns-policies'
    | 'managed-dns-preview'
    | 'field-table'
  title: string
  description: string
  fields: BaseFormField[]
}

type InboundType =
  | 'direct'
  | 'mixed'
  | 'socks'
  | 'http'
  | 'shadowsocks'
  | 'vmess'
  | 'trojan'
  | 'naive'
  | 'hysteria'
  | 'shadowtls'
  | 'tuic'
  | 'hysteria2'
  | 'vless'
  | 'anytls'
  | 'tun'
  | 'redirect'
  | 'tproxy'
  | 'cloudflared'

type InboundField = Omit<BaseFormField, 'defaultValue'> & {
  defaultValue: string | boolean
}

type InboundCard = {
  id: string
  enabled: boolean
  type: InboundType
  values: Record<string, string | boolean>
}

type InboundAuditIssue = {
  inboundId: string
  core: FastProxyCoreId
  severity: 'error' | 'warning' | 'info'
  field?: string
  message: string
}

const { padding } = usePaddingForViews()
const activeTab = ref<ConfigTabKey>('network')

const busy = computed(() => fastProxyBusy.value)
const operationEvents = ref<FastProxyOperationEvent[]>([])
const recentErrorEvents = ref<FastProxyOperationEvent[]>([])
const recentHealthSamples = ref<FastProxyHealthCheckSample[]>([])
const operationEventsLoading = ref(false)
const operationEventsError = ref('')
const ntpDialDialogOpen = ref(false)
const inboundDialogOpen = ref(false)
const editingInboundId = ref<string | null>(null)
const inboundSearch = ref('')
const inboundExpandedMap = ref<Record<string, boolean>>({})
const inboundSaving = ref(false)
const globalConfigSaving = ref(false)
const outboundQrDialogOpen = ref(false)
const selectedOutboundRow = ref<OutboundTableRow | null>(null)
const outboundQrCodeDataUrl = ref('')
const manualNodeDialogOpen = ref(false)
const manualNodeLink = ref('')
const manualNodeError = ref('')
const manualNodeSubmitting = ref(false)
const nodeEditDialogOpen = ref(false)
const editNodeDraft = ref<FastProxyNormalizedNode | null>(null)
const editingNodeOriginalTag = ref('')
const editingNodeWasManual = ref(false)
const editNodeRawJson = ref('')
const editNodeError = ref('')
const editNodeSubmitting = ref(false)
type DnsMode = 'real-ip' | 'fake-ip'
type DnsCacheAlgorithm = 'lru' | 'arc'
type DnsServerRole = 'bootstrap' | 'default' | 'fallback' | 'direct' | 'proxy' | 'policy'
type DnsServerProtocol = 'system' | 'udp' | 'tcp' | 'tls' | 'https' | 'h3' | 'quic'
type DnsPolicyMatcher = 'domain' | 'domain_suffix' | 'geosite' | 'rule_set'
type DnsServerRow = {
  id: string
  name: string
  role: DnsServerRole
  protocol: DnsServerProtocol
  address: string
  port: string
  path: string
  detour: string
  clientSubnet: string
  skipCertVerify: boolean
}
type DnsRuleRow = {
  id: string
  matcher: DnsPolicyMatcher
  value: string
  serverName: string
  strategy: string
  clientSubnet: string
}
const dnsModeOptions: DnsMode[] = ['fake-ip', 'real-ip']
const dnsCacheAlgorithmOptions: DnsCacheAlgorithm[] = ['lru', 'arc']
const dnsServerRoleOptions: Array<{ label: string; value: DnsServerRole }> = [
  { label: '启动解析', value: 'bootstrap' },
  { label: '默认解析', value: 'default' },
  { label: '后备解析', value: 'fallback' },
  { label: '直连解析', value: 'direct' },
  { label: '节点解析', value: 'proxy' },
  { label: '策略解析', value: 'policy' },
]
const dnsServerProtocolOptions: DnsServerProtocol[] = [
  'system',
  'udp',
  'tcp',
  'tls',
  'https',
  'h3',
  'quic',
]
const dnsPolicyMatcherOptions: Array<{ label: string; value: DnsPolicyMatcher }> = [
  { label: '域名', value: 'domain' },
  { label: '域名后缀', value: 'domain_suffix' },
  { label: 'geosite', value: 'geosite' },
  { label: '规则集', value: 'rule_set' },
]
const dnsStrategyOptions = ['prefer_ipv4', 'prefer_ipv6', 'ipv4_only', 'ipv6_only']
const dnsServers = ref<DnsServerRow[]>([])
const dnsRules = ref<DnsRuleRow[]>([])
type OutboundTableRow = {
  id: string
  source: 'repository'
  sourceLabel: string
  type: string
  tag: string
  address: string
  shareUri: string
  editable: boolean
  node: FastProxyNormalizedNode | null
}
type RepositoryMappingDraft = {
  core: FastProxyCoreId
  ref: string
  rootPath: string
}

type RepositoryDraft = {
  id: string
  name: string
  description: string
  owner: string
  repository: string
  coreMappings: RepositoryMappingDraft[]
}

type RuleResourceKindDraft = 'sing-box-rule-set' | 'mihomo-rule-provider'

type RuleResourceDraft = {
  kind: RuleResourceKindDraft
  id: string
  name: string
  description: string
  sourceMode: FastProxyRuleAssetSourceMode
  repositoryId: string
  ref: string
  path: string
  url: string
  localPath: string
  tag: string
  provider: string
  behavior: string
  format: string
  interval: string
}

const builtInRuleSourceRepositoryId = 'metacubex-meta-rules-dat'
const repositoryWorkspace = computed(() => fastProxyRepository.value)
const ruleSourceRepositories = computed(
  () => repositoryWorkspace.value?.ruleSourceRepositories || [],
)
const customRuleSourceRepositories = computed(() =>
  ruleSourceRepositories.value.filter((item) => !item.builtIn),
)
const singBoxRuleSets = computed(() => repositoryWorkspace.value?.singBoxRuleSets || [])
const mihomoRuleProviders = computed(() => repositoryWorkspace.value?.mihomoRuleProviders || [])
const builtInRuleSourceIndex = computed(() => {
  return (
    repositoryWorkspace.value?.ruleSourceIndexes?.find(
      (item) => item.repositoryId === builtInRuleSourceRepositoryId && !(item.path || '').trim(),
    ) || null
  )
})
const builtInRuleIndexRefreshing = ref(false)
const builtInRuleIndexError = ref('')
const builtInRuleIndexPageSize = 500
const builtInRuleTablePage = ref(1)
const builtInRuleTablePageSize = 20
const builtInRuleSearch = ref('')
const builtInRuleTableData = ref<FastProxyRuleSourceIndex>({
  repositoryId: builtInRuleSourceRepositoryId,
  owner: '',
  repository: '',
  refs: {},
  offset: 0,
  limit: builtInRuleTablePageSize,
  total: 0,
  nextOffset: 0,
  hasMore: false,
  entries: [],
})
const repositoryTablePage = ref(1)
const singBoxRuleSetTablePage = ref(1)
const mihomoRuleProviderTablePage = ref(1)
const customTablePageSize = 20
const repositoryTableSearch = ref('')
const singBoxRuleSetTableSearch = ref('')
const mihomoRuleProviderTableSearch = ref('')
const repositoryTableData = ref<FastProxyRuleSourceRepositoryPage>({
  items: [],
  offset: 0,
  limit: customTablePageSize,
  total: 0,
  nextOffset: 0,
  hasMore: false,
})
const singBoxRuleSetTableData = ref<FastProxySingBoxRuleSetPage>({
  items: [],
  offset: 0,
  limit: customTablePageSize,
  total: 0,
  nextOffset: 0,
  hasMore: false,
})
const mihomoRuleProviderTableData = ref<FastProxyMihomoRuleProviderPage>({
  items: [],
  offset: 0,
  limit: customTablePageSize,
  total: 0,
  nextOffset: 0,
  hasMore: false,
})
const repositoryDialogOpen = ref(false)
const ruleResourceDialogOpen = ref(false)
const editingRepositoryId = ref<string | null>(null)
const editingRuleResourceId = ref<string | null>(null)
const editingRuleResourceKind = ref<RuleResourceKindDraft>('sing-box-rule-set')
const repositorySaving = ref(false)
const ruleResourceSaving = ref(false)
const repositoryBrowsing = ref(false)
const repositoryBrowserEntries = ref<FastProxyRuleSourceSelectableFile[]>([])
const repositoryBrowserError = ref('')
const selectedRepositoryBrowserResourceKey = ref('')
const repositoryBrowserRefreshedAt = ref('')
const repositoryBrowserHasMore = ref(false)

const repositoryDraft = reactive<RepositoryDraft>({
  id: '',
  name: '',
  description: '',
  owner: '',
  repository: '',
  coreMappings: [],
})

const ruleResourceDraft = reactive<RuleResourceDraft>({
  kind: 'sing-box-rule-set',
  id: '',
  name: '',
  description: '',
  sourceMode: 'repository-file',
  repositoryId: '',
  ref: '',
  path: '',
  url: '',
  localPath: '',
  tag: '',
  provider: '',
  behavior: '',
  format: '',
  interval: '',
})

const inboundTypeOptions: Array<{ label: string; value: InboundType }> = [
  { label: 'Direct', value: 'direct' },
  { label: 'Mixed', value: 'mixed' },
  { label: 'SOCKS', value: 'socks' },
  { label: 'HTTP', value: 'http' },
  { label: 'Shadowsocks', value: 'shadowsocks' },
  { label: 'VMess', value: 'vmess' },
  { label: 'Trojan', value: 'trojan' },
  { label: 'Naive', value: 'naive' },
  { label: 'Hysteria', value: 'hysteria' },
  { label: 'ShadowTLS', value: 'shadowtls' },
  { label: 'TUIC', value: 'tuic' },
  { label: 'Hysteria2', value: 'hysteria2' },
  { label: 'VLESS', value: 'vless' },
  { label: 'AnyTLS', value: 'anytls' },
  { label: 'Tun', value: 'tun' },
  { label: 'Redirect', value: 'redirect' },
  { label: 'TProxy', value: 'tproxy' },
  { label: 'Cloudflared', value: 'cloudflared' },
]

const inboundTypeLabelMap = Object.fromEntries(
  inboundTypeOptions.map((item) => [item.value, item.label]),
) as Record<InboundType, string>

const inboundInjectSupportMap: Partial<Record<InboundType, string>> = {
  mixed: 'TCP',
  socks: 'TCP',
  http: 'TCP',
  shadowsocks: 'TCP',
  vmess: 'TCP',
  trojan: 'TCP',
  shadowtls: 'TCP',
  vless: 'TCP',
  anytls: 'TCP',
}

const transportTypeOptions = [
  { label: 'ws', value: 'ws' },
  { label: 'http', value: 'http' },
  { label: 'grpc', value: 'grpc' },
]

const inboundFieldCatalog: Record<InboundType, InboundField[]> = {
  direct: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'direct-in', hint: '入站标签。' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '7890' },
    {
      key: 'network',
      label: 'network',
      type: 'select',
      defaultValue: '',
      options: [
        { label: 'both', value: '' },
        { label: 'tcp', value: 'tcp' },
        { label: 'udp', value: 'udp' },
      ],
    },
    { key: 'override_address', label: 'override_address', type: 'text', defaultValue: '' },
    { key: 'override_port', label: 'override_port', type: 'number', defaultValue: '' },
  ],
  mixed: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'mixed-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '7890' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'admin:admin',
      hint: '每行一个 `username:password`。',
    },
    {
      key: 'set_system_proxy',
      label: 'set_system_proxy',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  socks: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'socks-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '7891' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'admin:admin',
    },
    { key: 'udp_fragment', label: 'udp_fragment', type: 'boolean', defaultValue: false },
  ],
  http: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'http-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '7892' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'admin:admin',
    },
    {
      key: 'set_system_proxy',
      label: 'set_system_proxy',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  shadowsocks: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'ss-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '8388' },
    { key: 'method', label: 'method', type: 'text', defaultValue: '2022-blake3-aes-128-gcm' },
    { key: 'password', label: 'password', type: 'text', defaultValue: '' },
    {
      key: 'network',
      label: 'network',
      type: 'select',
      defaultValue: 'tcp',
      options: [
        { label: 'tcp', value: 'tcp' },
        { label: 'udp', value: 'udp' },
      ],
    },
  ],
  vmess: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'vmess-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '10086' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 5,
      span: 'wide',
      placeholder: 'uuid,alterId=0',
      hint: '每行一个用户，可带额外参数。',
    },
    { key: 'tls_enabled', label: 'tls.enabled', type: 'boolean', defaultValue: false },
    {
      key: 'transport',
      label: 'transport.type',
      type: 'select',
      defaultValue: 'ws',
      options: transportTypeOptions,
    },
  ],
  trojan: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'trojan-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '443' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'password',
    },
    { key: 'fallback', label: 'fallback', type: 'text', defaultValue: '' },
    { key: 'tls_enabled', label: 'tls.enabled', type: 'boolean', defaultValue: true },
  ],
  naive: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'naive-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '443' },
    { key: 'username', label: 'username', type: 'text', defaultValue: '' },
    { key: 'password', label: 'password', type: 'text', defaultValue: '' },
    { key: 'network', label: 'network', type: 'text', defaultValue: 'tcp' },
  ],
  hysteria: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'hysteria-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '8443' },
    { key: 'up_mbps', label: 'up_mbps', type: 'number', defaultValue: '100' },
    { key: 'down_mbps', label: 'down_mbps', type: 'number', defaultValue: '100' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'password',
    },
  ],
  shadowtls: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'shadowtls-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '443' },
    {
      key: 'version',
      label: 'version',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
      ],
    },
    { key: 'password', label: 'password', type: 'text', defaultValue: '' },
    {
      key: 'handshake_server',
      label: 'handshake.server',
      type: 'text',
      defaultValue: 'google.com',
    },
    {
      key: 'handshake_server_port',
      label: 'handshake.server_port',
      type: 'number',
      defaultValue: '443',
    },
  ],
  tuic: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'tuic-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '443' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'uuid:password',
    },
    { key: 'congestion_control', label: 'congestion_control', type: 'text', defaultValue: 'bbr' },
  ],
  hysteria2: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'hysteria2-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '8443' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'password',
    },
    { key: 'masquerade', label: 'masquerade', type: 'text', defaultValue: 'https://example.com' },
  ],
  vless: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'vless-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '443' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'uuid,flow=xtls-rprx-vision',
    },
    { key: 'tls_enabled', label: 'tls.enabled', type: 'boolean', defaultValue: true },
    {
      key: 'transport',
      label: 'transport.type',
      type: 'select',
      defaultValue: 'ws',
      options: transportTypeOptions,
    },
  ],
  anytls: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'anytls-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '443' },
    {
      key: 'users',
      label: 'users',
      type: 'textarea',
      defaultValue: '',
      rows: 4,
      span: 'wide',
      placeholder: 'password',
    },
    { key: 'padding_scheme', label: 'padding_scheme', type: 'text', defaultValue: '' },
  ],
  tun: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'tun-in' },
    {
      key: 'address',
      label: 'address',
      type: 'textarea',
      defaultValue: '172.19.0.1/30',
      rows: 2,
      span: 'wide',
      placeholder: '172.19.0.1/30',
    },
    { key: 'interface_name', label: 'interface_name', type: 'text', defaultValue: 'utun101' },
    { key: 'mtu', label: 'mtu', type: 'number', defaultValue: '9000' },
    { key: 'auto_route', label: 'auto_route', type: 'boolean', defaultValue: true },
    { key: 'auto_redirect', label: 'auto_redirect', type: 'boolean', defaultValue: true },
    {
      key: 'auto_detect_interface',
      label: 'auto_detect_interface',
      type: 'boolean',
      defaultValue: true,
    },
    { key: 'strict_route', label: 'strict_route', type: 'boolean', defaultValue: false },
    {
      key: 'stack',
      label: 'stack',
      type: 'select',
      defaultValue: 'system',
      options: [
        { label: 'system', value: 'system' },
        { label: 'gvisor', value: 'gvisor' },
        { label: 'mixed', value: 'mixed' },
      ],
    },
    {
      key: 'dns_hijack',
      label: 'dns_hijack',
      type: 'textarea',
      defaultValue: '',
      rows: 3,
      span: 'wide',
      placeholder: 'any:53',
      hint: '每行一个 DNS 劫持目标；mihomo 输出为 dns-hijack。',
    },
    {
      key: 'route_address',
      label: 'route_address',
      type: 'textarea',
      defaultValue: '',
      rows: 3,
      span: 'wide',
      placeholder: '0.0.0.0/1',
    },
    {
      key: 'route_exclude_address',
      label: 'route_exclude_address',
      type: 'textarea',
      defaultValue: '',
      rows: 3,
      span: 'wide',
      placeholder: '192.168.0.0/16',
    },
    {
      key: 'include_interface',
      label: 'include_interface',
      type: 'textarea',
      defaultValue: '',
      rows: 2,
    },
    {
      key: 'exclude_interface',
      label: 'exclude_interface',
      type: 'textarea',
      defaultValue: '',
      rows: 2,
    },
  ],
  redirect: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'redirect-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '7892' },
    {
      key: 'network',
      label: 'network',
      type: 'select',
      defaultValue: 'tcp',
      options: [{ label: 'tcp', value: 'tcp' }],
    },
  ],
  tproxy: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'tproxy-in' },
    { key: 'listen', label: 'listen', type: 'text', defaultValue: '0.0.0.0' },
    { key: 'listen_port', label: 'listen_port', type: 'number', defaultValue: '7893' },
    {
      key: 'network',
      label: 'network',
      type: 'select',
      defaultValue: 'tcp',
      options: [
        { label: 'tcp', value: 'tcp' },
        { label: 'udp', value: 'udp' },
      ],
    },
  ],
  cloudflared: [
    { key: 'tag', label: 'tag', type: 'text', defaultValue: 'cloudflared-in' },
    { key: 'token', label: 'token', type: 'textarea', defaultValue: '', rows: 4, span: 'full' },
    { key: 'ha_connections', label: 'ha_connections', type: 'number', defaultValue: '4' },
    {
      key: 'protocol',
      label: 'protocol',
      type: 'select',
      defaultValue: 'quic',
      options: [
        { label: 'quic', value: 'quic' },
        { label: 'http2', value: 'http2' },
      ],
    },
    { key: 'post_quantum', label: 'post_quantum', type: 'boolean', defaultValue: false },
    {
      key: 'edge_ip_version',
      label: 'edge_ip_version',
      type: 'select',
      defaultValue: '0',
      options: [
        { label: '0', value: '0' },
        { label: '4', value: '4' },
        { label: '6', value: '6' },
      ],
    },
    {
      key: 'datagram_version',
      label: 'datagram_version',
      type: 'select',
      defaultValue: 'v3',
      options: [
        { label: 'v2', value: 'v2' },
        { label: 'v3', value: 'v3' },
      ],
    },
    { key: 'grace_period', label: 'grace_period', type: 'text', defaultValue: '30s' },
    { key: 'region', label: 'region', type: 'text', defaultValue: '' },
  ],
}

const createInboundValues = (type: InboundType, current?: Record<string, string | boolean>) => {
  const values: Record<string, string | boolean> = {}
  for (const field of inboundFieldCatalog[type]) {
    values[field.key] =
      current?.[field.key] ??
      (type === 'tun' && field.key === 'address' ? defaultTunAddressValue() : field.defaultValue)
  }
  return values
}

const defaultTunAddressValue = () =>
  Boolean(baseConfigForm.ipv6) ? '172.19.0.1/30\nfdfe:dcba:9876::1/126' : '172.19.0.1/30'

const createInboundCard = (type: InboundType, current?: Partial<InboundCard>): InboundCard => ({
  id: current?.id || `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  enabled: current?.enabled ?? true,
  type,
  values: createInboundValues(type, current?.values),
})

const inboundCards = ref<InboundCard[]>([])
const inboundDraft = reactive<InboundCard>(createInboundCard('mixed'))

const toInteger = (value: string | boolean | undefined) => {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const splitLines = (value: string | boolean | undefined) => {
  if (typeof value !== 'string') {
    return []
  }
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const usersFromText = (value: string | boolean | undefined) =>
  splitLines(value).map((line) => {
    const [username, ...passwordParts] = line.split(':')
    return {
      username: username?.trim() || '',
      password: passwordParts.join(':').trim(),
    }
  })

const inboundStructuredKeys = new Set([
  'tag',
  'listen',
  'listen_port',
  'users',
  'interface_name',
  'mtu',
  'auto_route',
  'auto_redirect',
  'auto_detect_interface',
  'strict_route',
  'stack',
  'dns_hijack',
  'route_address',
  'route_exclude_address',
  'route_address_set',
  'route_exclude_address_set',
  'include_interface',
  'exclude_interface',
])

const inboundRawFromCard = (card: InboundCard): Record<string, unknown> => {
  const raw: Record<string, unknown> = {}
  for (const field of inboundFieldCatalog[card.type]) {
    if (inboundStructuredKeys.has(field.key)) continue
    const value = card.values[field.key]
    if (field.type === 'boolean') {
      raw[field.key] = Boolean(value)
      continue
    }
    if (field.type === 'number') {
      const parsed = toInteger(value)
      if (parsed) raw[field.key] = parsed
      continue
    }
    const text = String(value || '').trim()
    if (text) raw[field.key] = text
  }
  return raw
}

const inboundCardToManaged = (card: InboundCard): FastProxyManagedInbound => {
  const listenPort = toInteger(card.values.listen_port)
  const mtu = toInteger(card.values.mtu)
  return {
    id: card.id,
    enabled: card.enabled,
    tag: String(card.values.tag || `${card.type}-in`).trim(),
    kind: card.type,
    listen:
      card.type === 'tun'
        ? undefined
        : {
            address: String(card.values.listen || '').trim() || undefined,
            port: listenPort,
          },
    network: String(card.values.network || '').trim() || undefined,
    auth: splitLines(card.values.users).length
      ? {
          users: usersFromText(card.values.users),
        }
      : undefined,
    tun:
      card.type === 'tun'
        ? {
            address: splitLines(card.values.address),
            interfaceName: String(card.values.interface_name || '').trim() || undefined,
            device: String(card.values.interface_name || '').trim() || undefined,
            stack: String(card.values.stack || '').trim() || undefined,
            mtu,
            autoRoute: Boolean(card.values.auto_route),
            autoRedirect: Boolean(card.values.auto_redirect),
            autoDetectInterface: Boolean(card.values.auto_detect_interface),
            strictRoute: Boolean(card.values.strict_route),
            dnsHijack: splitLines(card.values.dns_hijack),
            routeAddress: splitLines(card.values.route_address),
            routeExcludeAddress: splitLines(card.values.route_exclude_address),
            routeAddressSet: splitLines(card.values.route_address_set),
            routeExcludeAddressSet: splitLines(card.values.route_exclude_address_set),
            includeInterface: splitLines(card.values.include_interface),
            excludeInterface: splitLines(card.values.exclude_interface),
          }
        : undefined,
    raw: inboundRawFromCard(card),
  }
}

const inboundRawValues = (inbound: FastProxyManagedInbound): Record<string, string | boolean> => {
  const values: Record<string, string | boolean> = {}
  for (const [key, value] of Object.entries(inbound.raw || {})) {
    if (typeof value === 'boolean') {
      values[key] = value
      continue
    }
    if (typeof value === 'string' || typeof value === 'number') {
      values[key] = String(value)
    }
  }
  return values
}

const managedInboundToCard = (inbound: FastProxyManagedInbound, index: number): InboundCard => {
  const type = (inboundTypeOptions.find((option) => option.value === inbound.kind)?.value ||
    'mixed') as InboundType
  return createInboundCard(type, {
    id: inbound.id || `global-inbound-${index}`,
    enabled: inbound.enabled,
    values: {
      ...inboundRawValues(inbound),
      tag: inbound.tag || `${type}-in`,
      listen: inbound.listen?.address || '0.0.0.0',
      listen_port: inbound.listen?.port ? String(inbound.listen.port) : '',
      network: inbound.network || '',
      users: (inbound.auth?.users || [])
        .map((user) => [user.username, user.password].filter(Boolean).join(':'))
        .join('\n'),
      address: (inbound.tun?.address || defaultTunAddressValue().split('\n')).join('\n'),
      interface_name: inbound.tun?.interfaceName || inbound.tun?.device || 'utun101',
      stack: inbound.tun?.stack || 'system',
      mtu: inbound.tun?.mtu ? String(inbound.tun.mtu) : '9000',
      auto_route: inbound.tun?.autoRoute ?? true,
      auto_redirect: inbound.tun?.autoRedirect ?? true,
      auto_detect_interface: inbound.tun?.autoDetectInterface ?? true,
      strict_route: inbound.tun?.strictRoute ?? false,
      dns_hijack: (inbound.tun?.dnsHijack || []).join('\n'),
      route_address: (inbound.tun?.routeAddress || []).join('\n'),
      route_exclude_address: (inbound.tun?.routeExcludeAddress || []).join('\n'),
      route_address_set: (inbound.tun?.routeAddressSet || []).join('\n'),
      route_exclude_address_set: (inbound.tun?.routeExcludeAddressSet || []).join('\n'),
      include_interface: (inbound.tun?.includeInterface || []).join('\n'),
      exclude_interface: (inbound.tun?.excludeInterface || []).join('\n'),
    },
  })
}

const ntpDialFields: BaseFormField[] = [
  {
    key: 'dialDetour',
    label: 'detour',
    type: 'text',
    defaultValue: '',
    hint: '上游出站标签；启用后其他拨号字段将被忽略。',
  },
  {
    key: 'dialBindInterface',
    label: 'bind_interface',
    type: 'text',
    defaultValue: '',
    hint: '要绑定到的网络接口。',
  },
  {
    key: 'dialInet4BindAddress',
    label: 'inet4_bind_address',
    type: 'text',
    defaultValue: '',
    hint: '要绑定的 IPv4 地址。',
  },
  {
    key: 'dialInet6BindAddress',
    label: 'inet6_bind_address',
    type: 'text',
    defaultValue: '',
    hint: '要绑定的 IPv6 地址。',
  },
  {
    key: 'dialBindAddressNoPort',
    label: 'bind_address_no_port',
    type: 'boolean',
    defaultValue: false,
    hint: '仅 Linux 支持；绑定源地址时不保留端口。',
  },
  {
    key: 'dialRoutingMark',
    label: 'routing_mark',
    type: 'text',
    defaultValue: '0',
    hint: '仅 Linux 支持；可填数字或十六进制字符串。',
  },
  {
    key: 'dialReuseAddr',
    label: 'reuse_addr',
    type: 'boolean',
    defaultValue: false,
    hint: '重用监听地址。',
  },
  {
    key: 'dialNetns',
    label: 'netns',
    type: 'text',
    defaultValue: '',
    hint: '仅 Linux 支持；网络命名空间名称或路径。',
  },
  {
    key: 'dialConnectTimeout',
    label: 'connect_timeout',
    type: 'text',
    defaultValue: '',
    hint: '连接超时，使用 Go Duration 格式，如 300ms、5s、2m。',
  },
  {
    key: 'dialTcpFastOpen',
    label: 'tcp_fast_open',
    type: 'boolean',
    defaultValue: false,
    hint: '启用 TCP Fast Open。',
  },
  {
    key: 'dialTcpMultiPath',
    label: 'tcp_multi_path',
    type: 'boolean',
    defaultValue: false,
    hint: '启用 TCP Multi Path。',
  },
  {
    key: 'dialDisableTcpKeepAlive',
    label: 'disable_tcp_keep_alive',
    type: 'boolean',
    defaultValue: false,
    hint: '禁用 TCP keep alive。',
  },
  {
    key: 'dialTcpKeepAlive',
    label: 'tcp_keep_alive',
    type: 'text',
    defaultValue: '5m',
    hint: 'TCP keep alive 初始周期，默认 5m。',
  },
  {
    key: 'dialTcpKeepAliveInterval',
    label: 'tcp_keep_alive_interval',
    type: 'text',
    defaultValue: '75s',
    hint: 'TCP keep alive 间隔，默认 75s。',
  },
  {
    key: 'dialUdpFragment',
    label: 'udp_fragment',
    type: 'boolean',
    defaultValue: false,
    hint: '启用 UDP 分段。',
  },
  {
    key: 'dialDomainResolver',
    label: 'domain_resolver',
    type: 'textarea',
    defaultValue: '',
    rows: 3,
    hint: '用于解析域名的解析器；可填 server 字符串或规则对象。',
  },
  {
    key: 'dialNetworkStrategy',
    label: 'network_strategy',
    type: 'select',
    defaultValue: 'default',
    options: [
      { label: 'default', value: 'default' },
      { label: 'hybrid', value: 'hybrid' },
      { label: 'fallback', value: 'fallback' },
    ],
    hint: '网络接口选择策略。',
  },
  {
    key: 'dialNetworkType',
    label: 'network_type',
    type: 'textarea',
    defaultValue: 'wifi',
    rows: 3,
    hint: '网络类型列表，每行一个：wifi、cellular、ethernet、other。',
  },
  {
    key: 'dialFallbackNetworkType',
    label: 'fallback_network_type',
    type: 'textarea',
    defaultValue: 'cellular',
    rows: 3,
    hint: '回退网络类型列表，每行一个。',
  },
  {
    key: 'dialFallbackDelay',
    label: 'fallback_delay',
    type: 'text',
    defaultValue: '300ms',
    hint: '回退前等待时间，默认 300ms。',
  },
  {
    key: 'dialDomainStrategy',
    label: 'domain_strategy',
    type: 'select',
    defaultValue: 'prefer_ipv4',
    options: [
      { label: 'prefer_ipv4', value: 'prefer_ipv4' },
      { label: 'prefer_ipv6', value: 'prefer_ipv6' },
      { label: 'ipv4_only', value: 'ipv4_only' },
      { label: 'ipv6_only', value: 'ipv6_only' },
    ],
    hint: '已废弃；保留为兼容项。',
  },
]

const baseFormSections: BaseFormSection[] = [
  {
    tab: 'network',
    title: '日志 Log',
    description: '对应 sing-box 的日志层设置，以及运行模式这类全局行为开关。',
    fields: [
      {
        key: 'mode',
        label: 'mode',
        type: 'select',
        defaultValue: 'rule',
        options: [
          { label: 'rule', value: 'rule' },
          { label: 'global', value: 'global' },
          { label: 'direct', value: 'direct' },
          { label: 'script', value: 'script' },
        ],
        hint: '运行模式。',
      },
      {
        key: 'logLevel',
        label: 'log-level',
        type: 'select',
        defaultValue: 'debug',
        options: [
          { label: 'silent', value: 'silent' },
          { label: 'error', value: 'error' },
          { label: 'warning', value: 'warning' },
          { label: 'info', value: 'info' },
          { label: 'debug', value: 'debug' },
        ],
      },
      {
        key: 'findProcessMode',
        label: 'find-process-mode',
        type: 'select',
        defaultValue: 'strict',
        options: [
          { label: 'always', value: 'always' },
          { label: 'strict', value: 'strict' },
          { label: 'off', value: 'off' },
        ],
        hint: '进程匹配模式。',
      },
    ],
  },
  {
    tab: 'network',
    title: '时间同步',
    description: '内建 NTP 客户端服务，用于为依赖时间的协议提供同步时间。',
    fields: [
      {
        key: 'ntpEnabled',
        label: 'ntp.enabled',
        type: 'boolean',
        defaultValue: false,
        hint: '启用 NTP 服务。',
      },
      {
        key: 'ntpServer',
        label: 'ntp.server',
        type: 'text',
        defaultValue: 'time.apple.com',
        hint: 'NTP 服务器地址。',
      },
      {
        key: 'ntpServerPort',
        label: 'ntp.server_port',
        type: 'number',
        defaultValue: '123',
        hint: 'NTP 服务器端口，默认 123。',
      },
      {
        key: 'ntpInterval',
        label: 'ntp.interval',
        type: 'text',
        defaultValue: '30m',
        hint: '时间同步间隔，默认 30 分钟。',
      },
    ],
  },
  {
    tab: 'network',
    title: '流量嗅探',
    description: '按端口探测 QUIC、TLS、HTTP 并补充分流匹配信息。',
    fields: [
      {
        key: 'snifferEnabled',
        label: 'sniffer.enable',
        type: 'boolean',
        defaultValue: true,
        hint: '启用流量嗅探。',
      },
      {
        key: 'snifferOverrideDestination',
        label: 'sniffer.override-destination',
        type: 'boolean',
        defaultValue: true,
        hint: '使用嗅探结果覆盖原始目标地址。',
      },
      {
        key: 'snifferQuicPorts',
        label: 'sniff.QUIC.ports',
        type: 'textarea',
        defaultValue: '443',
        rows: 3,
        hint: 'QUIC 探测端口列表，每行一个。',
      },
      {
        key: 'snifferTlsPorts',
        label: 'sniff.TLS.ports',
        type: 'textarea',
        defaultValue: '443\n8443',
        rows: 3,
        hint: 'TLS 探测端口列表，每行一个。',
      },
      {
        key: 'snifferHttpPorts',
        label: 'sniff.HTTP.ports',
        type: 'textarea',
        defaultValue: '80\n8080-8880',
        rows: 3,
        hint: 'HTTP 探测端口列表，每行一个，可填写端口范围。',
      },
      {
        key: 'snifferHttpOverrideDestination',
        label: 'sniff.HTTP.override-destination',
        type: 'boolean',
        defaultValue: true,
        hint: '仅对 HTTP 探测结果启用覆盖目标。',
      },
      {
        key: 'snifferForceDomain',
        label: 'sniffer.force-domain',
        type: 'textarea',
        defaultValue: '+.netflix.com\n+.nflxvideo.net\n+.amazonaws.com\n+.media.dssott.com',
        rows: 5,
        span: 'wide',
        hint: '强制嗅探域名列表，每行一个。',
      },
      {
        key: 'snifferSkipDomain',
        label: 'sniffer.skip-domain',
        type: 'textarea',
        defaultValue: 'Mijia Cloud\ndlg.io.mi.com\n+.oray.com\n+.sunlogin.net\n+.push.apple.com',
        rows: 6,
        span: 'wide',
        hint: '跳过嗅探域名列表，每行一个。',
      },
      {
        key: 'snifferSkipDstAddress',
        label: 'sniffer.skip-dst-address',
        type: 'textarea',
        defaultValue: '',
        rows: 4,
        span: 'wide',
        hint: '跳过嗅探的目标 IP 段列表，每行一个 CIDR。',
      },
      {
        key: 'snifferParsePureIp',
        label: 'sniffer.parse-pure-ip',
        type: 'boolean',
        defaultValue: true,
        hint: '允许对纯 IP 目标继续解析与探测。',
      },
    ],
  },
  {
    tab: 'dns',
    title: 'DNS 基础',
    description: 'FastProxy 的跨内核 DNS 意图模型；保存后由编译器映射到 sing-box 或 mihomo。',
    fields: [
      {
        key: 'dnsEnabled',
        label: '启用 DNS',
        type: 'boolean',
        defaultValue: true,
        hint: 'mihomo 会映射为 dns.enable；sing-box 会生成 dns 对象。',
      },
      {
        key: 'dnsMode',
        label: '解析模式',
        type: 'select',
        defaultValue: 'fake-ip',
        options: dnsModeOptions.map((value) => ({ label: value, value })),
        hint: 'mihomo 映射为 enhanced-mode；sing-box fake-ip 通过专用 DNS server 与规则表达。',
      },
      {
        key: 'dnsIpv6',
        label: '解析 IPv6',
        type: 'boolean',
        defaultValue: false,
        hint: 'mihomo 映射为 ipv6；sing-box 映射为默认解析策略或规则策略。',
      },
      {
        key: 'dnsListen',
        label: '监听地址',
        type: 'text',
        defaultValue: '0.0.0.0:7874',
        hint: 'mihomo 原生支持 dns.listen；sing-box 可由 DNS inbound 或运行时入口消费。',
      },
      {
        key: 'dnsDefaultStrategy',
        label: '默认 IP 策略',
        type: 'select',
        defaultValue: 'prefer_ipv4',
        options: [
          { label: 'prefer_ipv4', value: 'prefer_ipv4' },
          { label: 'prefer_ipv6', value: 'prefer_ipv6' },
          { label: 'ipv4_only', value: 'ipv4_only' },
          { label: 'ipv6_only', value: 'ipv6_only' },
        ],
        hint: 'sing-box 映射为 dns.strategy；mihomo 主要通过 ipv6 和服务器附加参数近似表达。',
      },
      {
        key: 'dnsUseHosts',
        label: '使用 hosts',
        type: 'boolean',
        defaultValue: false,
        hint: 'mihomo 映射为 use-hosts/use-system-hosts；sing-box 可映射 hosts/local server 或保持运行时默认。',
      },
    ],
  },
  {
    tab: 'dns',
    title: 'DNS 缓存',
    description: '跨内核缓存意图。无法等价的字段会在下方映射预览中标注为内核专属。',
    fields: [
      {
        key: 'dnsCacheEnabled',
        label: '启用缓存',
        type: 'boolean',
        defaultValue: true,
        hint: 'sing-box 通过 disable_cache 反向表达；mihomo 默认开启缓存。',
      },
      {
        key: 'dnsCacheAlgorithm',
        label: '缓存算法',
        type: 'select',
        defaultValue: 'lru',
        options: dnsCacheAlgorithmOptions.map((value) => ({ label: value, value })),
        hint: 'mihomo 支持 lru/arc；sing-box 无等价算法字段。',
      },
      {
        key: 'dnsCacheCapacity',
        label: '缓存容量',
        type: 'number',
        defaultValue: '0',
        hint: 'sing-box 映射为 cache_capacity；mihomo 无等价容量字段。',
      },
      {
        key: 'dnsOptimisticEnabled',
        label: '乐观缓存',
        type: 'boolean',
        defaultValue: false,
        hint: 'sing-box 1.14+ 支持 optimistic；mihomo 无等价字段。',
      },
      {
        key: 'dnsOptimisticTimeout',
        label: '乐观缓存窗口',
        type: 'text',
        defaultValue: '3d',
        hint: '仅在乐观缓存开启时用于 sing-box optimistic.timeout。',
      },
      {
        key: 'dnsTimeout',
        label: '查询超时',
        type: 'text',
        defaultValue: '10s',
        hint: 'sing-box 支持 dns.timeout；mihomo 无全局等价字段。',
      },
    ],
  },
  {
    tab: 'dns',
    kind: 'managed-dns-servers',
    title: 'DNS 服务器角色',
    description:
      '用角色表达 DNS 意图：启动解析、默认解析、后备解析、直连解析、节点解析和策略解析。',
    fields: [],
  },
  {
    tab: 'dns',
    kind: 'managed-dns-policies',
    title: 'DNS 分流策略',
    description: '为域名、域名后缀、geosite 或规则集指定解析服务器，编译时映射为对应内核规则。',
    fields: [],
  },
  {
    tab: 'dns',
    title: 'FakeIP',
    description:
      'FakeIP 的跨内核意图。mihomo 原生映射，sing-box 新版本通过 fakeip server/rule 表达。',
    fields: [
      {
        key: 'dnsFakeIpEnabled',
        label: '启用 FakeIP',
        type: 'boolean',
        defaultValue: true,
        hint: '当解析模式为 fake-ip 时生效。',
      },
      {
        key: 'dnsFakeIpRange',
        label: 'IPv4 地址池',
        type: 'text',
        defaultValue: '198.18.0.1/15',
      },
      {
        key: 'dnsFakeIpRange6',
        label: 'IPv6 地址池',
        type: 'text',
        defaultValue: 'fdfe:dcba:9876::1/64',
      },
      {
        key: 'dnsFakeIpFilterMode',
        label: '过滤模式',
        type: 'select',
        defaultValue: 'blacklist',
        options: [
          { label: 'blacklist', value: 'blacklist' },
          { label: 'whitelist', value: 'whitelist' },
          { label: 'rule', value: 'rule' },
        ],
        hint: 'mihomo 原生支持；sing-box 通过 DNS rules 近似表达。',
      },
      {
        key: 'dnsFakeIpFilters',
        label: '过滤规则',
        type: 'textarea',
        defaultValue: '',
        rows: 5,
        span: 'wide',
        hint: '每行一条域名通配或规则。',
      },
    ],
  },
  {
    tab: 'dns',
    title: '内核高级项',
    description: '保留确实无法抽象成共同意图的内核专属行为，避免污染主模型。',
    fields: [
      {
        key: 'dnsMihomoRespectRules',
        label: 'mihomo.respect-rules',
        type: 'boolean',
        defaultValue: true,
        hint: 'mihomo 专属：DNS 连接遵守路由规则。',
      },
      {
        key: 'dnsMihomoPreferH3',
        label: 'mihomo.prefer-h3',
        type: 'boolean',
        defaultValue: false,
        hint: 'mihomo 专属：DoH 优先使用 HTTP/3。',
      },
      {
        key: 'dnsMihomoFallbackGeoip',
        label: 'mihomo.fallback-filter.geoip',
        type: 'boolean',
        defaultValue: true,
        hint: 'mihomo 专属：启用 fallback-filter geoip 判断。',
      },
      {
        key: 'dnsMihomoFallbackGeoipCode',
        label: 'mihomo.fallback-filter.geoip-code',
        type: 'text',
        defaultValue: 'CN',
      },
      {
        key: 'dnsSingBoxReverseMapping',
        label: 'sing-box.reverse_mapping',
        type: 'boolean',
        defaultValue: false,
        hint: 'sing-box 专属：记录 DNS 响应的 IP 到域名反向映射。',
      },
      {
        key: 'dnsSingBoxClientSubnet',
        label: 'sing-box.client_subnet',
        type: 'text',
        defaultValue: '',
        hint: 'sing-box 专属：默认附加到每个查询的 edns0-subnet。',
      },
    ],
  },
  {
    tab: 'dns',
    kind: 'managed-dns-preview',
    title: '双内核映射预览',
    description: '展示同一份 DNS 意图分别会被编译成 mihomo 与 sing-box 的核心结构。',
    fields: [],
  },
  {
    tab: 'network',
    title: '网络基础',
    description: '跨内核通用的网络开关与兼容行为。',
    fields: [
      {
        key: 'unifiedDelay',
        label: 'unified-delay',
        type: 'boolean',
        defaultValue: false,
        hint: '统一延迟测试结果展示，常见于 Clash 兼容配置。',
      },
      {
        key: 'ipv6',
        label: 'ipv6',
        type: 'boolean',
        defaultValue: false,
        hint: 'IPv6 总开关。',
      },
      {
        key: 'allowLan',
        label: 'allow-lan',
        type: 'boolean',
        defaultValue: true,
        hint: '允许局域网设备连接代理服务。',
      },
      {
        key: 'etagSupport',
        label: 'etag-support',
        type: 'boolean',
        defaultValue: true,
        hint: '外部资源下载的 ETag 支持，mihomo 默认开启。',
      },
      {
        key: 'tcpConcurrent',
        label: 'tcp-concurrent',
        type: 'boolean',
        defaultValue: false,
        hint: '启用 TCP 并发连接，使用 DNS 解析出的所有 IP 尝试连接。',
      },
    ],
  },
  {
    tab: 'network',
    kind: 'field-table',
    title: '局域网与控制 API',
    description: '局域网访问、代理认证、控制 API、DoH 与外部 UI 设置。',
    fields: [
      {
        key: 'bindAddress',
        label: 'bind-address',
        type: 'text',
        defaultValue: '*',
        hint: '绑定地址；* 表示绑定所有 IP 地址。',
      },
      {
        key: 'lanAllowedIps',
        label: 'lan-allowed-ips',
        type: 'textarea',
        defaultValue: '0.0.0.0/0\n::/0',
        rows: 3,
        hint: '允许连接的 IP 段，每行一个；仅 allow-lan 为 true 时生效。',
      },
      {
        key: 'lanDisallowedIps',
        label: 'lan-disallowed-ips',
        type: 'textarea',
        defaultValue: '',
        rows: 3,
        hint: '禁止连接的 IP 段，每行一个；黑名单优先级高于白名单。',
      },
      {
        key: 'authentication',
        label: 'authentication',
        type: 'textarea',
        defaultValue: '',
        rows: 3,
        hint: 'http(s)、socks、mixed 代理认证，每行一个 user:pass。',
      },
      {
        key: 'skipAuthPrefixes',
        label: 'skip-auth-prefixes',
        type: 'textarea',
        defaultValue: '127.0.0.1/8\n::1/128',
        rows: 3,
        hint: '允许跳过认证的 IP 段，每行一个。',
      },
      {
        key: 'externalController',
        label: 'external-controller',
        type: 'text',
        defaultValue: '127.0.0.1:9090',
        hint: 'RESTful API 监听地址。',
      },
      {
        key: 'externalControllerCorsAllowOrigins',
        label: 'external-controller-cors.allow-origins',
        type: 'textarea',
        defaultValue: '*',
        rows: 3,
        hint: 'API CORS 允许来源，每行一个。',
      },
      {
        key: 'externalControllerCorsAllowPrivateNetwork',
        label: 'external-controller-cors.allow-private-network',
        type: 'boolean',
        defaultValue: true,
        hint: '允许 CORS private network 访问。',
      },
      {
        key: 'externalControllerUnix',
        label: 'external-controller-unix',
        type: 'text',
        defaultValue: '',
        hint: 'Unix socket API 监听地址；启用后需自行确保安全。',
      },
      {
        key: 'externalControllerPipe',
        label: 'external-controller-pipe',
        type: 'text',
        defaultValue: '',
        hint: 'Windows named pipe API 监听地址；启用后需自行确保安全。',
      },
      {
        key: 'externalControllerTls',
        label: 'external-controller-tls',
        type: 'text',
        defaultValue: '',
        hint: 'HTTPS API 监听地址，需要同时配置 tls。',
      },
      {
        key: 'externalDohServer',
        label: 'external-doh-server',
        type: 'text',
        defaultValue: '',
        hint: '在 RESTful API 端口上开启 DoH 服务的路径，如 /dns-query。',
      },
      {
        key: 'secret',
        label: 'secret',
        type: 'text',
        defaultValue: '',
        hint: 'API 访问密钥。',
      },
      {
        key: 'externalUi',
        label: 'external-ui',
        type: 'text',
        defaultValue: '',
        hint: '外部 UI 静态资源目录。',
      },
      {
        key: 'externalUiName',
        label: 'external-ui-name',
        type: 'text',
        defaultValue: '',
        hint: '外部 UI 更新时使用的子目录名。',
      },
      {
        key: 'externalUiUrl',
        label: 'external-ui-url',
        type: 'text',
        defaultValue: '',
        hint: '外部 UI 下载地址。',
      },
    ],
  },
  {
    tab: 'network',
    kind: 'field-table',
    title: '连接行为与资源缓存',
    description: 'TCP keep alive、连接并发、策略缓存、GEO 数据与资源下载请求头。',
    fields: [
      {
        key: 'keepAliveInterval',
        label: 'keep-alive-interval / tcp_keep_alive_interval',
        type: 'number',
        defaultValue: '15',
        hint: 'TCP keep alive 包间隔；对应 mihomo 秒数与 sing-box tcp_keep_alive_interval。',
      },
      {
        key: 'keepAliveIdle',
        label: 'keep-alive-idle / tcp_keep_alive',
        type: 'number',
        defaultValue: '15',
        hint: 'TCP keep alive 空闲时间；对应 mihomo 秒数与 sing-box tcp_keep_alive。',
      },
      {
        key: 'disableKeepAlive',
        label: 'disable-keep-alive / disable_tcp_keep_alive',
        type: 'boolean',
        defaultValue: false,
        hint: '禁用 TCP keep alive；Android 强制为 true。',
      },
      {
        key: 'connectTimeout',
        label: 'connect_timeout',
        type: 'text',
        defaultValue: '',
        hint: '连接超时，使用 Go Duration 格式，如 300ms、5s、2m。',
      },
      {
        key: 'tcpFastOpen',
        label: 'tcp_fast_open',
        type: 'boolean',
        defaultValue: false,
        hint: '启用 TCP Fast Open。',
      },
      {
        key: 'tcpMultiPath',
        label: 'tcp_multi_path',
        type: 'boolean',
        defaultValue: false,
        hint: '启用 TCP Multi Path。',
      },
      {
        key: 'udpFragment',
        label: 'udp_fragment',
        type: 'boolean',
        defaultValue: false,
        hint: '启用 UDP 分段。',
      },
      {
        key: 'profileStoreSelected',
        label: 'profile.store-selected',
        type: 'boolean',
        defaultValue: true,
        hint: '储存 API 对策略组的选择。',
      },
      {
        key: 'profileStoreFakeIp',
        label: 'profile.store-fake-ip',
        type: 'boolean',
        defaultValue: true,
        hint: '储存 fake-ip 映射表。',
      },
      {
        key: 'geodataMode',
        label: 'geodata-mode',
        type: 'boolean',
        defaultValue: false,
        hint: 'GEOIP 数据模式；true 使用 dat，false 使用 mmdb。',
      },
      {
        key: 'geodataLoader',
        label: 'geodata-loader',
        type: 'select',
        defaultValue: 'memconservative',
        options: [
          { label: 'standard', value: 'standard' },
          { label: 'memconservative', value: 'memconservative' },
        ],
        hint: 'GEO 文件加载模式。',
      },
      {
        key: 'geoAutoUpdate',
        label: 'geo-auto-update',
        type: 'boolean',
        defaultValue: false,
        hint: '自动更新 GEO 数据。',
      },
      {
        key: 'geoUpdateInterval',
        label: 'geo-update-interval',
        type: 'number',
        defaultValue: '24',
        hint: 'GEO 更新间隔，单位小时。',
      },
      {
        key: 'geoxUrlGeoip',
        label: 'geox-url.geoip',
        type: 'text',
        defaultValue: '',
        hint: '自定义 geoip.dat 下载地址。',
      },
      {
        key: 'geoxUrlGeosite',
        label: 'geox-url.geosite',
        type: 'text',
        defaultValue: '',
        hint: '自定义 geosite.dat 下载地址。',
      },
      {
        key: 'geoxUrlMmdb',
        label: 'geox-url.mmdb',
        type: 'text',
        defaultValue: '',
        hint: '自定义 Country MMDB 下载地址。',
      },
      {
        key: 'geoxUrlAsn',
        label: 'geox-url.asn',
        type: 'text',
        defaultValue: '',
        hint: '自定义 ASN MMDB 下载地址。',
      },
      {
        key: 'globalUa',
        label: 'global-ua',
        type: 'text',
        defaultValue: 'clash.meta',
        hint: '外部资源下载使用的全局 User-Agent。',
      },
    ],
  },
  {
    tab: 'network',
    kind: 'field-table',
    title: '接口、拨号与路由默认项',
    description: '网络接口绑定、路由标记、拨号参数、默认解析器与 route 默认网络行为。',
    fields: [
      {
        key: 'routeAutoDetectInterface',
        label: 'route.auto_detect_interface',
        type: 'boolean',
        defaultValue: false,
        hint: '自动将出站连接绑定到默认网卡，避免 tun 下出现路由环路。',
      },
      {
        key: 'routeOverrideAndroidVpn',
        label: 'route.override_android_vpn',
        type: 'boolean',
        defaultValue: false,
        hint: '启用 auto_detect_interface 时允许 Android VPN 作为上游网卡。',
      },
      {
        key: 'networkInterface',
        label: 'interface-name / bind_interface / route.default_interface',
        type: 'text',
        defaultValue: '',
        hint: '统一管理出站接口绑定；对应 mihomo interface-name、sing-box bind_interface/default_interface。',
      },
      {
        key: 'networkRoutingMark',
        label: 'routing-mark / routing_mark / route.default_mark',
        type: 'number',
        defaultValue: '0',
        hint: 'Linux 下为出站连接设置流量标记。',
      },
      {
        key: 'networkInet4BindAddress',
        label: 'inet4_bind_address',
        type: 'text',
        defaultValue: '',
        hint: '要绑定的 IPv4 源地址。',
      },
      {
        key: 'networkInet6BindAddress',
        label: 'inet6_bind_address',
        type: 'text',
        defaultValue: '',
        hint: '要绑定的 IPv6 源地址。',
      },
      {
        key: 'networkBindAddressNoPort',
        label: 'bind_address_no_port',
        type: 'boolean',
        defaultValue: false,
        hint: '仅 Linux 支持；绑定源地址时不保留端口。',
      },
      {
        key: 'networkReuseAddr',
        label: 'reuse_addr',
        type: 'boolean',
        defaultValue: false,
        hint: '重用监听地址。',
      },
      {
        key: 'networkNetns',
        label: 'netns',
        type: 'text',
        defaultValue: '',
        hint: '仅 Linux 支持；网络命名空间名称或路径。',
      },
      {
        key: 'routeFindProcess',
        label: 'route.find_process',
        type: 'boolean',
        defaultValue: false,
        hint: '启用进程搜索以支持日志和进程相关规则。',
      },
      {
        key: 'routeFindNeighbor',
        label: 'route.find_neighbor',
        type: 'boolean',
        defaultValue: false,
        hint: '启用邻居解析以支持 source_mac_address 或 source_hostname 相关信息。',
      },
      {
        key: 'routeDhcpLeaseFiles',
        label: 'route.dhcp_lease_files',
        type: 'textarea',
        defaultValue: '',
        rows: 3,
        hint: '自定义 DHCP 租约文件路径，每行一个；为空时自动检测常见位置。',
      },
      {
        key: 'routeDefaultHttpClient',
        label: 'route.default_http_client',
        type: 'text',
        defaultValue: '',
        hint: '远程规则集使用的默认 HTTP 客户端标签。',
      },
      {
        key: 'networkDomainResolver',
        label: 'domain_resolver / route.default_domain_resolver',
        type: 'textarea',
        defaultValue: '',
        rows: 3,
        hint: '统一管理域名解析器；可填服务器标签或解析器对象。',
      },
      {
        key: 'networkStrategy',
        label: 'network_strategy / route.default_network_strategy',
        type: 'select',
        defaultValue: 'default',
        options: [
          { label: 'default', value: 'default' },
          { label: 'hybrid', value: 'hybrid' },
          { label: 'fallback', value: 'fallback' },
        ],
        hint: '默认网络接口选择策略。',
      },
      {
        key: 'networkType',
        label: 'network_type / route.default_network_type',
        type: 'textarea',
        defaultValue: 'wifi',
        rows: 3,
        hint: '默认网络类型列表，每行一个：wifi、cellular、ethernet、other。',
      },
      {
        key: 'fallbackNetworkType',
        label: 'fallback_network_type / route.default_fallback_network_type',
        type: 'textarea',
        defaultValue: 'cellular',
        rows: 3,
        hint: '默认回退网络类型列表，每行一个。',
      },
      {
        key: 'fallbackDelay',
        label: 'fallback_delay / route.default_fallback_delay',
        type: 'text',
        defaultValue: '300ms',
        hint: '默认回退前等待时间。',
      },
    ],
  },
  {
    tab: 'network',
    kind: 'field-table',
    title: 'HTTP 客户端与端点',
    description: '远程规则集、资源下载等 HTTP 请求客户端，以及 WireGuard/Tailscale 等网络端点。',
    fields: [
      {
        key: 'httpClients',
        label: 'http_clients',
        type: 'textarea',
        defaultValue:
          '[\n  {\n    "tag": "default",\n    "dialer": {},\n    "tls": {},\n    "headers": {}\n  }\n]',
        rows: 8,
        hint: 'HTTP 客户端数组 JSON；可配置 dialer、tls、headers、proxy 等字段。',
      },
      {
        key: 'endpoints',
        label: 'endpoints',
        type: 'textarea',
        defaultValue:
          '[\n  {\n    "type": "wireguard",\n    "tag": "wg-endpoint",\n    "address": [],\n    "peers": []\n  }\n]',
        rows: 8,
        hint: '端点数组 JSON；后续可再拆成 WireGuard/Tailscale 专用编辑器。',
      },
    ],
  },
  {
    tab: 'network',
    title: '证书与 TLS',
    description: '受信任 CA 证书、API HTTPS 证书与 ECH 密钥。',
    fields: [
      {
        key: 'certificateStore',
        label: 'certificate.store',
        type: 'select',
        defaultValue: 'system',
        options: [
          { label: 'system', value: 'system' },
          { label: 'mozilla', value: 'mozilla' },
          { label: 'chrome', value: 'chrome' },
          { label: 'none', value: 'none' },
        ],
        hint: '默认受信任 CA 证书列表来源。',
      },
      {
        key: 'certificatePem',
        label: 'certificate.certificate',
        type: 'textarea',
        defaultValue: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        rows: 6,
        span: 'wide',
        hint: '要信任的证书内容，PEM 格式，可填写多段证书。',
      },
      {
        key: 'certificatePath',
        label: 'certificate.certificate_path',
        type: 'textarea',
        defaultValue: '/etc/ssl/private/custom-ca.pem',
        rows: 4,
        hint: '要信任的证书文件路径，PEM 格式，文件变化时会自动重载。',
      },
      {
        key: 'certificateDirectoryPath',
        label: 'certificate.certificate_directory_path',
        type: 'textarea',
        defaultValue: '/etc/ssl/private/custom-cas',
        rows: 4,
        hint: '扫描并信任目录中的 PEM 证书，文件变化时会自动重载。',
      },
      {
        key: 'tlsCertificate',
        label: 'tls.certificate',
        type: 'textarea',
        defaultValue: '',
        rows: 3,
        hint: 'API HTTPS 证书 PEM 内容或证书路径。',
      },
      {
        key: 'tlsPrivateKey',
        label: 'tls.private-key',
        type: 'textarea',
        defaultValue: '',
        rows: 3,
        hint: 'API HTTPS 私钥 PEM 内容或私钥路径。',
      },
      {
        key: 'tlsEchKey',
        label: 'tls.ech-key',
        type: 'textarea',
        defaultValue: '',
        rows: 4,
        hint: 'ECH 密钥；填写后启用 ECH。',
      },
    ],
  },
]

const baseConfigForm = reactive<Record<string, string | boolean>>({})
const ntpDialForm = reactive<Record<string, string | boolean>>({})

const allConfigFields = [...baseFormSections.flatMap((section) => section.fields), ...ntpDialFields]
const allConfigFieldByKey = new Map(allConfigFields.map((field) => [field.key, field]))

const emptyConfigFieldValue = (field: BaseFormField) => (field.type === 'boolean' ? false : '')
const defaultConfigFieldValue = (field: BaseFormField) => field.defaultValue

const clearBaseConfigForm = (useDefaults = false) => {
  for (const field of allConfigFields) {
    baseConfigForm[field.key] = useDefaults
      ? defaultConfigFieldValue(field)
      : emptyConfigFieldValue(field)
    if (field.key in ntpDialForm) {
      ntpDialForm[field.key] = useDefaults
        ? defaultConfigFieldValue(field)
        : emptyConfigFieldValue(field)
    }
  }
}

clearBaseConfigForm(true)
for (const field of ntpDialFields) {
  ntpDialForm[field.key] = defaultConfigFieldValue(field)
}

const dnsServerFromGlobal = (server: FastProxyGlobalDNSServer, index: number): DnsServerRow => ({
  id: server.id || `dns-server-${index + 1}`,
  name: server.name || '',
  role: dnsServerRoleOptions.some((option) => option.value === server.role)
    ? (server.role as DnsServerRole)
    : 'default',
  protocol: dnsServerProtocolOptions.includes(server.protocol as DnsServerProtocol)
    ? (server.protocol as DnsServerProtocol)
    : 'udp',
  address: server.address || '',
  port: server.port || '',
  path: server.path || '',
  detour: server.detour || '',
  clientSubnet: server.clientSubnet || '',
  skipCertVerify: Boolean(server.skipCertVerify),
})

const dnsRuleFromGlobal = (rule: FastProxyGlobalDNSRule, index: number): DnsRuleRow => ({
  id: rule.id || `dns-rule-${index + 1}`,
  matcher: dnsPolicyMatcherOptions.some((option) => option.value === rule.matcher)
    ? (rule.matcher as DnsPolicyMatcher)
    : 'domain_suffix',
  value: rule.value || '',
  serverName: rule.serverName || '',
  strategy: rule.strategy || '',
  clientSubnet: rule.clientSubnet || '',
})

const dnsServerToGlobal = (server: DnsServerRow): FastProxyGlobalDNSServer => ({
  id: server.id,
  name: server.name,
  role: server.role,
  protocol: server.protocol,
  address: server.address,
  port: server.port,
  path: server.path,
  detour: server.detour,
  clientSubnet: server.clientSubnet,
  skipCertVerify: server.skipCertVerify,
})

const dnsRuleToGlobal = (rule: DnsRuleRow): FastProxyGlobalDNSRule => ({
  id: rule.id,
  matcher: rule.matcher,
  value: rule.value,
  serverName: rule.serverName,
  strategy: rule.strategy,
  clientSubnet: rule.clientSubnet,
})

const applyGlobalConfig = (config?: FastProxyGlobalConfig | null) => {
  const fields = config?.fields || {}
  clearBaseConfigForm()
  for (const [key, value] of Object.entries(fields)) {
    const field = allConfigFieldByKey.get(key)
    if (!field) {
      continue
    }
    baseConfigForm[key] = field.type === 'boolean' ? Boolean(value) : String(value ?? '')
    if (key in ntpDialForm) {
      ntpDialForm[key] = baseConfigForm[key]
    }
  }

  dnsServers.value = Array.isArray(config?.dnsServers)
    ? config.dnsServers.map(dnsServerFromGlobal)
    : []
  dnsRules.value = Array.isArray(config?.dnsRules) ? config.dnsRules.map(dnsRuleFromGlobal) : []
  inboundCards.value = Array.isArray(config?.inbounds)
    ? config.inbounds.map(managedInboundToCard)
    : []
}

const collectGlobalConfig = (): FastProxyGlobalConfig => ({
  fields: Object.fromEntries(
    allConfigFields
      .map((field) => [field, baseConfigForm[field.key] ?? emptyConfigFieldValue(field)] as const)
      .filter(([field, value]) =>
        field.type === 'boolean' ? Boolean(value) : String(value || '').trim(),
      )
      .map(([field, value]) => [field.key, value]),
  ),
  dnsServers: dnsServers.value.map(dnsServerToGlobal),
  dnsRules: dnsRules.value.map(dnsRuleToGlobal),
  inbounds: inboundCards.value.map(inboundCardToManaged),
})

const repositoryOutboundNodes = computed(() => {
  return (repositoryWorkspace.value?.nodeSets || []).flatMap((nodeSet) =>
    (nodeSet.nodes || []).map((node, index) => ({
      node,
      nodeSetName: nodeSet.name || nodeSet.id || '节点集',
      index,
    })),
  )
})
const manualNodeSetName = '手动添加'
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

const nodeValue = (node: Record<string, unknown>, key: string) =>
  node[key] ?? asRecord(node.raw)[key]
const nodeStringValue = (node: Record<string, unknown>, key: string) => {
  const value = nodeValue(node, key)
  return typeof value === 'string' ? value : ''
}
const nodeNumberValue = (node: Record<string, unknown>, key: string) => {
  const value = nodeValue(node, key)
  return typeof value === 'number' ? value : Number(value) || 0
}
const appendQueryParam = (params: URLSearchParams, key: string, value: unknown) => {
  if (value === undefined || value === null || value === '') return
  params.set(key, String(value))
}
const base64UrlEncode = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}
const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
const tagFromUrl = (url: URL, fallback: string) => decodeURIComponent(url.hash.slice(1)) || fallback
const parsePort = (port: string) => Number(port) || 0
const createManualNodeId = (type: string, server: string, port: number, tag: string) => {
  const source = `${type}-${server}-${port}-${tag}`
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }
  return `manual_${hash.toString(16)}`
}
const shareTransportFromParams = (
  params: URLSearchParams,
): FastProxyNormalizedNode['transport'] => {
  const network = params.get('type') || params.get('net') || 'tcp'
  const path = params.get('path') || ''
  const host = params.get('host') || ''
  if (network === 'ws') {
    return {
      type: 'ws',
      path,
      headers: host ? { Host: host } : undefined,
    }
  }
  if (network === 'grpc') {
    return {
      type: 'grpc',
      service_name: params.get('serviceName') || params.get('service_name') || path,
    }
  }
  if (network === 'http' || network === 'h2') {
    return {
      type: 'http',
      path,
      host: host ? [host] : undefined,
    }
  }
  if (network === 'quic') {
    return { type: 'quic' }
  }
  return undefined
}
const mihomoTransportOptionsFromParams = (params: URLSearchParams): Record<string, unknown> => {
  const network = params.get('type') || params.get('net') || 'tcp'
  const path = params.get('path') || ''
  const host = params.get('host') || ''
  if (network === 'ws') {
    return {
      'ws-opts': {
        path,
        headers: host ? { Host: host } : undefined,
      },
    }
  }
  if (network === 'grpc') {
    return {
      'grpc-opts': {
        'grpc-service-name': params.get('serviceName') || params.get('service_name') || path,
      },
    }
  }
  if (network === 'http' || network === 'h2') {
    return {
      'h2-opts': {
        path,
        host: host ? [host] : undefined,
      },
    }
  }
  return {}
}
const parseTrojanShareUri = (url: URL): FastProxyNormalizedNode => {
  const tag = tagFromUrl(url, url.hostname)
  const network = url.searchParams.get('type') || 'tcp'
  const sni = url.searchParams.get('sni') || ''
  const fingerprint = url.searchParams.get('fp') || ''
  const insecure = url.searchParams.get('allowInsecure') === '1'
  const port = parsePort(url.port)
  return {
    id: createManualNodeId('trojan', url.hostname, port, tag),
    tag,
    type: 'trojan',
    server: url.hostname,
    server_port: port,
    password: decodeURIComponent(url.username),
    source: manualNodeSetName,
    network,
    transport: shareTransportFromParams(url.searchParams),
    tls: {
      enabled: true,
      insecure,
      server_name: sni,
      utls: {
        enabled: Boolean(fingerprint),
        fingerprint: fingerprint || undefined,
      },
    },
    raw: {
      name: tag,
      type: 'trojan',
      server: url.hostname,
      port,
      password: decodeURIComponent(url.username),
      tls: true,
      sni,
      servername: sni,
      'client-fingerprint': fingerprint,
      'skip-cert-verify': insecure,
      network,
      ...mihomoTransportOptionsFromParams(url.searchParams),
    },
  }
}
const parseVlessShareUri = (url: URL): FastProxyNormalizedNode => {
  const tag = tagFromUrl(url, url.hostname)
  const security = url.searchParams.get('security') || ''
  const sni = url.searchParams.get('sni') || ''
  const flow = url.searchParams.get('flow') || ''
  const encryption = url.searchParams.get('encryption') || 'none'
  const network = url.searchParams.get('type') || 'tcp'
  const publicKey = url.searchParams.get('pbk') || ''
  const shortId = url.searchParams.get('sid') || ''
  const port = parsePort(url.port)
  return {
    id: createManualNodeId('vless', url.hostname, port, tag),
    tag,
    type: 'vless',
    server: url.hostname,
    server_port: port,
    uuid: decodeURIComponent(url.username),
    source: manualNodeSetName,
    flow,
    network,
    transport: shareTransportFromParams(url.searchParams),
    tls: {
      enabled: security === 'tls' || security === 'reality',
      server_name: sni,
      utls: {
        enabled: Boolean(url.searchParams.get('fp')),
        fingerprint: url.searchParams.get('fp') || undefined,
      },
      reality:
        security === 'reality'
          ? {
              enabled: true,
              public_key: publicKey,
              short_id: shortId,
            }
          : undefined,
    },
    raw: {
      name: tag,
      type: 'vless',
      server: url.hostname,
      port,
      uuid: decodeURIComponent(url.username),
      flow,
      network,
      tls: security === 'tls' || security === 'reality',
      servername: sni,
      'client-fingerprint': url.searchParams.get('fp') || '',
      'reality-opts':
        security === 'reality'
          ? {
              'public-key': publicKey,
              'short-id': shortId,
            }
          : undefined,
      encryption,
      ...mihomoTransportOptionsFromParams(url.searchParams),
    },
  }
}
const parseShadowsocksShareUri = (url: URL): FastProxyNormalizedNode => {
  const tag = tagFromUrl(url, url.hostname)
  const encodedUserInfo = url.username.includes(':')
    ? decodeURIComponent(url.username)
    : base64UrlDecode(url.username)
  const [method = '', password = ''] = encodedUserInfo.split(':')
  const port = parsePort(url.port)
  return {
    id: createManualNodeId('shadowsocks', url.hostname, port, tag),
    tag,
    type: 'shadowsocks',
    server: url.hostname,
    server_port: port,
    method,
    password,
    source: manualNodeSetName,
    raw: {
      name: tag,
      type: 'ss',
      server: url.hostname,
      port,
      method,
      password,
    },
  }
}
const parseVmessShareUri = (link: string): FastProxyNormalizedNode => {
  const payload = asRecord(JSON.parse(base64UrlDecode(link.replace(/^vmess:\/\//, ''))))
  const tag = String(payload.ps || payload.name || payload.add || 'vmess')
  const server = String(payload.add || '')
  const port = Number(payload.port) || 0
  const transportParams = new URLSearchParams()
  transportParams.set('type', String(payload.net || 'tcp'))
  transportParams.set('path', String(payload.path || ''))
  transportParams.set('host', String(payload.host || ''))
  return {
    id: createManualNodeId('vmess', server, port, tag),
    tag,
    type: 'vmess',
    server,
    server_port: port,
    uuid: String(payload.id || ''),
    security: String(payload.scy || payload.security || 'auto'),
    alter_id: Number(payload.aid) || 0,
    source: manualNodeSetName,
    network: String(payload.net || 'tcp'),
    transport: shareTransportFromParams(transportParams),
    tls: {
      enabled: payload.tls === 'tls',
      server_name: String(payload.sni || ''),
    },
    raw: {
      name: tag,
      type: 'vmess',
      server,
      port,
      uuid: String(payload.id || ''),
      alterId: Number(payload.aid) || 0,
      cipher: String(payload.scy || payload.security || 'auto'),
      network: String(payload.net || 'tcp'),
      tls: payload.tls === 'tls',
      servername: String(payload.sni || payload.host || ''),
      'skip-cert-verify': Boolean(payload.allowInsecure),
      'ws-opts':
        payload.net === 'ws'
          ? {
              path: String(payload.path || ''),
              headers: payload.host ? { Host: String(payload.host) } : undefined,
            }
          : undefined,
      ...mihomoTransportOptionsFromParams(transportParams),
    },
  }
}
const parseShareUriToNode = (link: string): FastProxyNormalizedNode => {
  const trimmed = link.trim()
  if (!trimmed) throw new Error('请输入节点链接')
  if (trimmed.startsWith('vmess://')) return parseVmessShareUri(trimmed)

  const url = new URL(trimmed)
  if (url.protocol === 'trojan:') return parseTrojanShareUri(url)
  if (url.protocol === 'vless:') return parseVlessShareUri(url)
  if (url.protocol === 'ss:') return parseShadowsocksShareUri(url)
  throw new Error('暂不支持这个节点协议')
}
const validateManualNode = (node: FastProxyNormalizedNode) => {
  if (!node.tag || !node.type || !node.server || !node.server_port) {
    throw new Error('节点链接缺少名称、协议、地址或端口')
  }
  if ((node.type === 'vless' || node.type === 'vmess') && !node.uuid) {
    throw new Error('节点链接缺少 UUID')
  }
  if ((node.type === 'trojan' || node.type === 'shadowsocks') && !node.password) {
    throw new Error('节点链接缺少密码')
  }
}
const withHashTag = (uri: string, tag: string) => `${uri}#${encodeURIComponent(tag)}`
const createTrojanShareUri = (node: Record<string, unknown>, tag: string) => {
  const password = nodeStringValue(node, 'password')
  const server = nodeStringValue(node, 'server')
  const port = nodeNumberValue(node, 'server_port') || nodeNumberValue(node, 'port')
  if (!password || !server || !port) return ''

  const raw = asRecord(node.raw)
  const tls = asRecord(node.tls)
  const params = new URLSearchParams()
  appendQueryParam(params, 'security', tls.enabled === false ? undefined : 'tls')
  appendQueryParam(params, 'sni', tls.server_name || raw.sni)
  appendQueryParam(params, 'allowInsecure', tls.insecure || raw['skip-cert-verify'] ? 1 : undefined)
  appendQueryParam(params, 'type', nodeStringValue(node, 'network') || raw.network || 'tcp')
  const query = params.toString()
  return withHashTag(
    `trojan://${encodeURIComponent(password)}@${server}:${port}${query ? `?${query}` : ''}`,
    tag,
  )
}
const createVlessShareUri = (node: Record<string, unknown>, tag: string) => {
  const uuid = nodeStringValue(node, 'uuid') || nodeStringValue(node, 'password')
  const server = nodeStringValue(node, 'server')
  const port = nodeNumberValue(node, 'server_port') || nodeNumberValue(node, 'port')
  if (!uuid || !server || !port) return ''

  const raw = asRecord(node.raw)
  const tls = asRecord(node.tls)
  const reality = asRecord(tls.reality)
  const params = new URLSearchParams()
  appendQueryParam(params, 'encryption', raw.encryption || 'none')
  appendQueryParam(params, 'flow', nodeValue(node, 'flow'))
  appendQueryParam(params, 'security', raw.security || (tls.enabled ? 'tls' : undefined))
  appendQueryParam(params, 'sni', tls.server_name || raw.sni)
  appendQueryParam(params, 'fp', raw.fp || raw['client-fingerprint'])
  appendQueryParam(params, 'pbk', reality.public_key || raw.pbk || raw['reality-opts.public-key'])
  appendQueryParam(params, 'sid', reality.short_id || raw.sid || raw['reality-opts.short-id'])
  appendQueryParam(params, 'spx', reality.spider_x || raw.spx)
  appendQueryParam(params, 'type', nodeStringValue(node, 'network') || raw.network || 'tcp')
  return withHashTag(`vless://${uuid}@${server}:${port}?${params.toString()}`, tag)
}
const createShadowsocksShareUri = (node: Record<string, unknown>, tag: string) => {
  const method = nodeStringValue(node, 'method')
  const password = nodeStringValue(node, 'password')
  const server = nodeStringValue(node, 'server')
  const port = nodeNumberValue(node, 'server_port') || nodeNumberValue(node, 'port')
  if (!method || !password || !server || !port) return ''

  return withHashTag(`ss://${base64UrlEncode(`${method}:${password}@${server}:${port}`)}`, tag)
}
const createVmessShareUri = (node: Record<string, unknown>, tag: string) => {
  const uuid = nodeStringValue(node, 'uuid')
  const server = nodeStringValue(node, 'server')
  const port = nodeNumberValue(node, 'server_port') || nodeNumberValue(node, 'port')
  if (!uuid || !server || !port) return ''

  const raw = asRecord(node.raw)
  const tls = asRecord(node.tls)
  return `vmess://${base64UrlEncode(
    JSON.stringify({
      v: '2',
      ps: tag,
      add: server,
      port: String(port),
      id: uuid,
      aid: String(nodeValue(node, 'alter_id') ?? raw.alterId ?? 0),
      net: nodeStringValue(node, 'network') || raw.network || 'tcp',
      type: raw.type || 'none',
      host: raw.host || asRecord(node.headers).Host || '',
      path: nodeStringValue(node, 'path') || raw.path || '',
      tls: tls.enabled ? 'tls' : '',
      sni: tls.server_name || raw.sni || '',
    }),
  )}`
}
const createNodeShareUri = (node: Record<string, unknown>) => {
  const type = nodeStringValue(node, 'type').toLowerCase()
  const tag = nodeStringValue(node, 'tag') || nodeStringValue(node, 'name') || type
  if (type === 'trojan') return createTrojanShareUri(node, tag)
  if (type === 'vless') return createVlessShareUri(node, tag)
  if (type === 'ss' || type === 'shadowsocks') return createShadowsocksShareUri(node, tag)
  if (type === 'vmess') return createVmessShareUri(node, tag)
  return ''
}
const filteredInboundCards = computed(() => {
  const keyword = inboundSearch.value.trim().toLowerCase()
  if (!keyword) {
    return inboundCards.value
  }
  return inboundCards.value.filter((card) => {
    const tag = String(card.values.tag || '').toLowerCase()
    const port = String(card.values.listen_port || '').toLowerCase()
    return tag.includes(keyword) || card.type.includes(keyword) || port.includes(keyword)
  })
})
const outboundTableRows = computed<OutboundTableRow[]>(() => {
  return repositoryOutboundNodes.value.map(({ node, nodeSetName, index }) => {
    const normalizedNode = node as FastProxyNormalizedNode
    const type = normalizedNode.type || '-'
    const tag = normalizedNode.tag || normalizedNode.id || `node-${index + 1}`
    const server = typeof normalizedNode.server === 'string' ? normalizedNode.server : ''
    const port =
      typeof normalizedNode.server_port === 'number' ? String(normalizedNode.server_port) : ''
    return {
      id: `repository-${nodeSetName}-${tag}-${index}`,
      source: 'repository',
      sourceLabel: nodeSetName,
      type,
      tag,
      address: server && port ? `${server}:${port}` : server || '-',
      shareUri: createNodeShareUri(normalizedNode),
      editable: nodeSetName === manualNodeSetName,
      node: normalizedNode,
    }
  })
})

const copyTextToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showNotification({ content: '复制成功', type: 'alert-success', timeout: 2000 })
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textArea)
    showNotification({
      content: copied ? '复制成功' : '复制失败',
      type: copied ? 'alert-success' : 'alert-error',
      timeout: 2000,
    })
  }
}
const copyOutboundShareUri = async (row: OutboundTableRow) => {
  if (!row.shareUri) return
  await copyTextToClipboard(row.shareUri)
}
const openOutboundQrDialog = async (row: OutboundTableRow) => {
  if (!row.shareUri) return
  selectedOutboundRow.value = row
  outboundQrCodeDataUrl.value = ''
  outboundQrDialogOpen.value = true
  outboundQrCodeDataUrl.value = await QRCode.toDataURL(row.shareUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  })
}
const cloneNode = (node: FastProxyNormalizedNode): FastProxyNormalizedNode =>
  JSON.parse(JSON.stringify(node))

const openManualNodeDialog = () => {
  manualNodeError.value = ''
  manualNodeLink.value = ''
  manualNodeDialogOpen.value = true
}
const openNodeEditDialog = (row: OutboundTableRow) => {
  if (!row.node) return
  const node = cloneNode(row.node)
  editNodeDraft.value = node
  editingNodeOriginalTag.value = node.tag
  editingNodeWasManual.value = row.editable
  editNodeRawJson.value = JSON.stringify(node.raw || {}, null, 2)
  editNodeError.value = ''
  nodeEditDialogOpen.value = true
}
const submitManualNodeLink = async () => {
  if (manualNodeSubmitting.value) return
  manualNodeError.value = ''
  manualNodeSubmitting.value = true
  try {
    const node = parseShareUriToNode(manualNodeLink.value)
    validateManualNode(node)
    await createManualNodeAPI({
      name: manualNodeSetName,
      node,
    })
    await loadFastProxyWorkspace()
    manualNodeDialogOpen.value = false
    showNotification({ content: '节点已添加', type: 'alert-success', timeout: 2000 })
  } catch (error) {
    manualNodeError.value = error instanceof Error ? error.message : '节点添加失败'
    showNotification({ content: manualNodeError.value, type: 'alert-error', timeout: 3000 })
  } finally {
    manualNodeSubmitting.value = false
  }
}
const ensureEditNodeDraft = () => {
  if (!editNodeDraft.value) {
    throw new Error('没有可编辑的节点')
  }
  return editNodeDraft.value
}
const ensureEditNodeTls = () => {
  const node = ensureEditNodeDraft()
  node.tls ||= {}
  return node.tls
}
const ensureEditNodeReality = () => {
  const tls = ensureEditNodeTls()
  tls.reality ||= {}
  return tls.reality
}
const setEditNodeTextField = (
  key: keyof Pick<
    FastProxyNormalizedNode,
    'tag' | 'type' | 'server' | 'uuid' | 'password' | 'method' | 'network' | 'flow'
  >,
  value: string,
) => {
  const node = ensureEditNodeDraft()
  node[key] = value
}
const setEditNodeNumberField = (key: 'server_port', value: string) => {
  const node = ensureEditNodeDraft()
  node[key] = Number(value) || 0
}
const setEditNodeTlsTextField = (key: 'server_name', value: string) => {
  ensureEditNodeTls()[key] = value
}
const setEditNodeTlsBooleanField = (key: 'enabled' | 'insecure', value: boolean) => {
  ensureEditNodeTls()[key] = value
}
const setEditNodeRealityTextField = (key: 'public_key' | 'short_id', value: string) => {
  ensureEditNodeReality()[key] = value
}
const submitNodeEditForm = async () => {
  if (editNodeSubmitting.value) return
  editNodeError.value = ''
  editNodeSubmitting.value = true
  try {
    const node = cloneNode(ensureEditNodeDraft())
    node.source = manualNodeSetName
    node.raw = editNodeRawJson.value.trim()
      ? (JSON.parse(editNodeRawJson.value) as Record<string, unknown>)
      : {}
    validateManualNode(node)
    await createManualNodeAPI({
      name: manualNodeSetName,
      node,
    })
    if (
      editingNodeWasManual.value &&
      editingNodeOriginalTag.value &&
      editingNodeOriginalTag.value !== node.tag
    ) {
      await deleteManualNodeAPI({
        name: manualNodeSetName,
        tag: editingNodeOriginalTag.value,
      })
    }
    await loadFastProxyWorkspace()
    nodeEditDialogOpen.value = false
    editNodeDraft.value = null
    showNotification({ content: '节点已更新', type: 'alert-success', timeout: 2000 })
  } catch (error) {
    editNodeError.value = error instanceof Error ? error.message : '节点更新失败'
    showNotification({ content: editNodeError.value, type: 'alert-error', timeout: 3000 })
  } finally {
    editNodeSubmitting.value = false
  }
}
const deleteOutboundNode = async (row: OutboundTableRow) => {
  if (!row.editable) return
  try {
    await deleteManualNodeAPI({
      name: manualNodeSetName,
      tag: row.tag,
    })
    await loadFastProxyWorkspace()
    showNotification({ content: '节点已删除', type: 'alert-success', timeout: 2000 })
  } catch (error) {
    showNotification({
      content: error instanceof Error ? error.message : '节点删除失败',
      type: 'alert-error',
      timeout: 3000,
    })
  }
}

const compactObject = <T extends Record<string, unknown>>(value: T) => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === '' || entry === undefined || entry === null) return false
      if (Array.isArray(entry) && !entry.length) return false
      return true
    }),
  )
}

const textLines = (value: string | boolean | undefined) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

const firstDnsServerNameByRole = (role: DnsServerRole) =>
  dnsServers.value.find((server) => server.role === role && server.name.trim())?.name.trim() || ''

const dnsServersByRole = (role: DnsServerRole) =>
  dnsServers.value.filter((server) => server.role === role && server.address.trim())

const normalizeDnsServerName = (server: DnsServerRow, index: number) =>
  server.name.trim() || `${server.role}-${index + 1}`

const formatMihomoDnsServer = (server: DnsServerRow) => {
  const address = server.address.trim()
  if (!address) return ''
  if (server.protocol === 'system') return 'system'

  const port = server.port.trim()
  const path = server.path.trim()
  let endpoint = address

  if (server.protocol === 'https' || server.protocol === 'h3') {
    const queryPath = path || '/dns-query'
    endpoint = `https://${address}${port ? `:${port}` : ''}${queryPath}`
  } else if (server.protocol === 'tls') {
    endpoint = `tls://${address}${port ? `:${port}` : ''}`
  } else if (server.protocol === 'quic') {
    endpoint = `quic://${address}${port ? `:${port}` : ''}`
  } else if (server.protocol === 'tcp') {
    endpoint = `tcp://${address}${port ? `:${port}` : ''}`
  } else {
    endpoint = port && port !== '53' ? `${address}:${port}` : address
  }

  const params = [
    server.detour.trim(),
    server.protocol === 'h3' ? 'h3=true' : '',
    server.skipCertVerify ? 'skip-cert-verify=true' : '',
    server.clientSubnet.trim() ? `ecs=${server.clientSubnet.trim()}` : '',
  ].filter(Boolean)

  return params.length ? `${endpoint}#${params.join('&')}` : endpoint
}

const toSingBoxDnsServer = (server: DnsServerRow, index: number) => {
  const type = server.protocol === 'system' ? 'local' : server.protocol
  return compactObject({
    tag: normalizeDnsServerName(server, index),
    type: type === 'h3' ? 'h3' : type,
    server: server.address.trim(),
    server_port: server.port.trim() ? Number(server.port.trim()) || server.port.trim() : undefined,
    path: server.path.trim(),
    detour: server.detour.trim(),
    client_subnet: server.clientSubnet.trim(),
    tls: server.skipCertVerify ? { insecure: true } : undefined,
  })
}

const singBoxFakeIpEnabled = () =>
  baseConfigForm.dnsMode === 'fake-ip' && Boolean(baseConfigForm.dnsFakeIpEnabled)

const fakeIpServerName = 'fakeip'

const normalizeFakeIpActionServer = (action: string) => {
  const normalized = action.trim().toLowerCase().replace(/_/g, '-')
  if (normalized === 'fake-ip' || normalized === 'fakeip') return fakeIpServerName
  if (normalized === 'real-ip' || normalized === 'realip')
    return firstDnsServerNameByRole('default')
  return ''
}

const wildcardToRegex = (value: string) => {
  const escaped = value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return `^${escaped}$`
}

const isSingBoxBuiltInRuleSetTag = (value: string) => {
  const tag = value.trim()
  return (
    tag.startsWith('geoip-') ||
    tag.startsWith('geosite-') ||
    tag.startsWith('geo/') ||
    tag.startsWith('geo-lite/')
  )
}

const toSingBoxGeositeRuleSetTag = (value: string) => {
  const code = value
    .trim()
    .toLowerCase()
    .replace(/^geosite:/, '')
    .trim()
  if (!code) return ''
  return isSingBoxBuiltInRuleSetTag(code) ? code : `geo/geosite/${code}`
}

const singBoxDnsMatcherFromValue = (value: string) => {
  const item = value.trim()
  if (!item) return null
  const lower = item.toLowerCase()
  if (lower.startsWith('geosite:')) {
    const geosite = item.slice('geosite:'.length).trim()
    const tag = toSingBoxGeositeRuleSetTag(geosite)
    return tag ? { rule_set: [tag] } : null
  }
  if (lower.startsWith('rule-set:')) {
    const ruleSet = item.slice('rule-set:'.length).trim()
    return ruleSet ? { rule_set: [ruleSet] } : null
  }
  if (item.startsWith('*.') || item.startsWith('+.')) {
    return { domain_suffix: [item.slice(2)] }
  }
  if (item.includes('*')) {
    return { domain_regex: [wildcardToRegex(item)] }
  }
  return { domain: [item] }
}

const singBoxDnsRuleFromFakeIpFilter = (value: string, server: string) => {
  const matcher = singBoxDnsMatcherFromValue(value)
  if (!matcher || !server) return null
  return compactObject({ ...matcher, server })
}

const singBoxDnsRuleFromFakeIpRuleLine = (line: string) => {
  const parts = line
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (parts.length < 2) return null

  const type = parts[0].toUpperCase()
  if (type === 'MATCH') {
    const server = normalizeFakeIpActionServer(parts[1])
    return server ? { server } : null
  }
  if (parts.length < 3) return null

  const server = normalizeFakeIpActionServer(parts[2])
  if (!server) return null

  switch (type) {
    case 'DOMAIN':
      return { domain: [parts[1]], server }
    case 'DOMAIN-SUFFIX':
      return { domain_suffix: [parts[1]], server }
    case 'DOMAIN-KEYWORD':
      return { domain_keyword: [parts[1]], server }
    case 'DOMAIN-REGEX':
      return { domain_regex: [parts[1]], server }
    case 'DOMAIN-WILDCARD':
      return { domain_regex: [wildcardToRegex(parts[1])], server }
    case 'GEOSITE':
      return { rule_set: [toSingBoxGeositeRuleSetTag(parts[1])], server }
    case 'RULE-SET':
      return { rule_set: [parts[1]], server }
    default:
      return null
  }
}

const singBoxFakeIpRules = (): Record<string, unknown>[] => {
  if (!singBoxFakeIpEnabled()) return []

  const filters = textLines(baseConfigForm.dnsFakeIpFilters)
  const mode = String(baseConfigForm.dnsFakeIpFilterMode || 'blacklist')
  if (mode === 'rule') {
    return filters.reduce<Record<string, unknown>[]>((items, filter) => {
      const rule = singBoxDnsRuleFromFakeIpRuleLine(filter)
      if (isSingBoxDnsRule(rule)) items.push(rule)
      return items
    }, [])
  }

  const server = mode === 'whitelist' ? fakeIpServerName : firstDnsServerNameByRole('default')
  return filters.reduce<Record<string, unknown>[]>((items, filter) => {
    const rule = singBoxDnsRuleFromFakeIpFilter(filter, server)
    if (isSingBoxDnsRule(rule)) items.push(rule)
    return items
  }, [])
}

const singBoxDnsFinalServer = () => {
  return firstDnsServerNameByRole('default')
}

const singBoxDefaultLeakPreventionRuleSetTag = 'geo/geosite/geolocation-!cn'

const singBoxDefaultLeakPreventionDnsRules = () => {
  if (singBoxFakeIpEnabled()) return []
  const proxyIndex = dnsServers.value.findIndex(
    (server) => server.role === 'proxy' && server.address.trim(),
  )
  const proxyServer =
    proxyIndex >= 0 ? normalizeDnsServerName(dnsServers.value[proxyIndex], proxyIndex) : ''
  return proxyServer
    ? [{ rule_set: [singBoxDefaultLeakPreventionRuleSetTag], server: proxyServer }]
    : []
}

const singBoxFakeIpCatchAllRule = () => {
  if (!singBoxFakeIpEnabled()) return null
  const mode = String(baseConfigForm.dnsFakeIpFilterMode || 'blacklist')
  return mode === 'blacklist' ? { query_type: ['A', 'AAAA'], server: fakeIpServerName } : null
}

const singBoxDnsMatcherKeys = [
  'domain',
  'domain_suffix',
  'domain_keyword',
  'domain_regex',
  'geosite',
  'rule_set',
]

const isSingBoxDnsRule = (rule: unknown): rule is Record<string, unknown> =>
  Boolean(rule) && typeof rule === 'object' && !Array.isArray(rule)

const mergeableSingBoxDnsRuleSignature = (rule: Record<string, unknown>) => {
  const matcherCount = singBoxDnsMatcherKeys.filter((key) => Array.isArray(rule[key])).length
  if (matcherCount === 0) return ''
  const signatureEntries = Object.entries(rule).filter(
    ([key]) => !singBoxDnsMatcherKeys.includes(key),
  )
  return JSON.stringify(Object.fromEntries(signatureEntries))
}

const mergeAdjacentSingBoxDnsRules = (rules: Array<Record<string, unknown>>) => {
  const merged: Array<Record<string, unknown>> = []
  for (const rule of rules) {
    const signature = mergeableSingBoxDnsRuleSignature(rule)
    const previous = merged[merged.length - 1]
    if (signature && previous && mergeableSingBoxDnsRuleSignature(previous) === signature) {
      for (const key of singBoxDnsMatcherKeys) {
        const previousValues = Array.isArray(previous[key]) ? previous[key] : []
        const ruleValues = Array.isArray(rule[key]) ? rule[key] : []
        if (ruleValues.length) {
          previous[key] = [...previousValues, ...ruleValues]
        }
      }
      continue
    }
    merged.push({ ...rule })
  }
  return merged
}

const mihomoDnsPreviewObject = computed(() => {
  const policyEntries = dnsRules.value
    .map((rule) => {
      const value = rule.value.trim()
      if (!value) return null
      const key =
        rule.matcher === 'domain'
          ? value
          : rule.matcher === 'domain_suffix'
            ? `+.${value.replace(/^\+\./, '').replace(/^\./, '')}`
            : rule.matcher === 'geosite'
              ? `geosite:${value}`
              : `rule-set:${value}`
      const targetServers = dnsServers.value
        .filter((server) => server.name.trim() === rule.serverName.trim())
        .map(formatMihomoDnsServer)
        .filter(Boolean)
      return targetServers.length ? [key, targetServers] : null
    })
    .filter((item): item is [string, string[]] => Boolean(item))

  return {
    dns: compactObject({
      enable: Boolean(baseConfigForm.dnsEnabled),
      listen: String(baseConfigForm.dnsListen || '').trim(),
      ipv6: Boolean(baseConfigForm.dnsIpv6),
      'enhanced-mode': String(baseConfigForm.dnsMode || 'fake-ip'),
      'fake-ip-range': String(baseConfigForm.dnsFakeIpRange || '').trim(),
      'fake-ip-range6': String(baseConfigForm.dnsFakeIpRange6 || '').trim(),
      'fake-ip-filter-mode': String(baseConfigForm.dnsFakeIpFilterMode || 'blacklist'),
      'fake-ip-filter': textLines(baseConfigForm.dnsFakeIpFilters),
      'use-hosts': Boolean(baseConfigForm.dnsUseHosts),
      'use-system-hosts': Boolean(baseConfigForm.dnsUseHosts),
      'cache-algorithm': String(baseConfigForm.dnsCacheAlgorithm || 'lru'),
      'prefer-h3': Boolean(baseConfigForm.dnsMihomoPreferH3),
      'respect-rules': Boolean(baseConfigForm.dnsMihomoRespectRules),
      'default-nameserver': dnsServersByRole('bootstrap').map(formatMihomoDnsServer),
      nameserver: dnsServersByRole('default').map(formatMihomoDnsServer),
      fallback: dnsServersByRole('fallback').map(formatMihomoDnsServer),
      'direct-nameserver': dnsServersByRole('direct').map(formatMihomoDnsServer),
      'proxy-server-nameserver': dnsServersByRole('proxy').map(formatMihomoDnsServer),
      'nameserver-policy': policyEntries.length ? Object.fromEntries(policyEntries) : undefined,
      'fallback-filter': compactObject({
        geoip: Boolean(baseConfigForm.dnsMihomoFallbackGeoip),
        'geoip-code': String(baseConfigForm.dnsMihomoFallbackGeoipCode || '').trim(),
      }),
    }),
  }
})

const singBoxDnsPreviewObject = computed(() => {
  const servers = dnsServers.value
    .filter((server) => server.address.trim())
    .map((server, index) => toSingBoxDnsServer(server, index))

  const fakeIpServer = singBoxFakeIpEnabled()
    ? [
        compactObject({
          tag: fakeIpServerName,
          type: 'fakeip',
          inet4_range: String(baseConfigForm.dnsFakeIpRange || '').trim(),
          inet6_range: String(baseConfigForm.dnsFakeIpRange6 || '').trim(),
        }),
      ]
    : []

  const rules = dnsRules.value
    .map((rule) => {
      const value = rule.value.trim()
      if (!value) return null
      return compactObject({
        domain: rule.matcher === 'domain' ? [value] : undefined,
        domain_suffix: rule.matcher === 'domain_suffix' ? [value] : undefined,
        rule_set:
          rule.matcher === 'geosite'
            ? [toSingBoxGeositeRuleSetTag(value)]
            : rule.matcher === 'rule_set'
              ? [value]
              : undefined,
        server: rule.serverName.trim() || firstDnsServerNameByRole('default'),
        strategy: rule.strategy.trim(),
        client_subnet: rule.clientSubnet.trim(),
      })
    })
    .filter(isSingBoxDnsRule)

  const fakeIpRules = singBoxFakeIpRules()
  const fakeIpCatchAllRule = singBoxFakeIpCatchAllRule()
  const mergedRules = mergeAdjacentSingBoxDnsRules([
    ...fakeIpRules,
    ...rules,
    ...singBoxDefaultLeakPreventionDnsRules(),
    ...(fakeIpCatchAllRule ? [fakeIpCatchAllRule] : []),
  ])

  return {
    dns: compactObject({
      servers: [...servers, ...fakeIpServer],
      rules: mergedRules,
      final: singBoxDnsFinalServer(),
      strategy: String(baseConfigForm.dnsDefaultStrategy || '').trim(),
      disable_cache: !baseConfigForm.dnsCacheEnabled,
      cache_capacity: Number(baseConfigForm.dnsCacheCapacity || 0) || undefined,
      optimistic: baseConfigForm.dnsOptimisticEnabled
        ? compactObject({
            enabled: true,
            timeout: String(baseConfigForm.dnsOptimisticTimeout || '').trim(),
          })
        : undefined,
      timeout: String(baseConfigForm.dnsTimeout || '').trim(),
      reverse_mapping: Boolean(baseConfigForm.dnsSingBoxReverseMapping),
      client_subnet: String(baseConfigForm.dnsSingBoxClientSubnet || '').trim(),
    }),
  }
})

const mihomoDnsPreview = computed(() => JSON.stringify(mihomoDnsPreviewObject.value, null, 2))
const singBoxDnsPreview = computed(() => JSON.stringify(singBoxDnsPreviewObject.value, null, 2))

const networkSectionOrder = [
  '日志 Log',
  '网络基础',
  '局域网与控制 API',
  '流量嗅探',
  '连接行为与资源缓存',
  '接口、拨号与路由默认项',
  '时间同步',
  'HTTP 客户端与端点',
  '证书与 TLS',
]

const visibleFormSections = computed(() => {
  const sections = baseFormSections.filter((section) => section.tab === activeTab.value)
  if (activeTab.value !== 'network') {
    return sections
  }
  return [...sections].sort(
    (a, b) =>
      (networkSectionOrder.indexOf(a.title) === -1
        ? networkSectionOrder.length
        : networkSectionOrder.indexOf(a.title)) -
      (networkSectionOrder.indexOf(b.title) === -1
        ? networkSectionOrder.length
        : networkSectionOrder.indexOf(b.title)),
  )
})
const ntpDialConfiguredCount = computed(
  () =>
    ntpDialFields.filter((field) =>
      field.type === 'boolean'
        ? Boolean(baseConfigForm[field.key])
        : String(baseConfigForm[field.key] || '').trim(),
    ).length,
)

const builtInRuleIndexSummary = computed(() => {
  const refreshedAt =
    builtInRuleTableData.value.refreshedAt || builtInRuleSourceIndex.value?.refreshedAt
  if (!refreshedAt) {
    return '本地还没有缓存索引，点击刷新后会以分页表格加载全部规则集。'
  }
  return `共 ${builtInRuleTableData.value.total || 0} 个规则集，刷新时间 ${new Date(refreshedAt).toLocaleString()}`
})

const builtInRuleTotalPages = computed(() =>
  Math.max(1, Math.ceil((builtInRuleTableData.value.total || 0) / builtInRuleTablePageSize)),
)
const repositoryTableTotalPages = computed(() =>
  Math.max(1, Math.ceil(repositoryTableData.value.total / customTablePageSize)),
)
const singBoxRuleSetTableTotalPages = computed(() =>
  Math.max(1, Math.ceil(singBoxRuleSetTableData.value.total / customTablePageSize)),
)
const mihomoRuleProviderTableTotalPages = computed(() =>
  Math.max(1, Math.ceil(mihomoRuleProviderTableData.value.total / customTablePageSize)),
)

watch(builtInRuleTablePage, async () => {
  await loadBuiltInRuleTablePage().catch((error) => {
    showNotification({
      content: toErrorMessage(error),
      type: 'alert-error',
    })
  })
})

watch(repositoryTablePage, async () => {
  await loadRepositoryTablePage().catch((error) => {
    showNotification({
      content: toErrorMessage(error),
      type: 'alert-error',
    })
  })
})

watch(singBoxRuleSetTablePage, async () => {
  await loadSingBoxRuleSetTablePage().catch((error) => {
    showNotification({
      content: toErrorMessage(error),
      type: 'alert-error',
    })
  })
})

watch(mihomoRuleProviderTablePage, async () => {
  await loadMihomoRuleProviderTablePage().catch((error) => {
    showNotification({
      content: toErrorMessage(error),
      type: 'alert-error',
    })
  })
})

const tabs = computed<ConfigTabMeta[]>(() => [
  {
    key: 'network',
    label: '网络',
    heading: '网络基础配置',
    description: '集中维护日志、实验特性、TUN 与时间同步等全局基础能力。',
    icon: GlobeAltIcon,
    count: baseFormSections
      .filter((section) => section.tab === 'network')
      .reduce((sum, section) => sum + section.fields.length, 0),
  },
  {
    key: 'dns',
    label: 'DNS',
    heading: 'DNS 编排与预览',
    description: '统一管理解析服务器、策略规则和双核心最终渲染结果。',
    icon: CircleStackIcon,
    count:
      baseFormSections
        .filter((section) => section.tab === 'dns')
        .reduce((sum, section) => sum + section.fields.length, 0) +
      dnsServers.value.length +
      dnsRules.value.length,
  },
  {
    key: 'inbounds',
    label: '入站',
    heading: '入站入口卡片',
    description: '按卡片组织端口、协议和注入能力，并对 sing-box / mihomo 做兼容审计。',
    icon: ServerStackIcon,
    count: inboundCards.value.length,
  },
  {
    key: 'outbounds',
    label: '出站',
    heading: '出站节点总览',
    description: '汇总所有来源的节点信息，支持二维码、复制、编辑和清理手动节点。',
    icon: DocumentTextIcon,
    count: outboundTableRows.value.length,
  },
  {
    key: 'rule-sets',
    label: '规则集',
    heading: '规则资源工作区',
    description: '把内置规则索引、自定义仓库和双核心规则资源放在同一个操作面板里。',
    icon: FolderIcon,
    count:
      (builtInRuleTableData.value.total || 0) +
      customRuleSourceRepositories.value.length +
      singBoxRuleSets.value.length +
      mihomoRuleProviders.value.length,
  },
  {
    key: 'diagnostics',
    label: '诊断',
    heading: '诊断与操作历史',
    description: '查看最近错误、节点健康和操作流水，方便快速确认配置状态。',
    icon: ExclamationTriangleIcon,
    count: recentErrorEvents.value.length,
  },
])
const getFieldSpanClass = (field: BaseFormField) => {
  if (field.span === 'full') {
    return 'md:col-span-2 xl:col-span-3'
  }
  if (field.span === 'wide') {
    return 'md:col-span-2 xl:col-span-2'
  }
  return ''
}

const getSectionCardClass = (section: BaseFormSection) => {
  if (
    section.kind === 'managed-dns-servers' ||
    section.kind === 'managed-dns-policies' ||
    section.kind === 'managed-dns-preview'
  ) {
    return 'xl:col-span-2'
  }
  return ''
}

const getSectionItemCount = (section: BaseFormSection) => {
  if (section.kind === 'managed-dns-servers') return dnsServers.value.length
  if (section.kind === 'managed-dns-policies') return dnsRules.value.length
  return section.fields.length
}

const getInboundFieldSpanClass = (field: InboundField) => getFieldSpanClass(field)

const isInboundCardExpanded = (id: string) => inboundExpandedMap.value[id] ?? false

const toggleInboundCardExpanded = (id: string) => {
  inboundExpandedMap.value = {
    ...inboundExpandedMap.value,
    [id]: !isInboundCardExpanded(id),
  }
}

const floatingActions = computed<FloatingAction[]>(() => {
  const actions: FloatingAction[] = [
    {
      key: 'refresh',
      label: '刷新',
      icon: ArrowPathIcon,
      onClick: refreshPage,
      disabled: busy.value,
    },
  ]

  if (activeTab.value === 'network' || activeTab.value === 'dns') {
    actions.unshift({
      key: 'save-global-config',
      label: globalConfigSaving.value ? '保存中…' : '保存配置',
      icon: CheckIcon,
      onClick: saveGlobalConfig,
      disabled: busy.value || globalConfigSaving.value,
      primary: true,
    })
  }

  if (activeTab.value === 'inbounds') {
    actions.unshift({
      key: 'add-inbound',
      label: inboundSaving.value ? '保存中…' : '新增入站',
      icon: PlusIcon,
      onClick: openCreateInboundDialog,
      disabled: inboundSaving.value,
      primary: true,
    })
  }

  if (activeTab.value === 'rule-sets') {
    actions.unshift({
      key: 'refresh-rule-index',
      label: builtInRuleIndexRefreshing.value ? '刷新中…' : '刷新内置索引',
      icon: ArrowPathIcon,
      onClick: refreshBuiltInRuleIndex,
      disabled: builtInRuleIndexRefreshing.value,
      primary: true,
    })
  }

  if (activeTab.value === 'outbounds') {
    actions.unshift({
      key: 'add-outbound',
      label: '添加节点',
      icon: PlusIcon,
      onClick: openManualNodeDialog,
      primary: true,
    })
  }

  return actions
})

const currentInboundFields = computed(() => inboundFieldCatalog[inboundDraft.type])

const canSubmitInboundDraft = computed(() => {
  const tag = String(inboundDraft.values.tag || '').trim()
  return Boolean(tag && inboundDraft.type)
})

const mihomoCompatibleInboundTypes = new Set<InboundType>([
  'mixed',
  'http',
  'socks',
  'redirect',
  'tproxy',
  'tun',
])

const inboundAuditIssues = computed<InboundAuditIssue[]>(() => {
  const issues: InboundAuditIssue[] = []
  const tagCounts = new Map<string, number>()
  const portOwners = new Map<string, string>()

  for (const card of inboundCards.value) {
    if (!card.enabled) {
      continue
    }
    const tag = String(card.values.tag || '').trim()
    if (!tag) {
      issues.push({
        inboundId: card.id,
        core: 'sing-box',
        severity: 'error',
        field: 'tag',
        message: 'tag 不能为空',
      })
    } else {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }

    if (card.type !== 'tun') {
      const port = toInteger(card.values.listen_port)
      if (!port || port < 1 || port > 65535) {
        issues.push({
          inboundId: card.id,
          core: 'sing-box',
          severity: 'error',
          field: 'listen_port',
          message: '端口必须在 1-65535 之间',
        })
      } else {
        const portKey = String(port)
        const owner = portOwners.get(portKey)
        if (owner && owner !== card.id) {
          issues.push({
            inboundId: card.id,
            core: 'sing-box',
            severity: 'error',
            field: 'listen_port',
            message: `端口 ${port} 已被其他入站使用`,
          })
        }
        portOwners.set(portKey, card.id)
      }
    }

    if (!mihomoCompatibleInboundTypes.has(card.type)) {
      issues.push({
        inboundId: card.id,
        core: 'mihomo',
        severity: 'warning',
        field: 'type',
        message: `${card.type} 仅会编译到 sing-box`,
      })
    }

    if (card.type === 'redirect') {
      issues.push({
        inboundId: card.id,
        core: 'mihomo',
        severity: 'info',
        field: 'type',
        message: 'redirect 透明代理端口依赖 Linux/Android/macOS 平台能力',
      })
    }
    if (card.type === 'tproxy') {
      issues.push({
        inboundId: card.id,
        core: 'mihomo',
        severity: 'info',
        field: 'type',
        message: 'tproxy 透明代理端口依赖 Linux/Android 平台能力',
      })
    }
  }

  for (const [tag, count] of tagCounts.entries()) {
    if (count <= 1) {
      continue
    }
    for (const card of inboundCards.value) {
      if (card.enabled && String(card.values.tag || '').trim() === tag) {
        issues.push({
          inboundId: card.id,
          core: 'sing-box',
          severity: 'error',
          field: 'tag',
          message: `tag "${tag}" 重复`,
        })
      }
    }
  }

  return issues
})

const inboundAuditByCard = computed(() => {
  const result = new Map<string, InboundAuditIssue[]>()
  for (const issue of inboundAuditIssues.value) {
    result.set(issue.inboundId, [...(result.get(issue.inboundId) || []), issue])
  }
  return result
})

const setInboundDraftValue = (key: string, value: string | boolean) => {
  inboundDraft.values[key] = value
}

const changeInboundDraftType = (type: InboundType) => {
  const currentTag = inboundDraft.values.tag
  inboundDraft.type = type
  inboundDraft.values = createInboundValues(type, {
    ...(currentTag ? { tag: currentTag } : {}),
  })
}

const describeInboundCard = (card: InboundCard) => {
  const port = displayInboundPort(card)
  const listen = String(card.values.listen || card.values.interface_name || '-')
  return `${inboundTypeLabelMap[card.type]} · 监听 ${listen}${port !== '-' ? `:${port}` : ''}`
}

const displayInboundPort = (card: InboundCard) => {
  if (card.type === 'tun') {
    return String(card.values.interface_name || '-')
  }
  return String(card.values.listen_port || '-')
}

const inboundPreviewEntries = (card: InboundCard) => {
  return Object.entries(card.values)
    .filter(([, value]) => value !== '' && value !== false && value !== undefined && value !== null)
    .map(([key, value]) => ({
      key,
      value: typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value),
    }))
    .slice(0, 8)
}

const assignInboundDraft = (source: InboundCard) => {
  const card = createInboundCard(source.type, source)
  inboundDraft.id = card.id
  inboundDraft.enabled = card.enabled
  inboundDraft.type = card.type
  inboundDraft.values = card.values
}

const openCreateInboundDialog = () => {
  editingInboundId.value = null
  assignInboundDraft(createInboundCard('mixed'))
  inboundDialogOpen.value = true
}

const openEditInboundDialog = (id: string) => {
  const target = inboundCards.value.find((item) => item.id === id)
  if (!target) {
    return
  }
  editingInboundId.value = id
  assignInboundDraft(target)
  inboundDialogOpen.value = true
}

const updateRepositoryConfigInbounds = (inbounds: FastProxyManagedInbound[]) => {
  if (!fastProxyRepository.value) {
    return
  }
  fastProxyRepository.value = {
    ...fastProxyRepository.value,
    config: {
      ...fastProxyRepository.value.config,
      inbounds,
    },
  }
}

const updateRepositoryGlobalConfig = (config: FastProxyGlobalConfig) => {
  if (!fastProxyRepository.value) {
    return
  }
  fastProxyRepository.value = {
    ...fastProxyRepository.value,
    config,
  }
}

const saveGlobalConfig = async () => {
  globalConfigSaving.value = true
  try {
    const { data } = await updateGlobalConfigAPI(collectGlobalConfig())
    updateRepositoryGlobalConfig(data)
    applyGlobalConfig(data)
    showNotification({
      content: '配置已保存',
      type: 'alert-success',
    })
  } catch (error) {
    showNotification({
      content: toErrorMessage(error),
      type: 'alert-error',
    })
  } finally {
    globalConfigSaving.value = false
  }
}

const persistInboundCards = async (nextCards: InboundCard[], successMessage: string) => {
  inboundSaving.value = true
  try {
    const inbounds = nextCards.map(inboundCardToManaged)
    const { data } = await updateGlobalConfigInboundsAPI(inbounds)
    updateRepositoryConfigInbounds(data.inbounds || [])
    inboundCards.value = (data.inbounds || []).map(managedInboundToCard)
    showNotification({
      content: successMessage,
      type: 'alert-success',
    })
    return true
  } catch (error) {
    showNotification({
      content: toErrorMessage(error),
      type: 'alert-error',
    })
    return false
  } finally {
    inboundSaving.value = false
  }
}

const submitInboundDialog = async () => {
  if (!canSubmitInboundDraft.value) {
    return
  }
  const nextCard = createInboundCard(inboundDraft.type, {
    id: inboundDraft.id,
    enabled: inboundDraft.enabled,
    values: inboundDraft.values,
  })

  if (editingInboundId.value) {
    const saved = await persistInboundCards(
      inboundCards.value.map((item) => (item.id === editingInboundId.value ? nextCard : item)),
      '入站配置已更新',
    )
    if (saved) {
      inboundDialogOpen.value = false
    }
  } else {
    const saved = await persistInboundCards([...inboundCards.value, nextCard], '入站配置已新增')
    if (saved) {
      inboundDialogOpen.value = false
    }
  }
}

const removeInboundCard = async (id: string) => {
  const target = inboundCards.value.find((item) => item.id === id)
  if (!target) {
    return
  }
  if (!window.confirm(`确认删除入站“${target.values.tag || target.type}”吗？`)) {
    return
  }
  await persistInboundCards(
    inboundCards.value.filter((item) => item.id !== id),
    '入站配置已删除',
  )
}

const toggleInboundCard = async (id: string, enabled: boolean) => {
  const target = inboundCards.value.find((item) => item.id === id)
  if (!target) {
    return
  }
  await persistInboundCards(
    inboundCards.value.map((item) => (item.id === id ? { ...item, enabled } : item)),
    enabled ? '入站已启用' : '入站已禁用',
  )
}

const reorderInboundCards = async (orderedVisibleCards: InboundCard[]) => {
  let nextCards: InboundCard[]
  if (!inboundSearch.value.trim()) {
    nextCards = orderedVisibleCards
  } else {
    const visibleIds = new Set(orderedVisibleCards.map((item) => item.id))
    const hiddenCards = inboundCards.value.filter((item) => !visibleIds.has(item.id))
    nextCards = [...orderedVisibleCards, ...hiddenCards]
  }
  await persistInboundCards(nextCards, '入站顺序已保存')
}

const setTextField = (key: string, value: string) => {
  baseConfigForm[key] = value
}

const setBooleanField = (key: string, value: boolean) => {
  baseConfigForm[key] = value
}

const addDnsServer = () => {
  dnsServers.value.push({
    id: `dns-server-${Date.now()}`,
    name: '',
    role: 'default',
    protocol: 'udp',
    address: '',
    port: '53',
    path: '',
    detour: '',
    clientSubnet: '',
    skipCertVerify: false,
  })
}

const removeDnsServer = (index: number) => {
  dnsServers.value.splice(index, 1)
}

const setDnsServerField = <K extends keyof DnsServerRow>(
  index: number,
  key: K,
  value: DnsServerRow[K],
) => {
  dnsServers.value[index][key] = value
}

const addDnsRule = () => {
  dnsRules.value.push({
    id: `dns-rule-${Date.now()}`,
    matcher: 'domain_suffix',
    value: '',
    serverName: firstDnsServerNameByRole('default'),
    strategy: '',
    clientSubnet: '',
  })
}

const removeDnsRule = (index: number) => {
  dnsRules.value.splice(index, 1)
}

const setDnsRuleField = <K extends keyof DnsRuleRow>(
  index: number,
  key: K,
  value: DnsRuleRow[K],
) => {
  dnsRules.value[index][key] = value
}

const setNtpDialTextField = (key: string, value: string) => {
  ntpDialForm[key] = value
}

const setNtpDialBooleanField = (key: string, value: boolean) => {
  ntpDialForm[key] = value
}

const syncNtpDialFormFromBase = () => {
  for (const field of ntpDialFields) {
    ntpDialForm[field.key] = baseConfigForm[field.key]
  }
}

const openNtpDialDialog = () => {
  syncNtpDialFormFromBase()
  ntpDialDialogOpen.value = true
}

const submitNtpDialDialog = () => {
  for (const field of ntpDialFields) {
    baseConfigForm[field.key] = ntpDialForm[field.key]
  }
  ntpDialDialogOpen.value = false
}

const loadGlobalConfigFromBackend = async () => {
  try {
    const { data } = await fetchGlobalConfigAPI()
    updateRepositoryGlobalConfig(data)
    applyGlobalConfig(data)
  } catch (error) {
    applyGlobalConfig(fastProxyRepository.value?.config)
    showNotification({
      content: toErrorMessage(error),
      type: 'alert-error',
    })
  }
}

const coreOptions: FastProxyCoreId[] = ['sing-box', 'mihomo']
const ruleAssetSourceModes: FastProxyRuleAssetSourceMode[] = ['repository-file', 'remote', 'local']

const loadBuiltInRuleTablePage = async () => {
  const safePage = Math.max(1, builtInRuleTablePage.value)
  const offset = (safePage - 1) * builtInRuleTablePageSize
  const keyword = builtInRuleSearch.value.trim()
  const { data } = keyword
    ? await searchRuleSourceRepositoryIndexAPI(builtInRuleSourceRepositoryId, keyword, {
        offset,
        limit: builtInRuleTablePageSize,
      })
    : await fetchRuleSourceRepositoryIndexAPI(builtInRuleSourceRepositoryId, '', {
        offset,
        limit: builtInRuleTablePageSize,
        flat: true,
      })
  builtInRuleTableData.value = data
  const totalPages = Math.max(1, Math.ceil((data.total || 0) / builtInRuleTablePageSize))
  if (builtInRuleTablePage.value > totalPages) {
    builtInRuleTablePage.value = totalPages
  }
}

const refreshBuiltInRuleIndex = async () => {
  builtInRuleIndexRefreshing.value = true
  builtInRuleIndexError.value = ''
  try {
    const { data } = await refreshRuleSourceRepositoryIndexAPI(builtInRuleSourceRepositoryId)
    if (fastProxyRepository.value) {
      const nextIndexes = [
        ...(fastProxyRepository.value.ruleSourceIndexes || []).filter(
          (item) => item.repositoryId !== data.repositoryId,
        ),
        data,
      ]
      fastProxyRepository.value = {
        ...fastProxyRepository.value,
        ruleSourceIndexes: nextIndexes,
      }
    }
    await loadBuiltInRuleTablePage()
  } catch (error) {
    builtInRuleIndexError.value = toErrorMessage(error)
    showNotification({
      content: `刷新内置规则集索引失败：${toErrorMessage(error)}`,
      type: 'alert-error',
    })
  } finally {
    builtInRuleIndexRefreshing.value = false
  }
}

const loadRepositoryTablePage = async () => {
  const safePage = Math.max(1, repositoryTablePage.value)
  const offset = (safePage - 1) * customTablePageSize
  const { data } = await queryRuleSourceRepositoriesAPI({
    offset,
    limit: customTablePageSize,
    q: repositoryTableSearch.value,
  })
  repositoryTableData.value = data
  const totalPages = Math.max(1, Math.ceil(data.total / customTablePageSize))
  if (repositoryTablePage.value > totalPages) {
    repositoryTablePage.value = totalPages
  }
}

const loadSingBoxRuleSetTablePage = async () => {
  const safePage = Math.max(1, singBoxRuleSetTablePage.value)
  const offset = (safePage - 1) * customTablePageSize
  const { data } = await querySingBoxRuleSetsAPI({
    offset,
    limit: customTablePageSize,
    q: singBoxRuleSetTableSearch.value,
  })
  singBoxRuleSetTableData.value = data
  const totalPages = Math.max(1, Math.ceil(data.total / customTablePageSize))
  if (singBoxRuleSetTablePage.value > totalPages) {
    singBoxRuleSetTablePage.value = totalPages
  }
}

const loadMihomoRuleProviderTablePage = async () => {
  const safePage = Math.max(1, mihomoRuleProviderTablePage.value)
  const offset = (safePage - 1) * customTablePageSize
  const { data } = await queryMihomoRuleProvidersAPI({
    offset,
    limit: customTablePageSize,
    q: mihomoRuleProviderTableSearch.value,
  })
  mihomoRuleProviderTableData.value = data
  const totalPages = Math.max(1, Math.ceil(data.total / customTablePageSize))
  if (mihomoRuleProviderTablePage.value > totalPages) {
    mihomoRuleProviderTablePage.value = totalPages
  }
}

const triggerBuiltInRuleSearch = async () => {
  if (builtInRuleTablePage.value !== 1) {
    builtInRuleTablePage.value = 1
    return
  }
  await loadBuiltInRuleTablePage()
}

const triggerRepositoryTableSearch = async () => {
  if (repositoryTablePage.value !== 1) {
    repositoryTablePage.value = 1
    return
  }
  await loadRepositoryTablePage()
}

const triggerSingBoxRuleSetTableSearch = async () => {
  if (singBoxRuleSetTablePage.value !== 1) {
    singBoxRuleSetTablePage.value = 1
    return
  }
  await loadSingBoxRuleSetTablePage()
}

const triggerMihomoRuleProviderTableSearch = async () => {
  if (mihomoRuleProviderTablePage.value !== 1) {
    mihomoRuleProviderTablePage.value = 1
    return
  }
  await loadMihomoRuleProviderTablePage()
}

const resetRepositoryDraft = () => {
  editingRepositoryId.value = null
  repositoryDraft.id = ''
  repositoryDraft.name = ''
  repositoryDraft.description = ''
  repositoryDraft.owner = ''
  repositoryDraft.repository = ''
  repositoryDraft.coreMappings = [
    {
      core: 'sing-box',
      ref: '',
      rootPath: '',
    },
  ]
}

const addRepositoryMapping = (core: FastProxyCoreId = 'sing-box') => {
  repositoryDraft.coreMappings.push({
    core,
    ref: '',
    rootPath: '',
  })
}

const openCreateRepositoryDialog = () => {
  resetRepositoryDraft()
  repositoryDialogOpen.value = true
}

const editRepository = (id: string) => {
  const item = ruleSourceRepositories.value.find((entry) => entry.id === id)
  if (!item || item.builtIn) {
    return
  }
  editingRepositoryId.value = id
  repositoryDraft.id = item.id
  repositoryDraft.name = item.name
  repositoryDraft.description = item.description || ''
  repositoryDraft.owner = item.owner
  repositoryDraft.repository = item.repository
  repositoryDraft.coreMappings =
    item.coreMappings?.map((mapping) => ({
      core: mapping.core,
      ref: mapping.ref,
      rootPath: mapping.rootPath || '',
    })) || []
}

const openEditRepositoryDialog = (id: string) => {
  editRepository(id)
  repositoryDialogOpen.value = true
}

const deleteRepository = async (id: string) => {
  const item = ruleSourceRepositories.value.find((entry) => entry.id === id)
  if (!item || item.builtIn || !window.confirm(`确认删除仓库“${item.name}”吗？`)) {
    return
  }
  try {
    await deleteRuleSourceRepositoryAPI(id)
    await refreshPage()
    if (editingRepositoryId.value === id) {
      resetRepositoryDraft()
    }
  } catch (error) {
    showNotification({
      content: `删除仓库失败：${toErrorMessage(error)}`,
      type: 'alert-error',
    })
  }
}

const saveRepositoryDraft = async () => {
  repositorySaving.value = true
  try {
    const payload = {
      id: repositoryDraft.id.trim() || undefined,
      name: repositoryDraft.name.trim(),
      description: repositoryDraft.description.trim(),
      owner: repositoryDraft.owner.trim(),
      repository: repositoryDraft.repository.trim(),
      coreMappings: repositoryDraft.coreMappings
        .filter((mapping) => mapping.ref.trim())
        .map((mapping) => ({
          core: mapping.core,
          ref: mapping.ref.trim(),
          rootPath: mapping.rootPath.trim(),
        })),
    }
    if (editingRepositoryId.value) {
      await updateRuleSourceRepositoryAPI(editingRepositoryId.value, payload)
    } else {
      await createRuleSourceRepositoryAPI(payload)
    }
    await refreshPage()
    repositoryDialogOpen.value = false
    resetRepositoryDraft()
  } catch (error) {
    showNotification({
      content: `保存仓库失败：${toErrorMessage(error)}`,
      type: 'alert-error',
    })
  } finally {
    repositorySaving.value = false
  }
}

const resetRuleResourceDraft = (kind: RuleResourceKindDraft = 'sing-box-rule-set') => {
  editingRuleResourceId.value = null
  editingRuleResourceKind.value = kind
  ruleResourceDraft.kind = kind
  ruleResourceDraft.id = ''
  ruleResourceDraft.name = ''
  ruleResourceDraft.description = ''
  ruleResourceDraft.sourceMode = 'repository-file'
  ruleResourceDraft.repositoryId = ''
  ruleResourceDraft.ref = ''
  ruleResourceDraft.path = ''
  ruleResourceDraft.url = ''
  ruleResourceDraft.localPath = ''
  ruleResourceDraft.tag = ''
  ruleResourceDraft.provider = ''
  ruleResourceDraft.behavior = ''
  ruleResourceDraft.format = ''
  ruleResourceDraft.interval = ''
  repositoryBrowserEntries.value = []
  repositoryBrowserError.value = ''
  selectedRepositoryBrowserResourceKey.value = ''
  repositoryBrowserRefreshedAt.value = ''
  repositoryBrowserHasMore.value = false
}

const openCreateRuleResourceDialog = (kind: RuleResourceKindDraft) => {
  resetRuleResourceDraft(kind)
  ruleResourceDialogOpen.value = true
}

const applySingBoxRuleSetToDraft = (item: FastProxySingBoxRuleSetResource) => {
  editingRuleResourceKind.value = 'sing-box-rule-set'
  ruleResourceDraft.kind = 'sing-box-rule-set'
  ruleResourceDraft.id = item.id
  ruleResourceDraft.name = item.name
  ruleResourceDraft.description = item.description || ''
  ruleResourceDraft.sourceMode = item.sourceMode
  ruleResourceDraft.repositoryId = item.repositoryId || ''
  ruleResourceDraft.ref = item.ref || ''
  ruleResourceDraft.path = item.path || ''
  ruleResourceDraft.url = item.url || ''
  ruleResourceDraft.localPath = item.localPath || ''
  ruleResourceDraft.tag = item.tag
  ruleResourceDraft.provider = ''
  ruleResourceDraft.behavior = ''
  ruleResourceDraft.format = item.format || ''
  ruleResourceDraft.interval = item.updateInterval || ''
}

const applyMihomoRuleProviderToDraft = (item: FastProxyMihomoRuleProviderResource) => {
  editingRuleResourceKind.value = 'mihomo-rule-provider'
  ruleResourceDraft.kind = 'mihomo-rule-provider'
  ruleResourceDraft.id = item.id
  ruleResourceDraft.name = item.name
  ruleResourceDraft.description = item.description || ''
  ruleResourceDraft.sourceMode = item.sourceMode
  ruleResourceDraft.repositoryId = item.repositoryId || ''
  ruleResourceDraft.ref = item.ref || ''
  ruleResourceDraft.path = item.path || ''
  ruleResourceDraft.url = item.url || ''
  ruleResourceDraft.localPath = item.localPath || ''
  ruleResourceDraft.tag = ''
  ruleResourceDraft.provider = item.provider
  ruleResourceDraft.behavior = item.behavior || ''
  ruleResourceDraft.format = item.format || ''
  ruleResourceDraft.interval = item.interval || ''
}

const openEditRuleResourceDialog = (kind: RuleResourceKindDraft, id: string) => {
  if (kind === 'sing-box-rule-set') {
    const item = singBoxRuleSets.value.find((entry) => entry.id === id)
    if (!item) {
      return
    }
    editingRuleResourceId.value = id
    applySingBoxRuleSetToDraft(item)
  } else {
    const item = mihomoRuleProviders.value.find((entry) => entry.id === id)
    if (!item) {
      return
    }
    editingRuleResourceId.value = id
    applyMihomoRuleProviderToDraft(item)
  }
  ruleResourceDialogOpen.value = true
}

const deleteRuleResource = async (kind: RuleResourceKindDraft, id: string) => {
  const item =
    kind === 'sing-box-rule-set'
      ? singBoxRuleSets.value.find((entry) => entry.id === id)
      : mihomoRuleProviders.value.find((entry) => entry.id === id)
  if (!item || !window.confirm(`确认删除规则资源“${item.name}”吗？`)) {
    return
  }
  try {
    if (kind === 'sing-box-rule-set') {
      await deleteSingBoxRuleSetAPI(id)
    } else {
      await deleteMihomoRuleProviderAPI(id)
    }
    await refreshPage()
    if (editingRuleResourceId.value === id) {
      resetRuleResourceDraft(kind)
    }
  } catch (error) {
    showNotification({
      content: `删除规则资源失败：${toErrorMessage(error)}`,
      type: 'alert-error',
    })
  }
}

const setRuleResourcePrimaryName = (value: string) => {
  if (ruleResourceDraft.kind === 'sing-box-rule-set') {
    ruleResourceDraft.tag = value.trim()
  } else {
    ruleResourceDraft.provider = value.trim()
  }
}

const currentDraftCore = computed<FastProxyCoreId>(() => {
  return ruleResourceDraft.kind === 'sing-box-rule-set' ? 'sing-box' : 'mihomo'
})

const repositoryOptionsForDraft = computed(() => {
  return ruleSourceRepositories.value.filter((item) =>
    (item.supportedCores || []).includes(currentDraftCore.value),
  )
})

const isBrowserOpenForDraft = computed(() => {
  return (
    selectedRepositoryBrowserResourceKey.value ===
    `${ruleResourceDraft.kind}:${ruleResourceDraft.repositoryId}:${currentDraftCore.value}`
  )
})

const canSaveRuleResource = computed(() => {
  if (!ruleResourceDraft.name.trim()) return false
  if (ruleResourceDraft.kind === 'sing-box-rule-set' && !ruleResourceDraft.tag.trim()) return false
  if (ruleResourceDraft.kind === 'mihomo-rule-provider' && !ruleResourceDraft.provider.trim())
    return false
  if (ruleResourceDraft.sourceMode === 'repository-file') {
    return Boolean(ruleResourceDraft.repositoryId.trim() && ruleResourceDraft.path.trim())
  }
  if (ruleResourceDraft.sourceMode === 'remote') {
    return Boolean(ruleResourceDraft.url.trim())
  }
  return Boolean(ruleResourceDraft.localPath.trim())
})

const saveRuleResourceDraft = async () => {
  ruleResourceSaving.value = true
  try {
    const basePayload = {
      id: ruleResourceDraft.id.trim() || undefined,
      name: ruleResourceDraft.name.trim(),
      description: ruleResourceDraft.description.trim(),
      sourceMode: ruleResourceDraft.sourceMode,
      repositoryId: ruleResourceDraft.repositoryId.trim() || undefined,
      ref: ruleResourceDraft.ref.trim() || undefined,
      path: ruleResourceDraft.path.trim() || undefined,
      url: ruleResourceDraft.url.trim() || undefined,
      localPath: ruleResourceDraft.localPath.trim() || undefined,
      format: ruleResourceDraft.format.trim() || undefined,
    }
    if (ruleResourceDraft.kind === 'sing-box-rule-set') {
      const payload = {
        ...basePayload,
        tag: ruleResourceDraft.tag.trim(),
        updateInterval: ruleResourceDraft.interval.trim() || undefined,
      }
      if (editingRuleResourceId.value) {
        await updateSingBoxRuleSetAPI(editingRuleResourceId.value, payload)
      } else {
        await createSingBoxRuleSetAPI(payload)
      }
    } else {
      const payload = {
        ...basePayload,
        provider: ruleResourceDraft.provider.trim(),
        behavior: ruleResourceDraft.behavior.trim() || undefined,
        interval: ruleResourceDraft.interval.trim() || undefined,
      }
      if (editingRuleResourceId.value) {
        await updateMihomoRuleProviderAPI(editingRuleResourceId.value, payload)
      } else {
        await createMihomoRuleProviderAPI(payload)
      }
    }
    await refreshPage()
    ruleResourceDialogOpen.value = false
    resetRuleResourceDraft(ruleResourceDraft.kind)
  } catch (error) {
    showNotification({
      content: `保存规则资源失败：${toErrorMessage(error)}`,
      type: 'alert-error',
    })
  } finally {
    ruleResourceSaving.value = false
  }
}

const ruleSourceIndexEntryToSelectableFile = (
  entry: FastProxyRuleSourceIndexEntry,
  core: FastProxyCoreId,
): FastProxyRuleSourceSelectableFile | null => {
  const file = entry.files?.[core]
  if (!file) return null
  return {
    name: file.name,
    path: file.path,
    kind: file.kind,
    format: file.format,
    behavior: file.behavior,
  }
}

const browseRepositoryFiles = async () => {
  if (!ruleResourceDraft.repositoryId || !currentDraftCore.value) {
    return
  }
  repositoryBrowsing.value = true
  repositoryBrowserError.value = ''
  selectedRepositoryBrowserResourceKey.value = `${ruleResourceDraft.kind}:${ruleResourceDraft.repositoryId}:${currentDraftCore.value}`
  try {
    const { data: refreshed } = await refreshRuleSourceSelectableFilesAPI(
      ruleResourceDraft.repositoryId,
      currentDraftCore.value,
    )
    const { data: page } = await searchRuleSourceRepositoryIndexAPI(
      ruleResourceDraft.repositoryId,
      '',
      {
        offset: 0,
        limit: builtInRuleIndexPageSize,
        core: currentDraftCore.value,
        kind: ruleResourceDraft.kind,
      },
    )
    repositoryBrowserEntries.value = (page.entries || [])
      .map((entry) =>
        ruleSourceIndexEntryToSelectableFile(entry, currentDraftCore.value as FastProxyCoreId),
      )
      .filter((entry): entry is FastProxyRuleSourceSelectableFile => Boolean(entry))
    repositoryBrowserHasMore.value = Boolean(page.hasMore)
    repositoryBrowserRefreshedAt.value = refreshed.refreshedAt
      ? `已刷新 ${new Date(refreshed.refreshedAt).toLocaleString()}${page.hasMore ? ` · 显示前 ${repositoryBrowserEntries.value.length}/${page.total || repositoryBrowserEntries.value.length}` : ''}`
      : ''
  } catch (error) {
    repositoryBrowserEntries.value = []
    repositoryBrowserError.value = toErrorMessage(error)
    repositoryBrowserRefreshedAt.value = ''
    repositoryBrowserHasMore.value = false
  } finally {
    repositoryBrowsing.value = false
  }
}

const applyRepositoryFileToDraft = (entry: FastProxyRuleSourceSelectableFile) => {
  ruleResourceDraft.path = entry.path
  const fileName = entry.path.split('/').pop() || ''
  const normalizedName = fileName.replace(/\.(srs|yaml|yml|json|mrs|txt|list)$/i, '')
  if (ruleResourceDraft.kind === 'sing-box-rule-set') {
    if (!ruleResourceDraft.tag.trim()) {
      ruleResourceDraft.tag = normalizedName
    }
    if (!ruleResourceDraft.format.trim() && entry.format) {
      ruleResourceDraft.format = entry.format
    }
  } else if (!ruleResourceDraft.provider.trim()) {
    ruleResourceDraft.provider = normalizedName
  }
  if (ruleResourceDraft.kind === 'mihomo-rule-provider') {
    if (!ruleResourceDraft.behavior.trim() && entry.behavior) {
      ruleResourceDraft.behavior = entry.behavior
    }
    if (!ruleResourceDraft.format.trim() && entry.format) {
      ruleResourceDraft.format = entry.format
    }
  }
  if (!ruleResourceDraft.name.trim()) {
    ruleResourceDraft.name = normalizedName || entry.path
  }
}

const toErrorMessage = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message
  }
  return error instanceof Error ? error.message : '未知错误'
}

const formatOperationEventTime = (value: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

const operationEventResourceLabel = (event: FastProxyOperationEvent) => {
  const values = [event.resourceType, event.resourceId].filter(Boolean)
  return values.length ? values.join(' / ') : '-'
}

const loadOperationEvents = async () => {
  operationEventsLoading.value = true
  operationEventsError.value = ''
  try {
    const [events, errors, health] = await Promise.all([
      queryOperationEventsAPI({ limit: 50 }),
      queryOperationEventsAPI({ severity: 'error', limit: 10 }),
      fetchLatestNodeHealthAPI({ limit: 20 }),
    ])
    operationEvents.value = events.data.events || []
    recentErrorEvents.value = errors.data.events || []
    recentHealthSamples.value = health.data || []
  } catch (error) {
    operationEvents.value = []
    recentErrorEvents.value = []
    recentHealthSamples.value = []
    operationEventsError.value = toErrorMessage(error)
  } finally {
    operationEventsLoading.value = false
  }
}

const refreshPage = async () => {
  try {
    await loadFastProxyWorkspace()
  } catch {
    showNotification({
      content: 'configManagementRefreshFailed',
      type: 'alert-error',
    })
    return
  }

  const results = await Promise.allSettled([
    loadGlobalConfigFromBackend(),
    loadOperationEvents(),
    loadBuiltInRuleTablePage(),
    loadRepositoryTablePage(),
    loadSingBoxRuleSetTablePage(),
    loadMihomoRuleProviderTablePage(),
  ])

  if (results.some((result) => result.status === 'rejected')) {
    showNotification({
      content: 'configManagementRefreshFailed',
      type: 'alert-error',
    })
  }
}

onMounted(async () => {
  resetRepositoryDraft()
  resetRuleResourceDraft()
  await refreshPage()
})
</script>

<style scoped>
.ghost {
  opacity: 0.45;
}
</style>
