import { create } from 'zustand'
import { fuse } from './fusion'
import { buildDevices, driftDevices, nextFrame, placeFor, seedFrames } from './simulator'
import type {
  Device, HardwareState, Incident, Prefs, ScanSession,
  Scenario, SensorFrame, Trust, Verdict,
} from './types'

export interface State {
  place: string
  hw: HardwareState
  devices: Device[]
  frames: SensorFrame[]
  verdict: Verdict
  incidents: Incident[]
  sessions: ScanSession[]
  prefs: Prefs
}

const FRAME_CAP = 240

const DEFAULT_PREFS: Prefs = {
  sensitivity: 'balanced',
  channels: { oled: true, haptic: true, buzzer: true, push: true },
  darkBoost: true,
  autoDeepScan: false,
  passiveOnly: true,
  scenario: 'camera',
  scanning: true,
}

const DEFAULT_HW: HardwareState = {
  connected: true,
  linkRssi: -54,
  batteryPct: 78,
  charging: false,
  temperatureC: 33.4,
  firmware: 'PG1-1.0.4',
  modelVersion: 'PG-1 Rev B',
  storageUsedPct: 22,
  uptimeSec: 3614,
  serial: 'PG1B-20241107-0032',
}

function seedHistory(now: number): { incidents: Incident[]; sessions: ScanSession[] } {
  const h = 3_600_000
  return {
    incidents: [
      {
        id: 'inc-1',
        startedAt: now - 26 * h,
        endedAt: now - 25.2 * h,
        klass: 'threat',
        peakScore: 84,
        place: 'Hotel room 412',
        reasons: [],
        deviceIds: ['camera-0'],
        acknowledged: false,
      },
      {
        id: 'inc-2',
        startedAt: now - 51 * h,
        endedAt: now - 50.5 * h,
        klass: 'caution',
        peakScore: 47,
        place: 'Route 3 · in transit',
        reasons: [],
        deviceIds: ['tracker-0'],
        acknowledged: true,
      },
    ],
    sessions: [
      {
        id: 'sess-1',
        place: 'Hotel room 412',
        startedAt: now - 26 * h,
        durationSec: 2847,
        devicesSeen: 8,
        peakScore: 84,
        klass: 'threat',
        verdictNote: 'Hikvision OUI at −34 dBm streaming H.264. Port 554 open. Confidence 91%.',
      },
      {
        id: 'sess-2',
        place: 'Route 3 · in transit',
        startedAt: now - 51 * h,
        durationSec: 1140,
        devicesSeen: 4,
        peakScore: 47,
        klass: 'caution',
        verdictNote: 'Apple FindMy advertisement seen across 4 km of transit. No camera signals.',
      },
      {
        id: 'sess-3',
        place: 'Home · Chandausi',
        startedAt: now - 74 * h,
        durationSec: 5400,
        devicesSeen: 7,
        peakScore: 12,
        klass: 'safe',
        verdictNote: 'All radios on the trusted list. RF and EMF at baseline.',
      },
      {
        id: 'sess-4',
        place: 'Gate 4B · IGI T3',
        startedAt: now - 100 * h,
        durationSec: 900,
        devicesSeen: 21,
        peakScore: 29,
        klass: 'safe',
        verdictNote: 'High device density — 21 radios — but no camera or tracker signals.',
      },
    ],
  }
}

function buildInitialState(): State {
  const now = Date.now()
  const prefs = DEFAULT_PREFS
  const devices = buildDevices(prefs.scenario, now)
  const frames = seedFrames(prefs.scenario, now)
  const verdict = fuse(devices, frames, now, prefs.sensitivity)
  const history = seedHistory(now)
  return {
    place: placeFor(prefs.scenario),
    hw: DEFAULT_HW,
    devices,
    frames,
    verdict,
    prefs,
    ...history,
  }
}

export const useStore = create<State>(() => buildInitialState())

const get = useStore.getState
const set = useStore.setState

/* ── Actions ─────────────────────────────────────────────────────────────── */

export const actions = {
  setPrefs(patch: Partial<Prefs>) {
    const prefs = { ...get().prefs, ...patch }
    const s = get()
    set({ prefs, verdict: fuse(s.devices, s.frames, Date.now(), prefs.sensitivity) })
  },

  setScenario(scenario: Scenario) {
    const now = Date.now()
    const devices = buildDevices(scenario, now)
    const frames = seedFrames(scenario, now)
    const s = get()
    const prefs = { ...s.prefs, scenario }
    set({ prefs, devices, frames, place: placeFor(scenario), verdict: fuse(devices, frames, now, prefs.sensitivity) })
  },

  setTrust(id: string, trust: Trust) {
    const s = get()
    const devices = s.devices.map((d) => (d.id === id ? { ...d, trust } : d))
    set({ devices, verdict: fuse(devices, s.frames, Date.now(), s.prefs.sensitivity) })
  },

  toggleScanning() {
    actions.setPrefs({ scanning: !get().prefs.scanning })
  },
}

/* ── Telemetry loop ──────────────────────────────────────────────────────── */

let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  const s = get()
  if (!s.prefs.scanning) return
  const now = Date.now()
  const last = s.frames[s.frames.length - 1]
  const f1 = nextFrame(s.prefs.scenario, last, now - 500)
  const f2 = nextFrame(s.prefs.scenario, f1, now)
  const frames = [...s.frames, f1, f2].slice(-FRAME_CAP)
  const devices = driftDevices(s.devices, now)
  set({
    frames,
    devices,
    verdict: fuse(devices, frames, now, s.prefs.sensitivity),
    hw: { ...s.hw, uptimeSec: s.hw.uptimeSec + 1, linkRssi: Math.round(-54 + (Math.random() - 0.5) * 6) },
  })
}

export function startTelemetry() {
  if (timer !== null) return () => stopTelemetry()
  timer = setInterval(tick, 1000)
  return () => stopTelemetry()
}

export function stopTelemetry() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}
