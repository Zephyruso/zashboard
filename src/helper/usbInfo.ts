// USB descriptor formatting helpers — ported from sing-box-dashboard
// (src/lib/usbInfo.ts).

// USB-IF base class codes (bDeviceClass / bInterfaceClass).
const USB_CLASS_NAMES: Record<number, string> = {
  0x01: 'Audio',
  0x02: 'CDC Control',
  0x03: 'HID',
  0x05: 'Physical',
  0x06: 'Image',
  0x07: 'Printer',
  0x08: 'Mass Storage',
  0x09: 'Hub',
  0x0a: 'CDC Data',
  0x0b: 'Smart Card',
  0x0d: 'Content Security',
  0x0e: 'Video',
  0x0f: 'Personal Healthcare',
  0x10: 'Audio/Video',
  0x11: 'Billboard',
  0x12: 'USB-C Bridge',
  0xdc: 'Diagnostic',
  0xe0: 'Wireless',
  0xef: 'Miscellaneous',
  0xfe: 'Application Specific',
  0xff: 'Vendor Specific',
}

const hex2 = (value: number) => `0x${value.toString(16).padStart(2, '0')}`

// Returns undefined for class 0 ("defined at interface level") so callers can special-case it.
export function usbClassName(code: number): string | undefined {
  return code === 0 ? undefined : (USB_CLASS_NAMES[code] ?? hex2(code))
}

// "Mass Storage · 0x06 · 0x50" — the class name (or hex) plus sub/protocol when either is set.
export function usbClassTriplet(cls: number, sub: number, proto: number): string {
  const name = usbClassName(cls) ?? hex2(cls)
  return sub > 0 || proto > 0 ? `${name} · ${hex2(sub)} · ${hex2(proto)}` : name
}

// Linux USB_SPEED_* constants (the same values webusb.ts inferSpeed emits):
// 1 low, 2 full, 3 high, 4 wireless, 5 super, 6 super-plus.
const USB_SPEED_LABELS: Record<number, string> = {
  1: 'Low Speed',
  2: 'Full Speed',
  3: 'High Speed',
  4: 'Wireless',
  5: 'SuperSpeed',
  6: 'SuperSpeed+',
}

export function usbSpeedLabel(code: number): string | undefined {
  return USB_SPEED_LABELS[code]
}

// bcdDevice is BCD-encoded: 0x0210 → "2.10" (inverse of buildDescriptor's packing).
export function bcdToVersion(bcd: number): string {
  return `${(bcd >> 8) & 0xff}.${(bcd >> 4) & 0x0f}${bcd & 0x0f}`
}
