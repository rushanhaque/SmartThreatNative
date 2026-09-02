import type { ThreatClass } from '../engine/types'

/* ============================================================================
   SPOT INK — flat colour, no blends
   ----------------------------------------------------------------------------
   Built like a risograph print: a stone-paper ground and a handful of
   saturated spot inks that are never mixed, never faded into one another.
   Colour carries meaning here, so every accent is a single flat value —
   if two things look different, they *are* different.

   There are no gradients in this file and none should be added. Depth comes
   from hairlines, flat tint blocks and one honest shadow.
   ========================================================================== */

export const C = {
  /* ground — warm stone, so pure-white cards read as raised paper */
  void: '#D8D8CC',
  bg:   '#ECECE4',
  bg2:  '#E3E3D9',
  bg3:  '#D8D8CC',

  /* surfaces — solid, no translucency games */
  surface:  '#FFFFFF',
  surface2: '#FFFFFF',
  surface3: '#E7E7DE',

  /* ink — near-black with a green cast, never pure grey */
  ink:  '#14140E',
  ink2: '#44453A',
  ink3: '#6D6F62',
  ink4: '#9B9D8F',
  ink5: '#C3C5B6',

  /* ── spot inks ─────────────────────────────────────────────────────────
     Chosen to be unmistakable from one another at a glance and at 3 mm. */

  /** deep jade — all clear */
  safe:     '#0B7A5A',
  safeTint: '#DCEFE7',

  /** burnt amber — takes dark text, not white */
  caution:     '#C67100',
  cautionTint: '#F7E9D2',

  /** vermillion */
  threat:     '#D62F1C',
  threatTint: '#FADFDA',

  /** Klein blue — the brand/neutral accent */
  klein:     '#1F23C9',
  kleinTint: '#DEDFF7',

  /** acid lime — used sparingly, highlight only, never behind text */
  lime: '#AECF00',

  /* hairlines */
  line:  'rgba(20,20,14,0.10)',
  line2: 'rgba(20,20,14,0.18)',
  line3: 'rgba(20,20,14,0.34)',
} as const

export const RADIUS = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const

/** One honest shadow, plus a flatter variant. Never coloured. */
export const SHADOW = {
  flat: {
    shadowColor: '#14140E',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    shadowColor: '#14140E',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  lift: {
    shadowColor: '#14140E',
    shadowOpacity: 0.13,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const

/** hex → rgba. Used only for hairlines and tint washes, never for blends. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export type Tone = ThreatClass | 'neutral' | 'muted'

export interface ToneTokens {
  /** the flat spot ink */
  accent: string
  /** text/icon colour that sits ON the accent — amber needs dark, not white */
  on: string
  /** pale flat tint of the accent, for block fills behind text */
  tint: string
  /** translucent accent, for washes over the paper */
  soft: string
}

export const TONES: Record<Tone, ToneTokens> = {
  safe:    { accent: C.safe,    on: '#FFFFFF', tint: C.safeTint,    soft: alpha(C.safe, 0.10) },
  caution: { accent: C.caution, on: C.ink,     tint: C.cautionTint, soft: alpha(C.caution, 0.12) },
  threat:  { accent: C.threat,  on: '#FFFFFF', tint: C.threatTint,  soft: alpha(C.threat, 0.10) },
  neutral: { accent: C.klein,   on: '#FFFFFF', tint: C.kleinTint,   soft: alpha(C.klein, 0.09) },
  muted:   { accent: C.ink3,    on: '#FFFFFF', tint: C.surface3,    soft: alpha(C.ink3, 0.10) },
}

export function toneOf(t: Tone): ToneTokens {
  return TONES[t]
}

/** The single brand accent. Replaces the old three-stop spectrum. */
export const BRAND = C.klein
