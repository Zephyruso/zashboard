<template>
  <!-- Header -->
  <div class="settings-section-label flex items-center justify-between gap-2 normal-case">
    <span class="text-base-content/90 text-sm font-semibold tracking-normal">{{ title }}</span>
    <div
      v-if="provider.available.value"
      class="dropdown dropdown-end"
    >
      <button
        tabindex="0"
        class="text-primary hover:bg-primary/10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium tracking-normal transition-colors"
        @click="openAddMenu"
      >
        <PlusIcon class="h-4 w-4" />
        {{ $t('usbipConnectDevice') }}
      </button>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-1 mt-1 max-h-80 w-64 flex-nowrap overflow-y-auto p-2 shadow-lg"
      >
        <li
          v-if="permitted === null"
          class="p-2"
        >
          <span class="loading loading-spinner loading-sm mx-auto"></span>
        </li>
        <template v-else>
          <li
            v-if="permitted.length > 0"
            class="menu-title"
          >
            {{ $t('usbipAuthorizedDevices') }}
          </li>
          <li
            v-for="(entry, index) in permitted"
            :key="`${entry.vidPid}-${index}`"
          >
            <button
              :disabled="entry.attached"
              class="flex items-center justify-between gap-2"
              @click="pick(entry)"
            >
              <span class="truncate">{{ entry.label }}</span>
              <span class="font-mono text-xs opacity-60">{{ entry.vidPid }}</span>
            </button>
          </li>
          <li
            v-if="permitted.length > 0"
            class="menu-title pt-1"
          ></li>
          <li>
            <button
              class="gap-2"
              @click="pickOther"
            >
              <PlusIcon class="h-4 w-4" />
              {{ $t('usbipOtherDevice') }}
            </button>
          </li>
        </template>
      </ul>
    </div>
  </div>

  <div
    v-if="provider.endError.value"
    class="alert alert-error alert-soft mb-2 rounded-xl py-2 text-sm"
  >
    <ExclamationTriangleIcon class="h-4 w-4 flex-shrink-0" />
    <span class="break-all">{{ provider.endError.value }}</span>
  </div>

  <!-- Devices -->
  <div
    v-if="rows.length === 0"
    class="bg-base-200/40 text-base-content/50 rounded-xl p-6 text-center text-sm"
  >
    {{ provider.available.value ? $t('usbipPickDeviceHint') : $t('usbipNoDevicesShared') }}
  </div>
  <div
    v-else
    class="settings-grid"
  >
    <div
      v-for="row in rows"
      :key="row.key"
      class="setting-item"
    >
      <component
        :is="row.descriptor ? 'button' : 'div'"
        class="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
        @click="row.descriptor && openDetail(row)"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="inline-block h-2 w-2 shrink-0 rounded-full"
            :class="dotClass(row.state?.tone)"
          ></span>
          <span class="truncate text-sm font-medium">{{ row.name }}</span>
          <span
            v-if="row.state"
            class="text-base-content/40 truncate text-xs"
            >{{ row.state.label }}</span
          >
        </div>
        <div
          v-if="row.error"
          class="text-error pl-[1.125rem] text-xs break-all"
        >
          {{ row.error }}
        </div>
      </component>
      <button
        v-if="row.onDetach"
        class="text-error/80 hover:bg-error/10 shrink-0 rounded-md p-1 transition-colors"
        :title="$t('usbipDetach')"
        @click="row.onDetach()"
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
      <ChevronRightIcon
        v-if="row.descriptor"
        class="text-base-content/25 h-4 w-4 shrink-0 cursor-pointer"
        @click="openDetail(row)"
      />
    </div>
  </div>

  <div
    v-if="!provider.available.value"
    class="text-base-content/50 px-1 pt-2 text-xs"
  >
    {{
      provider.reason.value === 'insecure'
        ? $t('usbipInsecureContext')
        : $t('usbipUnsupportedBrowser')
    }}
  </div>

  <!-- Device detail -->
  <DialogWrapper
    v-model="detailOpen"
    :title="detail?.name ?? ''"
  >
    <div
      v-if="detail?.descriptor"
      class="flex flex-col gap-4 text-sm"
    >
      <div>
        <div class="text-base-content/45 mb-1 px-1 text-xs font-medium">
          {{ $t('usbipIdentity') }}
        </div>
        <div class="divide-base-content/8 bg-base-200/40 divide-y overflow-hidden rounded-xl">
          <DataLine
            v-if="detail.descriptor.product"
            :label="$t('usbipProduct')"
            :value="detail.descriptor.product"
          />
          <DataLine
            v-if="detail.vidPid"
            label="VID:PID"
            :value="detail.vidPid"
            mono
          />
          <DataLine
            v-if="detail.descriptor.serial"
            :label="$t('usbipSerialNumber')"
            :value="detail.descriptor.serial"
            mono
          />
          <DataLine
            v-if="detail.descriptor.bcdDevice > 0"
            :label="$t('usbipVersion')"
            :value="bcdToVersion(detail.descriptor.bcdDevice)"
            mono
          />
        </div>
      </div>

      <div>
        <div class="text-base-content/45 mb-1 px-1 text-xs font-medium">
          {{ $t('usbipConnection') }}
        </div>
        <div class="divide-base-content/8 bg-base-200/40 divide-y overflow-hidden rounded-xl">
          <DataLine
            v-if="detail.busId"
            :label="$t('usbipBusId')"
            :value="detail.busId"
            mono
          />
          <DataLine
            v-if="detail.backend"
            :label="$t('usbipBackend')"
            :value="detail.backend"
            mono
          />
          <DataLine
            v-if="speedLabel"
            :label="$t('usbipSpeed')"
            :value="speedLabel"
          />
          <DataLine
            v-if="detail.descriptor.busNum > 0 || detail.descriptor.devNum > 0"
            :label="$t('usbipBusDevice')"
            :value="`${detail.descriptor.busNum} · ${detail.descriptor.devNum}`"
            mono
          />
        </div>
      </div>

      <div>
        <div class="text-base-content/45 mb-1 px-1 text-xs font-medium">
          {{ $t('usbipClassInterfaces') }}
        </div>
        <div class="divide-base-content/8 bg-base-200/40 divide-y overflow-hidden rounded-xl">
          <DataLine
            :label="$t('usbipDeviceClass')"
            :value="
              detail.descriptor.deviceClass === 0
                ? $t('usbipDefinedAtInterface')
                : usbClassTriplet(
                    detail.descriptor.deviceClass,
                    detail.descriptor.deviceSubClass,
                    detail.descriptor.deviceProtocol,
                  )
            "
            :mono="detail.descriptor.deviceClass !== 0"
          />
          <DataLine
            v-if="detail.descriptor.numConfigurations > 0"
            :label="$t('usbipConfigurations')"
            :value="String(detail.descriptor.numConfigurations)"
            mono
          />
          <DataLine
            v-for="(iface, index) in detail.descriptor.interfaces"
            :key="index"
            :label="$t('usbipInterfaceN', { n: index + 1 })"
            :value="
              usbClassTriplet(
                iface.interfaceClass,
                iface.interfaceSubClass,
                iface.interfaceProtocol,
              )
            "
            mono
          />
        </div>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import DataLine from '@/components/common/DataLine.vue'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import {
  useUsbipProvider,
  type PermittedDevice,
  type ProvidedDevice,
  type ProvidedDeviceState,
} from '@/composables/usbipProvider'
import {
  USBBackend,
  USBDeviceState,
  type USBDeviceDescriptor,
  type USBIPServerStatus,
} from '@/gen/daemon/started_service_pb'
import { showNotification } from '@/helper/notification'
import { bcdToVersion, usbClassTriplet, usbSpeedLabel } from '@/helper/usbInfo'
import { formatVidPid } from '@/helper/webusb'
import {
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  server: USBIPServerStatus
  multiTag: boolean
}>()

