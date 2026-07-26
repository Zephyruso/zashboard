/// <reference types="w3c-web-usb" />
import type { USBDeviceDescriptorSchema, USBURBRequest } from '@/gen/daemon/started_service_pb'
import type { MessageInitShape } from '@bufbuild/protobuf'

// WebUSB plumbing for the usbip provider — ported from sing-box-dashboard
// (src/lib/webusb.ts). Bridges the browser's WebUSB API to the URB requests the
// sing-box usbip-server forwards over the ProvideUSBDevices stream.

export type WebUsbUnavailableReason = 'unsupported' | 'insecure'

export type WebUsbStatus =
  | { available: true }
  | { available: false; reason: WebUsbUnavailableReason }

export function webusbStatus(): WebUsbStatus {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    return { available: false, reason: 'unsupported' }
  }
  if (!window.isSecureContext) {
    return { available: false, reason: 'insecure' }
  }
  return { available: true }
}

export function requestUsbDevice(): Promise<USBDevice> {
  return navigator.usb.requestDevice({ filters: [] })
}

export function formatVidPid(vendorId: number, productId: number): string {
  const hex = (value: number) => value.toString(16).padStart(4, '0')
  return `${hex(vendorId)}:${hex(productId)}`
}

type DescriptorInit = MessageInitShape<typeof USBDeviceDescriptorSchema>

// Return values are the Linux USB/IP USB_SPEED_* constants.
function inferSpeed(device: USBDevice): number {
  if (device.usbVersionMajor >= 3) return 5 // super-speed
  if (device.usbVersionMajor >= 2) return 3 // high-speed
  return 2 // full-speed
}

export function buildDescriptor(device: USBDevice, deviceId: string): DescriptorInit {
  const configuration = device.configuration
  const interfaces = (configuration?.interfaces ?? []).map((iface) => ({
    interfaceClass: iface.alternate?.interfaceClass ?? 0,
    interfaceSubClass: iface.alternate?.interfaceSubclass ?? 0,
    interfaceProtocol: iface.alternate?.interfaceProtocol ?? 0,
  }))
  return {
    deviceId,
    busNum: 0,
    devNum: 0,
    speed: inferSpeed(device),
    vendorId: device.vendorId,
    productId: device.productId,
    bcdDevice:
      (device.deviceVersionMajor << 8) |
      (device.deviceVersionMinor << 4) |
      device.deviceVersionSubminor,
    deviceClass: device.deviceClass,
    deviceSubClass: device.deviceSubclass,
    deviceProtocol: device.deviceProtocol,
    configurationValue: configuration?.configurationValue ?? 0,
    numConfigurations: device.configurations.length,
    interfaces,
    serial: device.serialNumber ?? '',
    product: device.productName ?? '',
  }
}

const REQUEST_TYPES: USBRequestType[] = ['standard', 'class', 'vendor']
const RECIPIENTS: USBRecipient[] = ['device', 'interface', 'endpoint', 'other']

function parseSetup(setup: Uint8Array): USBControlTransferParameters {
  const bmRequestType = setup[0]
  return {
    requestType: REQUEST_TYPES[(bmRequestType >> 5) & 0x03] ?? 'vendor',
    recipient: RECIPIENTS[bmRequestType & 0x1f] ?? 'other',
    request: setup[1],
    value: setup[2] | (setup[3] << 8),
    index: setup[4] | (setup[5] << 8),
  }
}

export interface UrbResult {
  status: number
  actualLength: number
  inData: Uint8Array
}

// Linux URB completion status conventions (negative errno) the usbip-server
// translates back to the remote client.
const URB_OK = 0
const URB_EPIPE = -32 // stalled endpoint
const URB_EOVERFLOW = -75 // babble / buffer overrun
const URB_EPROTO = -71 // transport or protocol failure

const EMPTY = new Uint8Array(0)

function mapTransferStatus(status: USBTransferStatus | undefined): number {
  switch (status) {
    case 'ok':
      return URB_OK
    case 'stall':
      return URB_EPIPE
    case 'babble':
      return URB_EOVERFLOW
    default:
      return URB_EPROTO
  }
}

function toBytes(data: DataView | undefined): Uint8Array {
  if (!data) return EMPTY
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
}

