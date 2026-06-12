<template>
  <DialogWrapper
    v-model="isOpen"
    :title="title"
    no-padding
    box-class="max-w-3xl"
  >
    <div
      v-if="log"
      class="flex flex-col"
    >
      <div
        class="from-base-200/60 to-base-100 border-base-content/10 relative flex items-center gap-3 border-b bg-gradient-to-br px-5 py-3"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm"
          :class="headerAccent.bg"
        >
          <component
            :is="headerAccent.icon"
            class="h-4.5 w-4.5"
            :class="headerAccent.fg"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div
            class="text-base-content/55 flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase"
          >
            <span>{{ parsed.title }}</span>
            <span
              v-if="parsed.subtitle"
              class="text-base-content/40 truncate"
              >· {{ parsed.subtitle }}</span
            >
          </div>
          <div
            class="text-base-content/80 mt-0.5 line-clamp-1 font-mono text-[11px] leading-relaxed break-all"
          >
            {{ log.payload }}
          </div>
        </div>
      </div>

      <div class="space-y-3 px-5 py-3">
        <div
          v-if="metaBadges.length"
          class="flex flex-wrap items-center gap-1.5"
        >
          <div
            v-for="(badge, i) in metaBadges"
            :key="badge.label"
            class="bg-base-200/60 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
            :style="{ animationDelay: `${i * 30}ms` }"
            :class="['meta-badge-animate', badge.toneClass]"
          >
            <component
              :is="badge.icon"
              class="h-3 w-3"
            />
            <span class="text-base-content/55">{{ badge.label }}</span>
            <span class="font-mono font-semibold">{{ badge.value }}</span>
          </div>
        </div>

        <template
          v-for="(group, gi) in groupedFields"
          :key="group.key"
        >
          <div
            v-if="group.fields.length"
            class="space-y-1.5"
          >
            <div
              class="text-base-content/50 flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase"
            >
              <component
                :is="group.icon"
                class="h-3 w-3"
              />
              {{ group.label }}
            </div>

            <div
              v-if="group.key === 'network' && connectionFlow"
              class="connection-flow"
            >
              <div
                class="endpoint source"
                :style="{ animationDelay: '80ms' }"
              >
                <div class="endpoint-tag">
                  <ArrowUpRightIcon class="h-3 w-3" />
                  Source
                  <span
                    class="proto-chip"
                    :class="protoToneClass(connectionFlow.protocol)"
                    >{{ connectionFlow.protocol }}</span
                  >
                </div>
                <div class="endpoint-body">
                  <span class="ip font-mono">{{ connectionFlow.sourceIP || '—' }}</span>
                  <span
                    v-if="connectionFlow.sourcePort"
                    class="port font-mono"
                    >{{ connectionFlow.sourcePort }}</span
                  >
                </div>
              </div>
              <template v-if="isReject">
                <div
                  class="hop-row hop-reject"
                  :style="{ animationDelay: '130ms' }"
                >
                  <div class="reject-pill">
                    <XCircleIcon class="h-3.5 w-3.5" />
                    <span>Rejected</span>
                  </div>
                </div>
              </template>
              <template v-else-if="proxyChain.length">
                <div
                  class="arrow arrow-long"
                  aria-hidden="true"
                >
                  <div class="arrow-line" />
                  <ArrowDownIcon class="arrow-head h-4 w-4" />
                </div>
                <div
                  class="hop-row"
                  :style="{ animationDelay: '130ms' }"
                >
                  <div class="hop-label">
                    <ServerStackIcon class="h-3 w-3" />
                    {{ proxyChain.length > 1 ? 'Chain' : 'Proxy' }}
                  </div>
                  <div class="hop-chips">
                    <template
                      v-for="(hop, hi) in proxyChain"
                      :key="hi"
                    >
                      <span class="hop-chip">{{ hop }}</span>
                      <ChevronRightIcon
                        v-if="hi < proxyChain.length - 1"
                        class="hop-arrow h-3 w-3"
                      />
                    </template>
                  </div>
                </div>
                <div
                  class="arrow arrow-long"
                  aria-hidden="true"
                >
                  <div class="arrow-line" />
                  <ArrowDownIcon class="arrow-head h-4 w-4" />
                </div>
              </template>
              <template v-else>
                <div
                  class="arrow arrow-direct"
                  aria-hidden="true"
                >
                  <div class="arrow-line" />
                  <ArrowDownIcon class="arrow-head h-4 w-4" />
                </div>
              </template>
              <div
                class="endpoint destination"
                :style="{ animationDelay: '230ms' }"
              >
                <div class="endpoint-tag">
                  <ArrowDownLeftIcon class="h-3 w-3" />
                  Destination
                  <span
                    v-if="isDirect"
                    class="direct-chip"
                  >
                    <span class="direct-dot" />
                    Direct
                  </span>
                </div>
                <div class="endpoint-body">
                  <span
                    class="ip font-mono"
                    :class="isIpLike(connectionFlow.destIP) ? 'text-primary' : 'text-info'"
                    >{{ connectionFlow.destIP || '—' }}</span
                  >
                  <span
                    v-if="connectionFlow.destPort"
                    class="port font-mono"
                    >{{ connectionFlow.destPort }}</span
                  >
                </div>
              </div>
            </div>

            <div
              v-else
              class="grid gap-1.5"
              :class="group.gridCols"
            >
              <component
                :is="field.layout === 'chain' ? 'div' : 'div'"
                v-for="(field, i) in group.fields"
                :key="`${group.key}-${field.label}-${i}`"
                class="bg-base-200/40 hover:bg-base-200/70 flex items-center rounded-md border px-2 py-1 transition-colors"
                :class="[
                  'field-card-animate',
                  fieldSizeClass(field),
                  toneBorderClass(field.tone),
                  field.empty ? 'opacity-50' : '',
                ]"
                :style="{ animationDelay: `${80 + gi * 30 + i * 30}ms` }"
              >
                <div
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  :class="toneIconBgClass(field.tone)"
                >
                  <component
                    :is="iconFor(field.icon)"
                    class="h-3 w-3"
                    :class="toneIconFgClass(field.tone)"
                  />
                </div>
                <div
                  v-if="field.layout !== 'pill'"
                  class="text-base-content/50 text-[10px] font-semibold tracking-wider uppercase"
                >
                  {{ field.label }}
                </div>
                <div
                  v-if="field.layout === 'chain'"
                  class="flex min-w-0 flex-1 flex-wrap items-center gap-1"
                >
                  <template
                    v-for="(hop, hi) in field.value.split(/\s*→\s*/)"
                    :key="hi"
                  >
                    <span
                      class="bg-primary/15 text-primary rounded-md px-2 py-0.5 font-mono text-xs font-semibold"
                      >{{ hop }}</span
                    >
                    <ChevronRightIcon
                      v-if="hi < field.value.split(/\s*→\s*/).length - 1"
                      class="text-base-content/40 h-3 w-3"
                    />
                  </template>
                </div>
                <span
                  v-else
                  class="text-base-content min-w-0 flex-1 truncate text-sm"
                  :class="[
                    field.mono ? 'font-mono' : '',
                    field.layout === 'pill' ? 'font-semibold' : '',
                  ]"
                  :title="field.value"
                  >{{ field.value || '—' }}</span
                >
                <button
                  v-if="field.copyable && field.value && field.layout !== 'chain'"
                  type="button"
                  class="text-base-content/40 hover:text-base-content/80 shrink-0 transition-colors"
                  :title="`Copy ${field.label}`"
                  @click="copyText(field.value, field.label)"
                >
                  <component
                    :is="
                      copiedKey === field.label ? ClipboardDocumentCheckIcon : ClipboardDocumentIcon
                    "
                    class="h-3 w-3"
                    :class="copiedKey === field.label ? 'text-success' : ''"
                  />
                </button>
              </component>
            </div>
          </div>
        </template>

        <details class="bg-base-200/40 group border-base-content/5 rounded-md border">
          <summary
            class="text-base-content/55 hover:text-base-content/80 flex cursor-pointer items-center justify-between gap-2 px-2.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors select-none"
          >
            <div class="flex items-center gap-1.5">
              <CodeBracketIcon class="h-3 w-3" />
              Raw payload
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="btn btn-ghost btn-xs h-5 min-h-0 gap-1 px-1.5 text-[10px]"
                :class="copyOk ? 'text-success' : ''"
                @click.stop.prevent="copyPayload"
              >
                <component
                  :is="copyOk ? ClipboardDocumentCheckIcon : ClipboardDocumentIcon"
                  class="h-3 w-3"
                />
                {{ copyOk ? 'Copied' : 'Copy' }}
              </button>
              <ChevronDownIcon class="h-3 w-3 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <pre
            class="text-base-content/90 max-h-48 overflow-auto rounded-b-md p-2.5 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap"
            >{{ log.payload }}</pre
          >
        </details>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import {
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowPathIcon,
  ArrowUpRightIcon,
  ArrowRightStartOnRectangleIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleStackIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CodeBracketIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  HashtagIcon,
  IdentificationIcon,
  InformationCircleIcon,
  MapIcon,
  MinusCircleIcon,
  ServerIcon,
  ServerStackIcon,
  Squares2X2Icon,
  TagIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import { LOG_LEVEL } from '@/constant'
import { isIpLike, parseLog, type LogField, type LogTone } from '@/helper/logParser'
import type { LogWithSeq } from '@/types'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  log: LogWithSeq | null
}>()

