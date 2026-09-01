export const C = {
  bg: '#F4F1E9',
  bg2: '#EBE6DB',
  surface: '#FCFAF6',
  surface2: '#FFFFFF',
  surface3: '#E8E2D5',
  ink: '#1B1915',
  ink2: '#4E4A41',
  ink3: '#6A6559',
  ink4: '#938D7E',
  safe: '#12704A',
  caution: '#A66A05',
  threat: '#C0291D',
  irisA: '#5538C9',
  irisB: '#0C6B75',
  irisC: '#B0501A',
  safeSoft: '#DDEFE4',
  cautionSoft: '#F8ECD1',
  threatSoft: '#FBE1DD',
  neutralSoft: '#D4EBE8',
  line: 'rgba(27,25,21,0.10)',
  line2: 'rgba(27,25,21,0.17)',
  line3: 'rgba(27,25,21,0.30)',
} as const

import type { ThreatClass } from '../engine/types'

export const TONE_COLORS: Record<ThreatClass | 'muted' | 'neutral', { accent: string; soft: string }> = {
  safe:    { accent: C.safe,    soft: C.safeSoft    },
  caution: { accent: C.caution, soft: C.cautionSoft },
  threat:  { accent: C.threat,  soft: C.threatSoft  },
  muted:   { accent: C.ink4,    soft: C.surface3    },
  neutral: { accent: C.irisB,   soft: C.neutralSoft },
}
