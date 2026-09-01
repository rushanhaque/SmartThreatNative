/* ============================================================================
   PRIVACYGLASS · MULTI-MODAL FUSION ENGINE
   ----------------------------------------------------------------------------
   Faithful TypeScript port of the C++ scoring kernel that runs on the ESP32-S3
   (project dossier §9). Keeping the web port 1:1 with firmware means the app
   can *explain* a verdict the glasses reached, rather than guessing at it.

     score = 0.35·camera + 0.30·tracker + 0.20·rf + 0.10·emf + 0.05·dark

   The RandomForest (100 trees, emlearn → C) refines the class boundary; this
   rule kernel supplies the explainable breakdown the UI renders. When the two
   disagree the firmware takes the higher of the pair — fail loud, not silent.
   ========================================================================== */

import type {
  Device,
  FusionBreakdown,
  Reason,
  SensorFrame,
  ThreatClass,
  Verdict,
} from './types'

export const WEIGHTS: FusionBreakdown = {
  camera: 0.35,
  tracker: 0.3,
  rf: 0.2,
  emf: 0.1,
  dark: 0.05,
}

export const CHANNEL_LABEL: Record<keyof FusionBreakdown, string> = {
  camera: 'Optical / camera',
  tracker: 'Tracker co-motion',
  rf: 'RF power',
  emf: 'EM field',
  dark: 'Ambient light',
}

/** Linear map with clamping — the firmware's `mapf()`. */
export function mapf(v: number, inMin: number, inMax: number, outMin = 0, outMax = 1) {
  if (inMax === inMin) return outMin
  const t = (v - inMin) / (inMax - inMin)
  return outMin + Math.min(1, Math.max(0, t)) * (outMax - outMin)
}

export function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

/** Population variance of an RSSI trail, in dB². Low variance ⇒ fixed distance. */
export function rssiVariance(trail: number[]): number {
  if (trail.length < 2) return 99
  const mean = trail.reduce((a, b) => a + b, 0) / trail.length
  return trail.reduce((a, b) => a + (b - mean) ** 2, 0) / trail.length
}

/* ── Channel: hidden camera ────────────────────────────────────────────────
   A camera is never *just* a Wi-Fi device. It is a Wi-Fi device with a camera
   OUI, that streams, that answers on 554, and that sits in a dark corner.    */
function cameraChannel(devices: Device[]): { value: number; reasons: Reason[] } {
  const reasons: Reason[] = []
  let best = 0

  for (const d of devices) {
    if (d.trust === 'trusted') continue
    let s = 0
    if (d.signals.includes('camera-oui')) {
      s += 0.6
      reasons.push({
        code: 'CAM_OUI',
        channel: 'camera',
        title: `${d.vendor} camera OUI`,
        detail: `${d.mac} matches the ${d.oui} block registered to ${d.vendor}.`,
        strength: 0.6,
        deviceId: d.id,
      })
    }
    if (d.signals.includes('streaming')) {
      s += 0.4
      reasons.push({
        code: 'CAM_STREAM',
        channel: 'camera',
        title: 'Sustained video-shaped traffic',
        detail: `${Math.round(d.throughputKbps)} kbps held for over 20 s — packet-length variance matches H.264.`,
        strength: 0.4,
        deviceId: d.id,
      })
    }
    if (d.signals.includes('rtsp-open') || d.signals.includes('mdns-camera')) {
      s += 0.25
      reasons.push({
        code: 'CAM_PORT',
        channel: 'camera',
        title: d.signals.includes('rtsp-open') ? 'RTSP port 554 open' : 'mDNS _camera record',
        detail: d.signals.includes('rtsp-open')
          ? `Host answered a socket connect on ${d.openPorts.join(', ')}.`
          : 'Device advertises a camera service over multicast DNS.',
        strength: 0.25,
        deviceId: d.id,
      })
    }
    best = Math.max(best, clamp01(s))
  }
  return { value: best, reasons }
}

/* ── Channel: tracker co-motion ───────────────────────────────────────────
   Apple rotates the FindMy key every 15 min, so identity is useless. What is
   NOT rotated is physics: a tag in your bag holds a near-constant RSSI while
   you move hundreds of metres. That is the signal we key on.                */