const isOpen = defineModel<boolean>({ required: true })

const parsed = computed(() => parseLog(props.log?.payload ?? ''))
const title = computed(() => (props.log ? `Log #${props.log.seq}` : 'Log detail'))

const colorMapForType: Record<string, string> = {
  [LOG_LEVEL.Trace]: 'text-success',
  [LOG_LEVEL.Debug]: 'text-accent',
  [LOG_LEVEL.Info]: 'text-info',
  [LOG_LEVEL.Warning]: 'text-warning',
  [LOG_LEVEL.Error]: 'text-error',
  [LOG_LEVEL.Fatal]: 'text-error',
  [LOG_LEVEL.Panic]: 'text-error',
  [LOG_LEVEL.Silent]: 'text-base-content/40',
}

const metaBadges = computed(() => {
  if (!props.log) return []
  return [
    {
      label: 'Level',
      value: props.log.type.toUpperCase(),
      icon: BoltIcon,
      toneClass: colorMapForType[props.log.type] ?? 'text-base-content/80',
    },
    {
      label: 'Seq',
      value: `#${props.log.seq}`,
      icon: HashtagIcon,
      toneClass: 'text-base-content/80',
    },
    {
      label: 'Time',
      value: props.log.time,
      icon: ClockIcon,
      toneClass: 'text-base-content/80',
    },
  ]
})

