/* ============================================================================
   PRIVACYGLASS · ENVIRONMENT SIMULATOR
   ----------------------------------------------------------------------------
   Stands in for the BLE link to the glasses until the PG-1 firmware lands.
   It produces the *exact* payload shape the firmware will emit, so swapping the
   simulator for a real `BluetoothRemoteGATTCharacteristic` is a one-file change
   (see docs/04-ble-protocol.md).

   Five scenarios double as the viva demo script — each one is a scripted room
   with a defensible ground truth, so the examiner can watch the fusion engine
   reach a conclusion and check its working.
   ========================================================================== */

import type {
  Device,
  DeviceKind,
  DeviceSignal,
  Scenario,
  ScenarioMeta,
  SensorFrame,
} from './types'

/* ── Deterministic RNG so demos are reproducible ─────────────────────────── */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'baseline',
    name: 'Home baseline',
    place: 'Home · Chandausi',
    blurb: 'Learned environment. Every radio here is on the trusted list.',
  },
  {
    id: 'crowded',
    name: 'Crowded public',
    place: 'Gate 4B · IGI T3',
    blurb: 'Twenty-plus radios, none hostile. The false-positive stress test.',
  },
  {
    id: 'camera',
    name: 'Hidden camera',
    place: 'Hotel room 412',
    blurb: 'Camera OUI + H.264-shaped stream + 6 lux. The flagship detection.',
  },
  {
    id: 'tracker',
    name: 'Tracker following',
    place: 'Route 3 · in transit',
    blurb: 'An unpaired FindMy tag riding with you across four stops.',
  },
  {
    id: 'bug',
    name: 'RF bug',
    place: 'Meeting room 2',
    blurb: 'A carrier with no packet identity. Only RF and EMF can see it.',
  },
]

/* ── Device blueprints per scenario ──────────────────────────────────────── */

interface Blueprint {
  mac: string
  vendor: string
  label: string | null
  kind: DeviceKind
  rssi: number
  channel: number | null
  throughputKbps: number
  openPorts: number[]
  signals: DeviceSignal[]
  trusted?: boolean
  ageMin?: number
}

const HOME: Blueprint[] = [
  { mac: 'AC:84:C6:1D:90:4E', vendor: 'TP-Link Router', label: 'Verma_5G', kind: 'wifi-ap', rssi: -41, channel: 36, throughputKbps: 120, openPorts: [80, 443], signals: [], trusted: true },
  { mac: 'A4:83:E7:22:B0:71', vendor: 'Apple, Inc.', label: "Rushali's iPhone", kind: 'wifi-sta', rssi: -48, channel: 36, throughputKbps: 210, openPorts: [], signals: [], trusted: true },
  { mac: '5C:A6:E6:41:2C:88', vendor: 'Samsung Electronics', label: 'Living-room TV', kind: 'wifi-sta', rssi: -62, channel: 6, throughputKbps: 640, openPorts: [8009], signals: [], trusted: true },
  { mac: 'E4:5F:01:9A:33:07', vendor: 'Sonoff / ITEAD', label: 'Porch light', kind: 'wifi-sta', rssi: -71, channel: 6, throughputKbps: 4, openPorts: [], signals: [], trusted: true },
  { mac: 'B8:27:EB:5C:1A:22', vendor: 'Raspberry Pi Foundation', label: 'pihole.local', kind: 'wifi-sta', rssi: -55, channel: 36, throughputKbps: 30, openPorts: [53, 80], signals: [], trusted: true },
  { mac: '6E:11:D4:8A:04:F2', vendor: 'Apple, Inc.', label: 'AirPods Pro', kind: 'ble-peripheral', rssi: -58, channel: null, throughputKbps: 0, openPorts: [], signals: ['low-variance'], trusted: true },
  { mac: 'C8:3A:35:77:19:B6', vendor: 'Tenda Technology', label: 'Neighbour_2.4', kind: 'wifi-ap', rssi: -84, channel: 11, throughputKbps: 0, openPorts: [], signals: [] },
]