// Protobuf decodes `bytes` to Uint8Array<ArrayBufferLike>, but WebUSB transfer
// methods require an ArrayBuffer-backed view. Re-wrap into a plain ArrayBuffer.
function outBuffer(data: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(data)
}

// Standard control requests the importing kernel issues during enumeration and
// that a client issues when it opens the interface. WebUSB reserves these for
// its own high-level methods and rejects them with a SecurityError ("The
// transfer was not allowed") when sent through controlTransferOut, so forwarding
// them raw makes the kernel's SET_CONFIGURATION fail and the remote device drop
// off the bus. Translate each into its WebUSB equivalent instead.
const USB_REQUEST_CLEAR_FEATURE = 0x01
const USB_REQUEST_SET_CONFIGURATION = 0x09
const USB_REQUEST_SET_INTERFACE = 0x0b
const USB_FEATURE_ENDPOINT_HALT = 0x00

async function handleManagedControlOut(
  device: USBDevice,
  params: USBControlTransferParameters,
): Promise<UrbResult | null> {
  if (params.requestType !== 'standard') {
    return null
  }
  if (params.recipient === 'device' && params.request === USB_REQUEST_SET_CONFIGURATION) {
    await applyConfiguration(device, params.value & 0xff)
    return { status: URB_OK, actualLength: 0, inData: EMPTY }
  }
  if (params.recipient === 'interface' && params.request === USB_REQUEST_SET_INTERFACE) {
    await device.selectAlternateInterface(params.index & 0xff, params.value & 0xff)
    return { status: URB_OK, actualLength: 0, inData: EMPTY }
  }
  if (
    params.recipient === 'endpoint' &&
    params.request === USB_REQUEST_CLEAR_FEATURE &&
    (params.value & 0xff) === USB_FEATURE_ENDPOINT_HALT
  ) {
    const direction: USBDirection = (params.index & 0x80) !== 0 ? 'in' : 'out'
    await device.clearHalt(direction, params.index & 0x0f)
    return { status: URB_OK, actualLength: 0, inData: EMPTY }
  }
  return null
}

async function applyConfiguration(device: USBDevice, configurationValue: number): Promise<void> {
  if (device.configuration?.configurationValue === configurationValue) {
    return
  }
  await Promise.all(
    (device.configuration?.interfaces ?? [])
      .filter((iface) => iface.claimed)
      .map((iface) => device.releaseInterface(iface.interfaceNumber).catch(() => {})),
  )
  await device.selectConfiguration(configurationValue)
  await Promise.all(
    (device.configuration?.interfaces ?? []).map((iface) =>
      device.claimInterface(iface.interfaceNumber).catch(() => {}),
    ),
  )
}

export async function executeUrb(device: USBDevice, req: USBURBRequest): Promise<UrbResult> {
  try {
    // Bulk/interrupt URBs carry an all-zero 8-byte setup field over the wire as
    // well, so the transfer type must be keyed off the endpoint number, not the
    // setup length.
    const endpointNumber = req.endpoint & 0x0f
    if (endpointNumber === 0) {
      const params = parseSetup(req.setup)
      if ((req.setup[0] & 0x80) !== 0) {
        const result = await device.controlTransferIn(params, req.transferBufferLength)
        const inData = toBytes(result.data)
        return { status: mapTransferStatus(result.status), actualLength: inData.length, inData }
      }
      const managed = await handleManagedControlOut(device, params)
      if (managed) {
        return managed
      }
      const result = await device.controlTransferOut(params, outBuffer(req.outData))
      return {
        status: mapTransferStatus(result.status),
        actualLength: result.bytesWritten,
        inData: EMPTY,
      }
    }

    if (req.numberOfPackets > 0) {
      console.warn('[usbip] isochronous transfers are not supported')
      return { status: URB_EPROTO, actualLength: 0, inData: EMPTY }
    }

    if (req.directionIn) {
      const result = await device.transferIn(endpointNumber, req.transferBufferLength)
      const inData = toBytes(result.data)
      return { status: mapTransferStatus(result.status), actualLength: inData.length, inData }
    }
    const result = await device.transferOut(endpointNumber, outBuffer(req.outData))
    return {
      status: mapTransferStatus(result.status),
      actualLength: result.bytesWritten,
      inData: EMPTY,
    }
  } catch (error) {
    console.error('[usbip] URB transfer failed', error)
    return { status: URB_EPROTO, actualLength: 0, inData: EMPTY }
  }
}