const headerAccent = computed(() => {
  const map: Record<string, { bg: string; fg: string; icon: typeof BoltIcon }> = {
    connection: { bg: 'bg-info/15', fg: 'text-info', icon: ArrowDownLeftIcon },
    'connection-error': {
      bg: 'bg-error/15',
      fg: 'text-error',
      icon: ExclamationTriangleIcon,
    },
    'dns-resolve': { bg: 'bg-success/15', fg: 'text-success', icon: GlobeAltIcon },
    'dns-error': { bg: 'bg-error/15', fg: 'text-error', icon: ExclamationTriangleIcon },
    'server-listening': { bg: 'bg-primary/15', fg: 'text-primary', icon: ServerIcon },
    'config-loaded': { bg: 'bg-info/15', fg: 'text-info', icon: DocumentTextIcon },
    'resource-loaded': { bg: 'bg-accent/15', fg: 'text-accent', icon: CircleStackIcon },
    'rule-set': { bg: 'bg-accent/15', fg: 'text-accent', icon: Squares2X2Icon },
    'process-lookup': {
      bg: 'bg-base-content/10',
      fg: 'text-base-content/70',
      icon: CpuChipIcon,
    },
    metadata: { bg: 'bg-warning/15', fg: 'text-warning', icon: IdentificationIcon },
    error: { bg: 'bg-error/15', fg: 'text-error', icon: ExclamationTriangleIcon },
    info: { bg: 'bg-info/15', fg: 'text-info', icon: InformationCircleIcon },
  }
  return map[parsed.value.kind] ?? map.info
})

