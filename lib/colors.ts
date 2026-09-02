import type { ThreatClass } from '../engine/types'

/* ============================================================================
   AURORA GLASS — a bright, high-chroma light theme
   ----------------------------------------------------------------------------
   Cool porcelain canvas, deep-navy ink, and a vivid spectrum triad. Surfaces
   are translucent rather than opaque so the aurora field behind them reads
   through the glass.
   ========================================================================== */

export const C = {
  /* canvas */
  void:     '#E6EAF6',
  bg:       '#F5F7FD',
  bg2:      '#ECEFFA',
  bg3:      '#E1E7F7',

  /* glass surfaces (used with blur underneath) */
  surface:  '#FFFFFF',
  surface2: '#FBFCFF',
  surface3: '#E8EDFB',

  /* ink — deep navy rather than warm charcoal */
  ink:      '#0B1024',
  ink2:     '#39406B',
  ink3:     '#6B7297',
  ink4:     '#A2A9C6',
  ink5:     '#C7CDE2',

  /* status triad — saturated, modern */
  safe:      '#00A87A',
  safeLift:  '#3DDCA6',
  safeDeep:  '#DFFAF0',

  caution:     '#F0930B',
  cautionLift: '#FFC24D',
  cautionDeep: '#FFF3DC',

  threat:      '#F5285B',
  threatLift:  '#FF6E92',
  threatDeep:  '#FFE4EB',

  /* brand spectrum — violet → cyan → pink */
  irisA: '#7C5CFC',
  irisB: '#00BFE7',
  irisC: '#FF4D8D',

  /* accent extras for gradients */
  violet: '#7C5CFC',
  indigo: '#4F6BFF',
  cyan:   '#00BFE7',
  mint:   '#3DDCA6',
  pink:   '#FF4D8D',
  amber:  '#FFB020',

  /* hairlines on glass */
  line:  'rgba(11,16,36,0.07)',
  line2: 'rgba(11,16,36,0.13)',
  line3: 'rgba(11,16,36,0.24)',

  /* glass fills */
  glass:      'rgba(255,255,255,0.62)',
  glassSoft:  'rgba(255,255,255,0.44)',
  glassDeep:  'rgba(255,255,255,0.80)',
  glassEdge:  'rgba(255,255,255,0.90)',
  glassShade: 'rgba(11,16,36,0.05)',
} as const

export const RADIUS = { xs: 8, sm: 12, md: 16, lg: 22, xl: 30, pill: 999 } as const

/** Elevation presets tuned for a light glass stack. */
export const SHADOW = {
  soft: {
    shadowColor: '#1B2559',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  lift: {
    shadowColor: '#1B2559',
    shadowOpacity: 0.11,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 7,
  },
  glow: {
    shadowColor: '#4F6BFF',
    shadowOpacity: 0.2,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
} as const

/** hex → rgba string. Mirrors CSS color-mix(… N%, transparent). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** Blend two hex colours. t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const pa = a.replace('#', '')
  const pb = b.replace('#', '')
  const to = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16)
  const r = Math.round(to(pa, 0) + (to(pb, 0) - to(pa, 0)) * t)
  const g = Math.round(to(pa, 2) + (to(pb, 2) - to(pa, 2)) * t)
  const bl = Math.round(to(pa, 4) + (to(pb, 4) - to(pa, 4)) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

export type Tone = ThreatClass | 'neutral' | 'muted'

export interface ToneTokens {
  /** primary accent */
  accent: string
  /** lighter partner for gradients */
  lift: string
  /** pale tint background */
  deep: string
  /** translucent wash over glass */
  soft: string
  /** two-stop gradient */
  grad: [string, string]
  /** glow shadow colour */
  glow: string
}

export const TONES: Record<Tone, ToneTokens> = {
  safe: {
    accent: C.safe, lift: C.safeLift, deep: C.safeDeep,
    soft: alpha(C.safe, 0.12), grad: [C.safeLift, C.safe], glow: C.safe,
  },
  caution: {
    accent: C.caution, lift: C.cautionLift, deep: C.cautionDeep,
    soft: alpha(C.caution, 0.13), grad: [C.cautionLift, C.caution], glow: C.caution,
  },
  threat: {
    accent: C.threat, lift: C.threatLift, deep: C.threatDeep,
    soft: alpha(C.threat, 0.13), grad: [C.threatLift, C.threat], glow: C.threat,
  },
  neutral: {
    accent: C.indigo, lift: C.cyan, deep: '#E4EBFF',
    soft: alpha(C.indigo, 0.11), grad: [C.violet, C.cyan], glow: C.indigo,
  },
  muted: {
    accent: C.ink4, lift: C.ink5, deep: C.surface3,
    soft: alpha(C.ink4, 0.12), grad: [C.ink5, C.ink4], glow: C.ink4,
  },
}

export function toneOf(t: Tone): ToneTokens {
  return TONES[t]
}

/** Brand spectrum used for the tab indicator, logomark and hero rings. */
export const IRIS: [string, string, string] = [C.irisA, C.irisB, C.irisC]
