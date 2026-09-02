import type { Device } from '../engine/types'
import type { IconName } from '../components/Icon'

/* Shared device presentation logic. Lives here rather than in a route file so
   both the list and the detail screen can import it without coupling to
   expo-router's file tree. */

export type DeviceTone = 'safe' | 'caution' | 'threat' | 'muted'

export function deviceTone(d: Device): DeviceTone {
  if (d.trust === 'trusted') return 'safe'
  if (d.trust === 'flagged') return 'threat'
  if (d.signals.includes('camera-oui') && d.signals.includes('streaming')) return 'threat'
  if (d.signals.includes('travelling')) return 'threat'
  if (d.signals.includes('camera-oui') || d.signals.includes('findmy')) return 'caution'
  if (d.signals.includes('tracker-proto') || d.signals.includes('hidden-ssid')) return 'caution'
  return 'muted'
}

export const KIND_ICON: Record<Device['kind'], IconName> = {
  'wifi-ap':        'wifi',
  'wifi-sta':       'wifi',
  'ble-tag':        'tag',
  'ble-peripheral': 'bluetooth',
  'rf-emitter':     'radio',
}

export const KIND_LABEL: Record<Device['kind'], string> = {
  'wifi-ap':        'Wi-Fi access point',
  'wifi-sta':       'Wi-Fi station',
  'ble-tag':        'BLE tracker tag',
  'ble-peripheral': 'BLE peripheral',
  'rf-emitter':     'RF emitter',
}

/** Human-readable label for each evidence signal. */
export const SIGNAL_LABEL: Record<Device['signals'][number], string> = {
  'camera-oui':    'Camera OUI',
  'streaming':     'Sustained streaming',
  'rtsp-open':     'RTSP port open',
  'mdns-camera':   'mDNS camera record',
  'findmy':        'Apple FindMy',
  'tracker-proto': 'Tracker protocol',
  'travelling':    'Co-moving with you',
  'low-variance':  'Fixed distance',
  'hidden-ssid':   'Hidden SSID',
  'new-tonight':   'New tonight',
}

/** Signals that on their own justify an accent-coloured pill. */
export const STRONG_SIGNALS = new Set(['camera-oui', 'streaming', 'rtsp-open', 'travelling', 'findmy'])