function trackerChannel(devices: Device[], now: number): { value: number; reasons: Reason[] } {
  const reasons: Reason[] = []
  let best = 0

  for (const d of devices) {
    if (d.trust === 'trusted') continue
    if (!d.signals.includes('findmy') && !d.signals.includes('tracker-proto')) continue

    let s = 0.35
    reasons.push({
      code: 'TRK_FINDMY',
      channel: 'tracker',
      title: d.signals.includes('findmy') ? 'Apple FindMy advertisement' : `${d.vendor} tracker`,
      detail: d.signals.includes('findmy')
        ? 'Manufacturer data 0x004C, status byte in the offline-finding range.'
        : `Service UUID matches the ${d.vendor} tracking protocol.`,
      strength: 0.35,
      deviceId: d.id,
    })

    const withYouMin = Math.max(0, (now - d.firstSeen) / 60000)
    if (d.signals.includes('travelling')) {
      const travelScore = mapf(withYouMin, 5, 20, 0.2, 0.45)
      s += travelScore
      reasons.push({
        code: 'TRK_TRAVEL',
        channel: 'tracker',
        title: `Travelling with you · ${Math.round(withYouMin)} min`,
        detail:
          'Seen continuously across a displacement of more than 30 m. Apple would not warn you for several more hours.',
        strength: travelScore,
        deviceId: d.id,
      })
    }

    const variance = rssiVariance(d.rssiTrail)
    if (variance < 15) {
      s += 0.2
      reasons.push({
        code: 'TRK_VARIANCE',
        channel: 'tracker',
        title: 'Fixed distance from you',
        detail: `RSSI variance ${variance.toFixed(1)} dB² — the tag is not in the room, it is on you.`,
        strength: 0.2,
        deviceId: d.id,
      })
    }
    best = Math.max(best, clamp01(s))
  }
  return { value: best, reasons }
}

/* ── Channel: RF power ────────────────────────────────────────────────────
   AD8318 log-detector. −70 dBm is a quiet room; −30 dBm means a transmitter
   is within arm's reach of your head.                                       */
function rfChannel(frames: SensorFrame[]): { value: number; reasons: Reason[] } {
  const reasons: Reason[] = []
  if (!frames.length) return { value: 0, reasons }

  const window = frames.slice(-60)
  const peak = Math.max(...window.map((f) => f.rfDbm))
  const avg = window.reduce((a, f) => a + f.rfDbm, 0) / window.length
  const value = mapf(peak, -70, -30)

  if (peak > -45) {
    reasons.push({
      code: 'RF_SPIKE',
      channel: 'rf',
      title: `RF peak ${peak.toFixed(0)} dBm`,
      detail: `Baseline for this space is around ${avg.toFixed(0)} dBm. A spike of this size is a transmitter under 3 m away.`,
      strength: value,
    })
  }
  const sustained = window.filter((f) => f.rfDbm > -50).length
  if (sustained > window.length * 0.6) {
    reasons.push({
      code: 'RF_SUSTAIN',
      channel: 'rf',
      title: 'Sustained carrier',
      detail: `${Math.round((sustained / window.length) * 100)}% of the last 30 s sat above −50 dBm — continuous transmit, not a burst.`,
      strength: 0.8,
    })
  }
  return { value, reasons }
}

/* ── Channel: EM field ────────────────────────────────────────────────────
   Coil + op-amp. Background is under 1.5 mG. Anything over ~3 mG sustained
   next to a pillow deserves a second look.                                  */
function emfChannel(frames: SensorFrame[]): { value: number; reasons: Reason[] } {
  const reasons: Reason[] = []
  if (!frames.length) return { value: 0, reasons }
  const window = frames.slice(-40)
  const peak = Math.max(...window.map((f) => f.emfMg))
  const value = mapf(peak, 0, 10)
  if (peak > 3) {
    reasons.push({
      code: 'EMF_HIGH',
      channel: 'emf',
      title: `EM field ${peak.toFixed(1)} mG`,
      detail: 'Above the 3 mG threshold. Powered electronics are concealed close by.',
      strength: value,
    })
  }
  return { value, reasons }
}