const iconFor = (name?: string) => {
  const map: Record<string, typeof BoltIcon> = {
    bolt: BoltIcon,
    'arrow-up-right': ArrowUpRightIcon,
    'arrow-down-left': ArrowDownLeftIcon,
    'arrow-right-start-on-rectangle': ArrowRightStartOnRectangleIcon,
    'check-circle': CheckCircleIcon,
    server: ServerIcon,
    'server-stack': ServerStackIcon,
    'cpu-chip': CpuChipIcon,
    'x-circle': XCircleIcon,
    'globe-alt': GlobeAltIcon,
    hashtag: HashtagIcon,
    'exclamation-triangle': ExclamationTriangleIcon,
    'document-text': DocumentTextIcon,
    database: CircleStackIcon,
    'circle-stack': CircleStackIcon,
    tag: TagIcon,
    'information-circle': InformationCircleIcon,
    'minus-circle': MinusCircleIcon,
    'chat-bubble-left': ChatBubbleLeftIcon,
    'arrow-path': ArrowPathIcon,
    'cog-6-tooth': ServerStackIcon,
    map: MapIcon,
  }
  return map[name ?? ''] ?? InformationCircleIcon
}

const toneBorderClass = (tone?: LogTone) => {
  switch (tone) {
    case 'success':
      return 'border-success/20'
    case 'warning':
      return 'border-warning/20'
    case 'error':
      return 'border-error/20'
    case 'info':
      return 'border-info/20'
    case 'primary':
      return 'border-primary/20'
    default:
      return 'border-base-content/5'
  }
}

const toneIconBgClass = (tone?: LogTone) => {
  switch (tone) {
    case 'success':
      return 'bg-success/15'
    case 'warning':
      return 'bg-warning/15'
    case 'error':
      return 'bg-error/15'
    case 'info':
      return 'bg-info/15'
    case 'primary':
      return 'bg-primary/15'
    default:
      return 'bg-base-content/10'
  }
}

const toneIconFgClass = (tone?: LogTone) => {
  switch (tone) {
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'error':
      return 'text-error'
    case 'info':
      return 'text-info'
    case 'primary':
      return 'text-primary'
    default:
      return 'text-base-content/70'
  }
}

interface FieldGroup {
  key: string
  label: string
  icon: typeof BoltIcon
  fields: LogField[]
  gridCols: string
}

const findField = (label: string): string => {
  return parsed.value.fields.find((f) => f.label === label)?.value ?? ''
}

const connectionFlow = computed(() => {
  if (parsed.value.kind !== 'connection' && parsed.value.kind !== 'connection-error') {
    return null
  }
  const protocol = findField('Protocol')
  if (!protocol) return null
  return {
    protocol,
    sourceIP: findField('Source IP'),
    sourcePort: findField('Source port'),
    destIP: findField('Destination'),
    destPort: findField('Destination port'),
  }
})

const proxyChain = computed<string[]>(() => {
  const chain = findField('Chain')
  if (chain) {
    const hops = chain.split(/\s*→\s*/).filter(Boolean)
    const realHops = hops.filter((hop) => !hop.toLowerCase().includes('direct'))
    return realHops.length ? realHops : []
  }
  const proxy = findField('Proxy')
  if (!proxy) return []
  if (proxy.toLowerCase().includes('direct')) return []
  return [proxy]
})