const CROWD: Blueprint[] = [
  ...HOME.slice(1, 3),
  { mac: '30:B5:C2:00:41:19', vendor: 'TP-Link Router', label: 'Airport_Free_WiFi', kind: 'wifi-ap', rssi: -52, channel: 1, throughputKbps: 900, openPorts: [80, 443], signals: [] },
  { mac: '3C:5C:C4:9E:D1:07', vendor: 'Amazon Technologies', label: null, kind: 'wifi-sta', rssi: -66, channel: 1, throughputKbps: 88, openPorts: [], signals: [] },
  { mac: '88:36:6C:12:77:AA', vendor: 'OnePlus Technology', label: null, kind: 'wifi-sta', rssi: -70, channel: 1, throughputKbps: 45, openPorts: [], signals: [] },
  { mac: '48:E1:5C:60:B2:31', vendor: 'Realme Chongqing', label: null, kind: 'wifi-sta', rssi: -74, channel: 6, throughputKbps: 12, openPorts: [], signals: [] },
  { mac: 'F0:B4:29:AB:55:9C', vendor: 'Xiaomi Communications', label: null, kind: 'wifi-sta', rssi: -79, channel: 6, throughputKbps: 8, openPorts: [], signals: [] },
  { mac: '2E:9F:04:C1:80:5B', vendor: 'Randomised', label: 'Galaxy Buds', kind: 'ble-peripheral', rssi: -61, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: '5A:11:B8:2F:C0:04', vendor: 'Randomised', label: null, kind: 'ble-peripheral', rssi: -77, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: '7A:C3:19:44:E1:90', vendor: 'Randomised', label: 'Mi Band 8', kind: 'ble-peripheral', rssi: -69, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: '90:8C:43:11:2B:66', vendor: 'Tile Inc.', label: 'Tile Mate', kind: 'ble-tag', rssi: -81, channel: null, throughputKbps: 0, openPorts: [], signals: ['tracker-proto'], ageMin: 1 },
  { mac: 'DC:A6:32:04:71:C9', vendor: 'Raspberry Pi Trading', label: null, kind: 'wifi-sta', rssi: -83, channel: 11, throughputKbps: 3, openPorts: [22], signals: [] },
  { mac: '9E:44:2A:B7:03:1D', vendor: 'Randomised', label: null, kind: 'ble-peripheral', rssi: -88, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: 'C2:70:8F:19:AA:34', vendor: 'Randomised', label: null, kind: 'ble-peripheral', rssi: -85, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: '00:1A:11:5D:E0:44', vendor: 'Google, Inc.', label: 'Nest_Guest', kind: 'wifi-ap', rssi: -76, channel: 11, throughputKbps: 60, openPorts: [], signals: ['hidden-ssid'] },
]

const HOTEL_CAM: Blueprint[] = [
  { mac: '30:B5:C2:71:04:8E', vendor: 'TP-Link Router', label: 'Novotel_Guest', kind: 'wifi-ap', rssi: -47, channel: 6, throughputKbps: 340, openPorts: [80, 443], signals: [] },
  { mac: 'D8:A0:1D:A1:B2:C3', vendor: 'Hikvision', label: null, kind: 'wifi-sta', rssi: -34, channel: 6, throughputKbps: 412, openPorts: [554, 8000], signals: ['camera-oui', 'streaming', 'rtsp-open', 'new-tonight'] },
  { mac: 'A4:83:E7:22:B0:71', vendor: 'Apple, Inc.', label: "Rushali's iPhone", kind: 'wifi-sta', rssi: -44, channel: 6, throughputKbps: 180, openPorts: [], signals: [], trusted: true },
  { mac: 'E0:62:67:31:9A:05', vendor: 'ESP32-CAM module', label: null, kind: 'wifi-ap', rssi: -58, channel: 1, throughputKbps: 96, openPorts: [80], signals: ['camera-oui', 'hidden-ssid'] },
  { mac: '78:11:DC:04:C2:71', vendor: 'Xiaomi Mijia Cam', label: null, kind: 'wifi-sta', rssi: -72, channel: 11, throughputKbps: 18, openPorts: [], signals: ['camera-oui'] },
  { mac: '6E:11:D4:8A:04:F2', vendor: 'Apple, Inc.', label: 'AirPods Pro', kind: 'ble-peripheral', rssi: -57, channel: null, throughputKbps: 0, openPorts: [], signals: ['low-variance'], trusted: true },
  { mac: 'BA:5C:19:07:D3:41', vendor: 'Randomised', label: null, kind: 'ble-peripheral', rssi: -80, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: 'C8:3A:35:19:70:B2', vendor: 'Tenda Technology', label: 'Room_413', kind: 'wifi-ap', rssi: -81, channel: 11, throughputKbps: 20, openPorts: [], signals: [] },
]