/* ── Channel: darkness amplifier ──────────────────────────────────────────
   Darkness is not a threat. It is a multiplier: it is exactly when IR-capable
   pinhole cameras are most effective and least visible.                     */
function darkChannel(frames: SensorFrame[]): { value: number; reasons: Reason[] } {
  const reasons: Reason[] = []
  if (!frames.length) return { value: 0, reasons }
  const lux = frames[frames.length - 1].lux
  const value = mapf(lux, 40, 2)
  if (lux < 15) {
    reasons.push({
      code: 'DARK_ROOM',
      channel: 'dark',
      title: `Low light · ${lux.toFixed(0)} lux`,
      detail: 'Scan cadence raised. IR-illuminated lenses work best in exactly these conditions.',
      strength: value,
    })
  }
  return { value, reasons }
}

/** Device-density heuristic — a hotel room should not hold 15 radios. */
function densityReason(devices: Device[]): Reason | null {
  const unknown = devices.filter((d) => d.trust === 'unknown').length
  if (unknown < 10) return null
  return {
    code: 'DEV_DENSITY',
    channel: 'rf',
    title: `${unknown} unidentified radios`,
    detail: 'Well above the 8-device norm for a room this size.',
    strength: mapf(unknown, 10, 20, 0.3, 0.8),
  }
}

export const SENSITIVITY_BIAS = { low: -8, balanced: 0, high: 9 } as const

export function classify(score: number): ThreatClass {
  if (score >= 68) return 'threat'
  if (score >= 34) return 'caution'
  return 'safe'
}

/** The whole engine, one call. Pure — trivially unit-testable. */
export function fuse(
  devices: Device[],
  frames: SensorFrame[],
  now: number,
  sensitivity: keyof typeof SENSITIVITY_BIAS = 'balanced',
): Verdict {
  const cam = cameraChannel(devices)
  const trk = trackerChannel(devices, now)
  const rf = rfChannel(frames)
  const emf = emfChannel(frames)
  const dark = darkChannel(frames)

  const breakdown: FusionBreakdown = {
    camera: cam.value,
    tracker: trk.value,
    rf: rf.value,
    emf: emf.value,
    dark: dark.value,
  }

  const raw =
    WEIGHTS.camera * cam.value +
    WEIGHTS.tracker * trk.value +
    WEIGHTS.rf * rf.value +
    WEIGHTS.emf * emf.value +
    WEIGHTS.dark * dark.value

  // Darkness amplifies an existing optical suspicion rather than standing alone.
  const amplified = raw * (1 + 0.18 * dark.value * Math.max(cam.value, rf.value))
  const score = Math.round(clamp01(amplified) * 100) + SENSITIVITY_BIAS[sensitivity]
  const bounded = Math.min(100, Math.max(0, score))

  const reasons = [
    ...cam.reasons,
    ...trk.reasons,
    ...rf.reasons,
    ...emf.reasons,
    ...dark.reasons,
  ]
  const density = densityReason(devices)
  if (density) reasons.push(density)

  reasons.sort((a, b) => WEIGHTS[b.channel] * b.strength - WEIGHTS[a.channel] * a.strength)

  // Confidence rises with corroboration: two channels agreeing beats one shouting.
  const active = Object.values(breakdown).filter((v) => v > 0.25).length
  const confidence = clamp01(0.52 + active * 0.12 + Math.abs(bounded - 50) / 240)

  return { score: bounded, klass: classify(bounded), confidence, breakdown, reasons, at: now }
}

/* ── Presentation helpers ─────────────────────────────────────────────── */

export const CLASS_META: Record<
  ThreatClass,
  { label: string; short: string; tone: string; verb: string }
> = {
  safe: {
    label: 'Clear',
    short: 'CLR',
    tone: 't-safe',
    verb: 'Nothing in this space is behaving like surveillance.',
  },
  caution: {
    label: 'Watch',
    short: 'WCH',
    tone: 't-caution',
    verb: 'Something here is unusual but unproven. Worth a deep scan.',
  },
  threat: {
    label: 'Threat',
    short: 'THR',
    tone: 't-threat',
    verb: 'Multiple sensors corroborate an active surveillance device.',
  },
}

export function toneFor(k: ThreatClass) {
  return CLASS_META[k].tone
}