const { t } = useI18n()
const provider = useUsbipProvider(props.server.serverTag)

const title = computed(() =>
  props.multiTag && props.server.serverTag
    ? t('usbipServerTagged', { tag: props.server.serverTag })
    : 'USB/IP',
)

type Tone = 'good' | 'medium' | 'bad'

interface DeviceRow {
  key: string
  name: string
  vidPid?: string
  busId?: string
  backend?: string
  state?: { label: string; tone: Tone }
  error?: string
  descriptor?: USBDeviceDescriptor
  onDetach?: () => void
}

const PROVIDED_STATE: Record<ProvidedDeviceState, { tone: Tone; key: string }> = {
  attaching: { tone: 'medium', key: 'usbipStateAttaching' },
  ready: { tone: 'good', key: 'usbipStateReady' },
  error: { tone: 'bad', key: 'usbipStateError' },
}

const serverState = (state: USBDeviceState): { label: string; tone: Tone } | undefined => {
  switch (state) {
    case USBDeviceState.USB_DEVICE_STATE_IDLE:
      return { label: t('usbipStateIdle'), tone: 'good' }
    case USBDeviceState.USB_DEVICE_STATE_ATTACHED:
      return { label: t('usbipStateAttached'), tone: 'medium' }
    case USBDeviceState.USB_DEVICE_STATE_UNAVAILABLE:
      return { label: t('usbipStateUnavailable'), tone: 'bad' }
  }
}