const isDirect = computed(() => {
  if (isReject.value) return false
  return !proxyChain.value.length
})

const isReject = computed(() => {
  return proxyChain.value.length > 0 && proxyChain.value.every((hop) => hop === 'REJECT')
})

const protoToneClass = (proto: string): string => {
  const upper = proto.toUpperCase()
  if (upper === 'TCP') return 'bg-info/15 text-info'
  if (upper === 'UDP') return 'bg-primary/15 text-primary'
  if (upper === 'SOCKS' || upper === 'SOCKS4' || upper === 'SOCKS5') {
    return 'bg-warning/15 text-warning'
  }
  if (upper === 'HTTP' || upper === 'HTTPS') return 'bg-success/15 text-success'
  return 'bg-base-content/10 text-base-content/80'
}

const fieldSizeClass = (field: LogField): string => {
  switch (field.layout) {
    case 'pill':
      return 'gap-1.5'
    case 'tile':
      return 'gap-1.5'
    case 'block':
      return 'gap-2'
    case 'chain':
      return 'gap-2'
    default:
      return 'gap-1.5'
  }
}

const groupedFields = computed<FieldGroup[]>(() => {
  const groups: FieldGroup[] = [
    { key: 'network', label: 'Network', icon: GlobeAltIcon, fields: [], gridCols: '' },
    { key: 'routing', label: 'Routing', icon: MapIcon, fields: [], gridCols: '' },
    { key: 'system', label: 'System', icon: ServerStackIcon, fields: [], gridCols: '' },
    { key: 'error', label: 'Error', icon: ExclamationTriangleIcon, fields: [], gridCols: '' },
    { key: 'raw', label: 'Message', icon: ChatBubbleLeftIcon, fields: [], gridCols: '' },
  ]

  for (const field of parsed.value.fields) {
    if (
      field.label === 'Protocol' ||
      field.label === 'Source IP' ||
      field.label === 'Source port' ||
      field.label === 'Destination' ||
      field.label === 'Destination port' ||
      field.label === 'Domain' ||
      field.label === 'Answer' ||
      field.label === 'Address'
    ) {
      groups[0].fields.push(field)
      continue
    }
    if (
      field.label === 'Rule type' ||
      field.label === 'Rule payload' ||
      field.label === 'Rule' ||
      field.label === 'Proxy' ||
      field.label === 'Chain' ||
      field.label === 'Mode'
    ) {
      if (field.label === 'Mode') {
        continue
      }
      groups[1].fields.push(field)
      continue
    }
    if (field.label === 'Error') {
      groups[3].fields.push(field)
      continue
    }
    if (
      field.label === 'Type' ||
      field.label === 'Path' ||
      field.label === 'Scope' ||
      field.label === 'Detail' ||
      field.label === 'Name' ||
      field.label === 'Action' ||
      field.label === 'Message'
    ) {
      groups[2].fields.push(field)
      continue
    }
    groups[4].fields.push(field)
  }

  return groups
    .filter((g) => g.fields.length > 0)
    .map((g) => {
      const hasBlock = g.fields.some((f) => f.layout === 'block' || f.layout === 'chain')
      const pills = g.fields.filter((f) => f.layout === 'pill').length
      const tiles = g.fields.filter((f) => f.layout === 'tile').length

      let gridCols: string
      if (hasBlock) {
        gridCols = 'grid-cols-1'
      } else if (pills >= 2 && tiles >= 1) {
        gridCols = 'grid-cols-2 md:grid-cols-3'
      } else if (pills + tiles >= 3) {
        gridCols = 'grid-cols-2 md:grid-cols-3'
      } else {
        gridCols = 'grid-cols-2'
      }

      return { ...g, gridCols }
    })
})

const copyOk = ref(false)
const copiedKey = ref<string | null>(null)
let copyTimer: number | undefined
let copyFieldTimer: number | undefined

const writeToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

