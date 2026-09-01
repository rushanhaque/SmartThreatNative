/* ============================================================================
   PRIVACYGLASS · DOMAIN MODEL
   Mirrors the PG-1 firmware data contract (see docs/04-ble-protocol.md).
   Every field here has a real counterpart on the ESP32-S3 / nRF52840 side.
   ========================================================================== */

export type ThreatClass = 'safe' | 'caution' | 'threat'

export type Radio = 'wifi' | 'ble' | 'rf'

export type DeviceKind =
  | 'wifi-ap' // beaconing access point
  | 'wifi-sta' // associated station seen in promiscuous mode
  | 'ble-tag' // FindMy / Tile / SmartTag / iTag
  | 'ble-peripheral' // headphones, watches, generic BLE
  | 'rf-emitter' // narrowband source with no packet identity

export type Trust = 'unknown' | 'trusted' | 'flagged'

/** A single radio-visible entity in the environment. */
export interface Device {
  id: string
  kind: DeviceKind
  /** Locally-administered MACs are randomised by the OS; we surface that. */
  mac: string
  macRandomised: boolean
  vendor: string
  /** OUI prefix, e.g. "FC:2F:40" */
  oui: string
  label: string | null
  rssi: number
  /** Last 40 RSSI samples, newest last. Drives the trend sparkline. */
  rssiTrail: number[]
  channel: number | null
  firstSeen: number
  lastSeen: number
  /** Sustained throughput estimate in kbps (packet-length variance method). */
  throughputKbps: number
  openPorts: number[]
  trust: Trust
  signals: DeviceSignal[]
}

/** Evidence attached to a device. These are what the fusion engine reads. */
export type DeviceSignal =
  | 'camera-oui' // vendor OUI in the known camera list
  | 'streaming' // >300 kbps sustained for >20 s
  | 'rtsp-open' // port 554 / 8000 answered
  | 'mdns-camera' // _camera / _rtsp service record
  | 'findmy' // Apple FindMy advertisement (0x004C / 0x00E0)
  | 'tracker-proto' // Tile / Chipolo / SmartTag / iTag
  | 'travelling' // co-moving with the wearer
  | 'low-variance' // RSSI variance < 15 dB → fixed distance → in your bag
  | 'hidden-ssid'
  | 'new-tonight'

/** One 500 ms sensor sample from the glasses. */
export interface SensorFrame {
  t: number
  /** AD8318 RF power detector, dBm. Baseline ≈ -70. */
  rfDbm: number
  /** DIY coil + LM358, milligauss. Background ≈ 0.4–1.5 mG. */
  emfMg: number
  /** BH1750 ambient light, lux. < 15 lux = dark. */
  lux: number
  wifiCount: number
  bleCount: number
}

/** A weighted piece of reasoning behind the current score. */
export interface Reason {
  code: ReasonCode
  channel: FusionChannel
  title: string
  detail: string
  /** 0–1 contribution *within* its channel. */
  strength: number
  deviceId?: string
}

export type ReasonCode =
  | 'CAM_OUI'
  | 'CAM_STREAM'
  | 'CAM_PORT'
  | 'TRK_FINDMY'
  | 'TRK_TRAVEL'
  | 'TRK_VARIANCE'
  | 'RF_SPIKE'
  | 'RF_SUSTAIN'
  | 'EMF_HIGH'
  | 'DARK_ROOM'
  | 'DEV_DENSITY'

export type FusionChannel = 'camera' | 'tracker' | 'rf' | 'emf' | 'dark'

/** Per-channel breakdown — rendered as the Evidence Stack. */
export interface FusionBreakdown {
  camera: number
  tracker: number
  rf: number
  emf: number
  dark: number
}

export interface Verdict {
  /** 0–100 */
  score: number
  klass: ThreatClass
  /** Model confidence 0–1 (RandomForest probability of the chosen class). */
  confidence: number
  breakdown: FusionBreakdown
  reasons: Reason[]
  at: number
}

/** A contiguous period at elevated threat — what the user reviews later. */
export interface Incident {
  id: string
  startedAt: number
  endedAt: number | null
  klass: ThreatClass
  peakScore: number
  place: string
  reasons: Reason[]
  deviceIds: string[]
  acknowledged: boolean
}

export interface ScanSession {
  id: string
  place: string
  startedAt: number
  durationSec: number
  devicesSeen: number
  peakScore: number
  klass: ThreatClass
  verdictNote: string
}

/** Glasses hardware telemetry. */
export interface HardwareState {
  connected: boolean
  linkRssi: number
  batteryPct: number
  charging: boolean
  temperatureC: number
  firmware: string
  modelVersion: string
  storageUsedPct: number
  uptimeSec: number
  serial: string
}

export type Scenario = 'baseline' | 'crowded' | 'camera' | 'tracker' | 'bug'

export interface ScenarioMeta {
  id: Scenario
  name: string
  place: string
  blurb: string
}

export type AlertChannel = 'oled' | 'haptic' | 'buzzer' | 'push'

export interface Prefs {
  sensitivity: 'low' | 'balanced' | 'high'
  channels: Record<AlertChannel, boolean>
  darkBoost: boolean
  autoDeepScan: boolean
  passiveOnly: boolean
  scenario: Scenario
  scanning: boolean
}
