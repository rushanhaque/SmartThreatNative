import type { ThreatClass } from '../engine/types'

/* ============================================================================
   ATELIER — a muted, deep light palette
   ----------------------------------------------------------------------------
   Every accent here is desaturated and dark. Saturated primaries (fire red,
   kelly green, safety amber) are the colours of warning labels and toys; the
   same three states rendered as eucalyptus, antique brass and garnet read as
   instrumentation instead — serious without shouting.

   Because the accents are dark rather than bright, contrast against the
   limestone ground stays high, so state is still legible at a glance.

   No gradients. Depth comes from hairlines, flat tint blocks, one honest
   shadow, and blurred glass on the chrome.
   ========================================================================== */

export const C = {
  /* ground — limestone, faintly cool */
  void: '#DCDCD6',
  bg:   '#EFEFEB',
  bg2:  '#E7E7E2',
  bg3:  '#DCDCD6',

  /* surfaces */
  surface:  '#FFFFFF',
  surface2: '#FAFAF8',
  surface3: '#E9E9E3',

  /* ink — graphite, very slightly cool */
  ink:  '#16171A',
  ink2: '#3F4147',
  ink3: '#6B6E75',
  ink4: '#9B9EA6',
  ink5: '#C8CACF',

  /* ── the four inks ─────────────────────────────────────────────────────
     Deep and low-chroma. Each takes a different text colour on top, which
     is why `on` is part of the tone rather than assumed to be white.      */

  /** eucalyptus — all clear */
  safe:     '#2F6A58',
  safeTint: '#DEE9E5',

  /** antique brass — wants dark text, never white */
  caution:     '#B08A3C',
  cautionTint: '#F1E8D6',

  /** garnet */
  threat:     '#8E3341',
  threatTint: '#F2DFE2',

  /** deep indigo — the brand / neutral accent */
  indigo:     '#3A3F75',
  indigoTint: '#E1E2EC',

  /* hairlines */
  line:  'rgba(22,23,26,0.10)',
  line2: 'rgba(22,23,26,0.17)',
  line3: 'rgba(22,23,26,0.32)',
} as const

export const RADIUS = { xs: 5, sm: 9, md: 13, lg: 18, xl: 26, pill: 999 } as const

/** One honest shadow, plus a flatter and a deeper variant. Never coloured. */
export const SHADOW = {
  flat: {
    shadowColor: '#16171A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    shadowColor: '#16171A',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lift: {
    shadowColor: '#16171A',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} as const

/** hex → rgba. Used for hairlines, tints and glass, never for blends. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export type Tone = ThreatClass | 'neutral' | 'muted'

export interface ToneTokens {
  /** the flat accent */
  accent: string
  /** text/icon colour that sits ON the accent — brass needs dark, not white */
  on: string
  /** pale flat tint of the accent, for blocks behind text */
  tint: string
  /** translucent accent, for washes over the ground */
  soft: string
}

export const TONES: Record<Tone, ToneTokens> = {
  safe:    { accent: C.safe,    on: '#FFFFFF', tint: C.safeTint,    soft: alpha(C.safe, 0.10) },
  caution: { accent: C.caution, on: C.ink,     tint: C.cautionTint, soft: alpha(C.caution, 0.13) },
  threat:  { accent: C.threat,  on: '#FFFFFF', tint: C.threatTint,  soft: alpha(C.threat, 0.10) },
  neutral: { accent: C.indigo,  on: '#FFFFFF', tint: C.indigoTint,  soft: alpha(C.indigo, 0.09) },
  muted:   { accent: C.ink3,    on: '#FFFFFF', tint: C.surface3,    soft: alpha(C.ink3, 0.10) },
}

export function toneOf(t: Tone): ToneTokens {
  return TONES[t]
}

/** The single brand accent. */
export const BRAND = C.indigo