const copyPayload = async () => {
  if (!props.log) return
  await writeToClipboard(props.log.payload)
  copyOk.value = true
  if (copyTimer) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copyOk.value = false
  }, 1500)
}

const copyText = async (value: string, key: string) => {
  await writeToClipboard(value)
  copiedKey.value = key
  if (copyFieldTimer) window.clearTimeout(copyFieldTimer)
  copyFieldTimer = window.setTimeout(() => {
    copiedKey.value = null
  }, 1200)
}

watch(
  () => props.log,
  () => {
    copyOk.value = false
    copiedKey.value = null
  },
)
</script>

<style scoped>
.meta-badge-animate {
  opacity: 0;
  transform: translateY(4px);
  animation: badgeIn 0.25s ease forwards;
}

.field-card-animate {
  opacity: 0;
  transform: translateY(4px);
  animation: fieldIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes badgeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fieldIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.connection-flow {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.25rem 0;
}

.endpoint {
  position: relative;
  border-radius: 0.5rem;
  border: 1px solid;
  background: color-mix(in srgb, var(--color-base-200) 60%, transparent);
  padding: 0.5rem 0.75rem;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  align-self: center;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  opacity: 0;
  transform: translateY(6px);
  animation: endpointIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.endpoint:hover {
  background: color-mix(in srgb, var(--color-base-200) 90%, transparent);
}

.endpoint.source {
  border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-success) 8%, transparent),
    color-mix(in srgb, var(--color-base-200) 50%, transparent)
  );
}

.endpoint.destination {
  border-color: color-mix(in srgb, var(--color-info) 35%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-info) 8%, transparent),
    color-mix(in srgb, var(--color-base-200) 50%, transparent)
  );
}

.endpoint-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-base-content) 55%, transparent);
}

.endpoint.source .endpoint-tag {
  color: var(--color-success);
}

.endpoint.destination .endpoint-tag {
  color: var(--color-info);
}

.endpoint-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
}

.endpoint-body .ip {
  word-break: break-all;
  text-align: center;
}

.endpoint-body .port {
  color: color-mix(in srgb, var(--color-base-content) 65%, transparent);
  font-weight: 500;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}

.proto-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  font-family: ui-monospace, monospace;
}

.proto-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.0625rem 0.4rem;
  border-radius: 0.3125rem;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-family: ui-monospace, monospace;
}

.hop-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0;
  opacity: 0;
  animation: hopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.direct-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.0625rem 0.4rem 0.0625rem 0.3rem;
  border-radius: 9999px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-info) 80%, transparent);
  background: color-mix(in srgb, var(--color-info) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-info) 25%, transparent);
}

.direct-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: var(--color-info);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-info) 18%, transparent);
}

.hop-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.hop-chips {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-wrap: wrap;
  justify-content: center;
}

.hop-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-primary) 15%, transparent),
    color-mix(in srgb, var(--color-primary) 8%, transparent)
  );
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.hop-arrow {
  color: color-mix(in srgb, var(--color-primary) 60%, transparent);
  margin: 0 0.125rem;
}

.reject-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 8%, transparent);
}

.hop-row.hop-reject {
  padding: 0.5rem 0;
}

@keyframes hopIn {
  to {
    opacity: 1;
  }
}

.arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 1.5rem;
  position: relative;
  opacity: 0;
  animation: arrowIn 0.3s ease 0.13s forwards;
}

.arrow.arrow-long {
  height: 2.25rem;
}

.arrow.arrow-direct {
  height: 3.5rem;
}

.arrow-line {
  width: 2px;
  flex: 1;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--color-success) 50%, transparent),
    color-mix(in srgb, var(--color-info) 50%, transparent)
  );
  border-radius: 1px;
}

.arrow-head {
  color: var(--color-info);
  margin-top: -2px;
  filter: drop-shadow(0 1px 2px color-mix(in srgb, var(--color-info) 30%, transparent));
}

@keyframes endpointIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes arrowIn {
  to {
    opacity: 1;
  }
}
</style>
