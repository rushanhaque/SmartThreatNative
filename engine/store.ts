import { AppState } from 'react-native'
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
  deepScan: DeepScanState
}

export interface DeepScanState {
  running: boolean
  /** 0-1 */
  progress: number
  startedAt: number | null
}

const FRAME_CAP = 240

/** How long a deep sweep runs, in ms. */
export const DEEP_SCAN_MS = 6000

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
    deepScan: { running: false, progress: 0, startedAt: null },
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

  /* ── Deep scan ──────────────────────────────────────────────────────────
     A timed sweep that records what it saw. History has always invited the
     user to "run a deep scan"; this is the action behind that sentence.
     Returns a canceller so a screen unmounting mid-scan cannot leak. */
  startDeepScan(onDone?: (session: ScanSession) => void) {
    if (get().deepScan.running) return () => {}

    const startedAt = Date.now()
    const DURATION = DEEP_SCAN_MS
    let peak = get().verdict.score
    let peakKlass = get().verdict.klass

    set({ deepScan: { running: true, progress: 0, startedAt } })

    const step = setInterval(() => {
      const s = get()
      const elapsed = Date.now() - startedAt
      // Track the worst reading observed across the whole sweep, which is the
      // number worth recording — not whatever happened to be on screen at the end.
      if (s.verdict.score > peak) {
        peak = s.verdict.score
        peakKlass = s.verdict.klass
      }
      set({
        deepScan: { running: true, progress: Math.min(1, elapsed / DURATION), startedAt },
      })

      if (elapsed >= DURATION) {
        clearInterval(step)
        const s2 = get()
        const session: ScanSession = {
          id: `sess-${startedAt}`,
          place: s2.place,
          startedAt,
          durationSec: Math.round(DURATION / 1000),
          devicesSeen: s2.devices.length,
          peakScore: Math.round(peak),
          klass: peakKlass,
          verdictNote: `Deep sweep of ${s2.devices.length} radios. Peak ${Math.round(peak)}.`,
        }
        set({
          sessions: [session, ...s2.sessions],
          deepScan: { running: false, progress: 1, startedAt: null },
        })
        onDone?.(session)
      }
    }, 120)

    return () => {
      clearInterval(step)
      set({ deepScan: { running: false, progress: 0, startedAt: null } })
    }
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

/* ── Selectors + useSelect ──────────────────────────────────────────────── */

export function useSelect<T>(sel: (s: State) => T): T {
  return useStore(sel)
}

export const selVerdict  = (s: State) => s.verdict
export const selDevices  = (s: State) => s.devices
export const selFrames   = (s: State) => s.frames
export const selPrefs    = (s: State) => s.prefs
export const selHw       = (s: State) => s.hw
export const selPlace    = (s: State) => s.place
export const selKlass    = (s: State) => s.verdict.klass
export const selScanning = (s: State) => s.prefs.scanning
export const selIncidents = (s: State) => s.incidents
export const selSessions  = (s: State) => s.sessions
export const selDeepScan  = (s: State) => s.deepScan

export function startTelemetry() {
  if (timer !== null) return () => stopTelemetry()
  timer = setInterval(tick, 1000)

  // Simulating radio telemetry while the app is backgrounded burns battery for
  // frames nobody will see. Suspend on background, resume on foreground.
  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      if (timer === null) timer = setInterval(tick, 1000)
    } else if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  })

  return () => {
    sub.remove()
    stopTelemetry()
  }
}

export function stopTelemetry() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}