const TRACKER: Blueprint[] = [
  { mac: 'D0:03:4B:88:1C:29', vendor: 'Apple AirTag', label: null, kind: 'ble-tag', rssi: -52, channel: null, throughputKbps: 0, openPorts: [], signals: ['findmy', 'travelling', 'low-variance'], ageMin: 17 },
  { mac: 'A4:83:E7:22:B0:71', vendor: 'Apple, Inc.', label: "Rushali's iPhone", kind: 'wifi-sta', rssi: -42, channel: null, throughputKbps: 120, openPorts: [], signals: [], trusted: true },
  { mac: '6E:11:D4:8A:04:F2', vendor: 'Apple, Inc.', label: 'AirPods Pro', kind: 'ble-peripheral', rssi: -56, channel: null, throughputKbps: 0, openPorts: [], signals: ['low-variance'], trusted: true },
  { mac: '9E:22:71:B0:4C:18', vendor: 'Randomised', label: null, kind: 'ble-peripheral', rssi: -84, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: '30:B5:C2:AA:19:04', vendor: 'TP-Link Router', label: 'Metro_WiFi', kind: 'wifi-ap', rssi: -68, channel: 1, throughputKbps: 210, openPorts: [], signals: [] },
  { mac: '5A:0C:B3:71:20:9F', vendor: 'Randomised', label: null, kind: 'ble-peripheral', rssi: -90, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
]

const BUG: Blueprint[] = [
  { mac: 'AC:84:C6:00:12:7B', vendor: 'TP-Link Router', label: 'Corp_Guest', kind: 'wifi-ap', rssi: -51, channel: 36, throughputKbps: 180, openPorts: [], signals: [], trusted: true },
  { mac: 'A4:83:E7:22:B0:71', vendor: 'Apple, Inc.', label: "Rushali's iPhone", kind: 'wifi-sta', rssi: -45, channel: 36, throughputKbps: 90, openPorts: [], signals: [], trusted: true },
  { mac: '2C:F0:5D:71:04:AA', vendor: 'Micro-Star INTL', label: 'Conf-Laptop', kind: 'wifi-sta', rssi: -59, channel: 36, throughputKbps: 300, openPorts: [], signals: [], trusted: true },
  { mac: '—', vendor: 'Unidentified carrier', label: '433.9 MHz emitter', kind: 'rf-emitter', rssi: -31, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
  { mac: '7A:31:0C:9D:44:B1', vendor: 'Randomised', label: null, kind: 'ble-peripheral', rssi: -79, channel: null, throughputKbps: 0, openPorts: [], signals: [] },
]

const BLUEPRINTS: Record<Scenario, Blueprint[]> = {
  baseline: HOME,
  crowded: CROWD,
  camera: HOTEL_CAM,
  tracker: TRACKER,
  bug: BUG,
}

/** Per-scenario sensor envelope: [rf dBm, emf mG, lux]. */
const ENVELOPE: Record<Scenario, { rf: number; rfJitter: number; emf: number; lux: number }> = {
  baseline: { rf: -71, rfJitter: 3, emf: 0.6, lux: 240 },
  crowded: { rf: -57, rfJitter: 5, emf: 1.4, lux: 420 },
  camera: { rf: -37, rfJitter: 6, emf: 3.1, lux: 6 },
  tracker: { rf: -63, rfJitter: 4, emf: 0.9, lux: 90 },
  bug: { rf: -39, rfJitter: 3, emf: 6.4, lux: 180 },
}

export function buildDevices(scenario: Scenario, now: number): Device[] {
  const rnd = mulberry32(scenario.length * 7919 + 13)
  return BLUEPRINTS[scenario].map((b, i) => {
    const ageMs = (b.ageMin ?? 4 + rnd() * 90) * 60_000
    const trail = Array.from({ length: 40 }, (_, k) => {
      const drift = b.signals.includes('low-variance') || b.signals.includes('travelling')
        ? (rnd() - 0.5) * 4
        : (rnd() - 0.5) * 16 + Math.sin(k / 5) * 3
      return Math.round(b.rssi + drift)
    })
    return {
      id: `${scenario}-${i}`,
      kind: b.kind,
      mac: b.mac,
      macRandomised: b.vendor === 'Randomised',
      vendor: b.vendor,
      oui: b.mac.slice(0, 8),
      label: b.label,
      rssi: b.rssi,
      rssiTrail: trail,
      channel: b.channel,
      firstSeen: now - ageMs,
      lastSeen: now,
      throughputKbps: b.throughputKbps,
      openPorts: b.openPorts,
      trust: b.trusted ? 'trusted' : 'unknown',
      signals: b.signals,
    }
  })
}

export function seedFrames(scenario: Scenario, now: number, count = 120): SensorFrame[] {
  const env = ENVELOPE[scenario]
  const rnd = mulberry32(scenario.length * 104729 + 7)
  const devices = BLUEPRINTS[scenario]
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - i) * 500
    return {
      t,
      rfDbm: env.rf + (rnd() - 0.5) * env.rfJitter * 2 + Math.sin(i / 9) * 1.6,
      emfMg: Math.max(0.1, env.emf + (rnd() - 0.5) * env.emf * 0.4),
      lux: Math.max(1, env.lux * (0.9 + rnd() * 0.2)),
      wifiCount: devices.filter((d) => d.kind.startsWith('wifi')).length,
      bleCount: devices.filter((d) => d.kind.startsWith('ble')).length,
    }
  })
}