const backendLabel = (backend: USBBackend): string | undefined => {
  switch (backend) {
    case USBBackend.USB_BACKEND_LINUX_SYSFS:
      return 'linux-sysfs'
    case USBBackend.USB_BACKEND_DYNAMIC:
      return 'dynamic'
    case USBBackend.USB_BACKEND_DARWIN_IOKIT:
      return 'darwin-iokit'
    case USBBackend.USB_BACKEND_WINDOWS_VBOXUSB:
      return 'windows-vboxusb'
    default:
      return undefined
  }
}

const dotClass = (tone: Tone | undefined): string => {
  switch (tone) {
    case 'good':
      return 'bg-success'
    case 'medium':
      return 'bg-warning'
    case 'bad':
      return 'bg-error'
    default:
      return 'bg-base-content/20'
  }
}

const rows = computed<DeviceRow[]>(() => {
  const providedByBusId = new Map<string, ProvidedDevice>()
  for (const device of provider.devices.value) {
    if (device.state === 'ready' && device.busId) {
      providedByBusId.set(device.busId, device)
    }
  }
  const matched = new Set<string>()
  const detachedBusIds = new Set(provider.detachedBusIds.value)

  const result: DeviceRow[] = []
  for (const device of props.server.devices) {
    const descriptor = device.descriptor
    const provided = device.busId ? providedByBusId.get(device.busId) : undefined
    if (!provided && detachedBusIds.has(device.busId)) {
      continue
    }
    if (provided) {
      matched.add(provided.deviceId)
    }
    result.push({
      key: device.stableId || device.busId,
      name:
        descriptor?.product ||
        (descriptor ? formatVidPid(descriptor.vendorId, descriptor.productId) : device.busId),
      vidPid: descriptor ? formatVidPid(descriptor.vendorId, descriptor.productId) : undefined,
      busId: device.busId,
      backend: backendLabel(device.backend),
      state: serverState(device.state),
      descriptor,
      onDetach: provided ? () => provider.detach(provided.deviceId) : undefined,
    })
  }

  for (const device of provider.devices.value) {
    if (matched.has(device.deviceId)) {
      continue
    }
    result.push({
      key: `provided-${device.deviceId}`,
      name: device.label,
      vidPid: formatVidPid(device.vendorId, device.productId),
      busId: device.state === 'ready' ? device.busId : undefined,
      state: {
        label: t(PROVIDED_STATE[device.state].key),
        tone: PROVIDED_STATE[device.state].tone,
      },
      error: device.state === 'error' ? device.error : undefined,
      onDetach: () => provider.detach(device.deviceId),
    })
  }

  return result
})

// --- Add device menu ---
const permitted = ref<PermittedDevice[] | null>(null)

const openAddMenu = () => {
  permitted.value = null
  provider.listPermitted().then(
    (list) => (permitted.value = list),
    () => (permitted.value = []),
  )
}

const closeMenu = () => {
  // Blur the focused dropdown so daisyUI collapses it.
  ;(document.activeElement as HTMLElement | null)?.blur()
}

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  showNotification({ content: message, type: 'alert-error' })
}

const pick = (entry: PermittedDevice) => {
  closeMenu()
  provider.attachPermitted(entry.device).catch(handleError)
}

const pickOther = () => {
  closeMenu()
  provider.connectNew().catch(handleError)
}

// --- Device detail dialog ---
const detail = ref<DeviceRow>()
const detailOpen = ref(false)
const openDetail = (row: DeviceRow) => {
  detail.value = row
  detailOpen.value = true
}

const speedLabel = computed(() =>
  detail.value?.descriptor ? usbSpeedLabel(detail.value.descriptor.speed) : undefined,
)
</script>