export function nextFrame(scenario: Scenario, prev: SensorFrame | undefined, t: number): SensorFrame {
  const env = ENVELOPE[scenario]
  const j = (Math.random() - 0.5) * env.rfJitter * 2
  // First-order smoothing keeps the trace organic rather than noisy static.
  const rf = prev ? prev.rfDbm * 0.72 + (env.rf + j) * 0.28 : env.rf + j
  const emf = prev
    ? Math.max(0.1, prev.emfMg * 0.8 + (env.emf + (Math.random() - 0.5) * env.emf * 0.5) * 0.2)
    : env.emf
  const lux = prev
    ? Math.max(1, prev.lux * 0.94 + env.lux * (0.94 + Math.random() * 0.12) * 0.06)
    : env.lux
  const devices = BLUEPRINTS[scenario]
  return {
    t,
    rfDbm: rf,
    emfMg: emf,
    lux,
    wifiCount: devices.filter((d) => d.kind.startsWith('wifi')).length,
    bleCount: devices.filter((d) => d.kind.startsWith('ble')).length,
  }
}

/** Walk RSSI one step; trackers hold steady, room devices wander. */
export function driftDevices(devices: Device[], now: number): Device[] {
  return devices.map((d) => {
    const sticky = d.signals.includes('travelling') || d.signals.includes('low-variance')
    const step = (Math.random() - 0.5) * (sticky ? 2.4 : 7)
    const rssi = Math.round(Math.min(-24, Math.max(-95, d.rssi + step)))
    const trail = d.rssiTrail.length >= 40 ? d.rssiTrail.slice(1) : d.rssiTrail.slice()
    trail.push(rssi)
    return { ...d, rssi, rssiTrail: trail, lastSeen: now }
  })
}

export function placeFor(scenario: Scenario) {
  return SCENARIOS.find((s) => s.id === scenario)!.place
}
