import { memo, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import Svg, {
  Circle,
  Line,
  Path,
  G,
  Defs,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import type { FusionBreakdown, SensorFrame, ThreatClass } from '@/engine/types'
import { CHANNEL_LABEL, WEIGHTS } from '@/engine/fusion'
import { C, TONES, alpha } from '@/lib/colors'
import { F, T } from '@/lib/type'
import { useTone } from './ui'

/* ============================================================================
   SPARKLINE
   ========================================================================== */

export const Sparkline = memo(function Sparkline({
  data,
  width = 64,
  height = 20,
  strokeWidth = 1.4,
  fill = false,
}: {
  data: number[]
  width?: number
  height?: number
  strokeWidth?: number
  fill?: boolean
}) {
  const { accent } = useTone()
  const d = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1
    const step = width / (data.length - 1)
    const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 2) - 1])
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    const area = `${line} L${width} ${height} L0 ${height} Z`
    return { line, area }
  }, [data, width, height])

  return (
    <Svg width={width} height={height}>
      {fill && <Path d={d.area} fill={accent} opacity={0.14} />}
      <Path
        d={d.line}
        fill="none"
        stroke={accent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
})

/* ============================================================================
   SERIES — full-width chart over a raw number[]
   ----------------------------------------------------------------------------
   Trace is bound to SensorFrame channels; this is the general form, used for
   per-device RSSI history where the domain is known but the shape is not.
   ========================================================================== */

export function Series({
  data,
  height = 130,
  domain,
  unit,
  format,
  showLast = true,
}: {
  data: number[]
  height?: number
  domain: [number, number]
  unit?: string
  format?: (v: number) => string
  /** Hide the corner readout when the caller already shows the value. */
  showLast?: boolean
}) {
  const { accent } = useTone()
  const W = 340
  const H = height
  const [lo, hi] = domain

  const { line, area, last } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '', last: data[0] ?? 0 }
    const step = W / (data.length - 1)
    const y = (v: number) => H - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (H - 14) - 7
    const pts = data.map((v, i) => [i * step, y(v)] as const)
    const l = pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ')
    return { line: l, area: `${l} L${W} ${H} L0 ${H} Z`, last: data[data.length - 1] }
  }, [data, lo, hi, H])

  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke={C.line} strokeWidth="1" />
        ))}
        <Path d={area} fill={accent} opacity={0.14} />
        <Path
          d={line}
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      {showLast ? (
        <View style={s.traceLabel} pointerEvents="none">
          <Text style={[s.traceLast, { color: accent }]}>
            {format ? format(last) : Math.round(last)}
          </Text>
          {unit ? <Text style={T.micro}>{unit}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

/* ============================================================================
   TRACE — full-width sensor time series
   ========================================================================== */

export function Trace({
  frames,
  channel,
  height = 116,
  threshold,
  unit,
  domain,
}: {
  frames: SensorFrame[]
  channel: 'rfDbm' | 'emfMg' | 'lux'
  height?: number
  threshold?: number
  unit: string
  domain: [number, number]
}) {
  const { accent } = useTone()
  const W = 340
  const H = height
  const values = frames.map((f) => f[channel])
  const [lo, hi] = domain

  const { line, area, last } = useMemo(() => {
    if (values.length < 2) return { line: '', area: '', last: 0 }
    const step = W / (values.length - 1)
    const y = (v: number) => H - ((v - lo) / (hi - lo)) * (H - 10) - 5
    const pts = values.map((v, i) => [i * step, y(Math.min(hi, Math.max(lo, v)))] as const)
    const line = pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ')
    return { line, area: `${line} L${W} ${H} L0 ${H} Z`, last: values[values.length - 1] }
  }, [values, lo, hi, H])

  const thresholdY = threshold != null ? H - ((threshold - lo) / (hi - lo)) * (H - 10) - 5 : null

  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke={C.line} strokeWidth="1" />
        ))}
        {thresholdY != null && (
          <Line
            x1="0" y1={thresholdY} x2={W} y2={thresholdY}
            stroke={C.caution} strokeWidth="1" strokeDasharray="3 4" opacity={0.6}
          />
        )}
        <Path d={area} fill={accent} opacity={0.14} />
        <Path d={line} fill="none" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
      </Svg>
      <View style={s.traceLabel} pointerEvents="none">
        <Text style={[s.traceLast, { color: accent }]}>
          {channel === 'lux' ? Math.round(last) : last.toFixed(1)}
        </Text>
        <Text style={T.micro}>{unit}</Text>
      </View>
    </View>
  )
}

/* ============================================================================
   EVIDENCE STACK
   ========================================================================== */

export function EvidenceStack({ breakdown, compact = false }: { breakdown: FusionBreakdown; compact?: boolean }) {
  const rows = (Object.keys(WEIGHTS) as Array<keyof FusionBreakdown>).map((k) => ({
    key: k,
    label: CHANNEL_LABEL[k],
    value: breakdown[k],
    weight: WEIGHTS[k],
    contribution: breakdown[k] * WEIGHTS[k],
  }))
  const max = Math.max(...rows.map((r) => r.contribution), 0.001)

  return (
    <View style={s.evidenceWrap}>
      {rows.map((r, i) => (
        <EvidenceRow
          key={r.key}
          label={r.label}
          weight={r.weight}
          active={r.value > 0.12}
          ghost={r.weight / max}
          fill={r.contribution / max}
          index={i}
        />
      ))}
    </View>
  )
}

function EvidenceRow({
  label, weight, active, ghost, fill, index,
}: {
  label: string; weight: number; active: boolean; ghost: number; fill: number; index: number
}) {
  const { accent } = useTone()
  const p = useSharedValue(0)

  useEffect(() => {
    p.value = withDelay(
      index * 70,
      withTiming(fill, { duration: 900, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    )
  }, [fill, index, p])

  const barStyle = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }))

  return (
    <View style={s.evidenceRow}>
      <View style={s.evidenceLabel}>
        <Text style={[s.evidenceName, { color: active ? C.ink : C.ink4 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={s.evidenceBar}>
        <View style={[s.evidenceGhost, { width: `${ghost * 100}%` }]} />
        <Animated.View
          style={[s.evidenceFill, { backgroundColor: accent, opacity: active ? 1 : 0.3 }, barStyle]}
        >
          
        </Animated.View>
      </View>
      <Text style={[s.evidenceWeight, active && { color: accent }]}>×{weight.toFixed(2)}</Text>
    </View>
  )
}

/* ============================================================================
   SIGNAL BARS
   ========================================================================== */

export function SignalBars({ bars }: { bars: number }) {
  const { accent } = useTone()
  return (
    <View style={s.signalBars}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            s.signalBar,
            { height: 4 + i * 3, backgroundColor: i < bars ? accent : alpha(C.ink4, 0.45) },
          ]}
        />
      ))}
    </View>
  )
}

/* ============================================================================
   PROXIMITY FIELD
   ========================================================================== */

const TONE_COLORS: Record<string, string> = {
  safe: C.safe,
  caution: C.caution,
  threat: C.threat,
  muted: C.ink4,
}

export function ProximityField({
  points,
  size = 300,
}: {
  points: Array<{ id: string; rssi: number; tone: 'safe' | 'caution' | 'threat' | 'muted'; label?: string }>
  size?: number
}) {
  const R = 140
  const TAU = Math.PI * 2
  const placed = useMemo(
    () =>
      points.map((p) => {
        let h = 0
        for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0
        const angle = ((h % 3600) / 3600) * TAU
        const t = Math.min(1, Math.max(0, (-p.rssi - 30) / 60))
        const r = 22 + t * (R - 34)
        return { ...p, x: 150 + Math.cos(angle) * r, y: 150 + Math.sin(angle) * r }
      }),
    [points],
  )

  return (
    <Svg viewBox="0 0 300 300" width={size} height={size}>
      {[46, 92, 138].map((r, i) => (
        <G key={r}>
          <Circle
            cx="150" cy="150" r={r} fill="none" stroke={C.line} strokeWidth="1"
            strokeDasharray={i === 2 ? '2 4' : undefined}
          />
          <SvgText x="152" y={150 - r + 11} fontFamily={F.mono} fontSize="8" fill={C.ink4} letterSpacing="0.1em">
            {['2M', '6M', '15M'][i]}
          </SvgText>
        </G>
      ))}
      <Line x1="150" y1="8" x2="150" y2="292" stroke={C.line} strokeWidth="1" />
      <Line x1="8" y1="150" x2="292" y2="150" stroke={C.line} strokeWidth="1" />
      <Circle cx="150" cy="150" r="7" fill={C.bg} stroke={C.ink2} strokeWidth="1.4" />
      <Circle cx="150" cy="150" r="2.4" fill={C.ink} />
      {placed.map((p) => (
        <G key={p.id}>
          <Circle
            cx={p.x} cy={p.y}
            r={p.tone === 'muted' ? 2.6 : 4}
            fill={TONE_COLORS[p.tone]}
            opacity={p.tone === 'muted' ? 0.55 : 1}
          />
          {p.label && (
            <SvgText x={p.x + 8} y={p.y + 3.5} fontFamily={F.mono} fontSize="8.5" fill={C.ink3} letterSpacing="0.06em">
              {p.label}
            </SvgText>
          )}
        </G>
      ))}
    </Svg>
  )
}

/* ============================================================================
   SPECTRUM
   ========================================================================== */

const BANDS = [
  { label: '433M', key: 'ism433' },
  { label: '868M', key: 'ism868' },
  { label: '1.2G', key: 'analog' },
  { label: '2.4G', key: 'wifi24' },
  { label: '5.2G', key: 'wifi5' },
  { label: '5.8G', key: 'analog58' },
]

export function Spectrum({ levels, peakBand }: { levels: number[]; peakBand?: number }) {
  const { accent } = useTone()
  return (
    <View style={s.spectrumWrap}>
      {BANDS.map((b, i) => (
        <View key={b.key} style={s.spectrumCol}>
          <SpectrumBar value={levels[i] ?? 0} hot={i === peakBand} index={i} />
          <Text style={[s.spectrumLabel, { color: i === peakBand ? accent : C.ink4 }]}>
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function SpectrumBar({ value, hot, index }: { value: number; hot: boolean; index: number }) {
  const { accent } = useTone()
  const p = useSharedValue(0)

  useEffect(() => {
    p.value = withDelay(
      index * 60,
      withTiming(Math.min(1, Math.max(0, value)), {
        duration: 850,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    )
  }, [value, index, p])

  const fill = useAnimatedStyle(() => ({ height: `${p.value * 100}%` }))

  return (
    <View style={s.spectrumTrack}>
      {[0.25, 0.5, 0.75].map((g) => (
        <View key={g} style={[s.spectrumGrid, { bottom: `${g * 100}%` as never }]} />
      ))}
      <Animated.View style={[s.spectrumFill, { backgroundColor: hot ? accent : C.ink4, opacity: hot ? 1 : 0.4 }, fill]}>
        
      </Animated.View>
    </View>
  )
}

/* ============================================================================
   GAUGE
   ========================================================================== */

export function Gauge({
  value, max, label, unit, danger, size = 92,
}: {
  value: number; max: number; label: string; unit: string; danger?: number; size?: number
}) {
  const { accent } = useTone()
  const pct = Math.min(1, Math.max(0, value / max))
  const R = 38
  const CIRC = Math.PI * R
  const dangerPct = danger != null ? Math.min(1, danger / max) : null

  return (
    <View style={s.gaugeWrap}>
      <Svg viewBox="0 0 100 58" width={size} height={size * 0.58}>
        <Path
          d={`M ${50 - R} 50 A ${R} ${R} 0 0 1 ${50 + R} 50`}
          fill="none" stroke={C.surface3} strokeWidth="6" strokeLinecap="round"
        />
        {dangerPct != null && (
          <Path
            d={`M ${50 - R} 50 A ${R} ${R} 0 0 1 ${50 + R} 50`}
            fill="none" stroke={C.caution} strokeWidth="1.5"
            strokeDasharray={`1.5 ${CIRC}`} strokeDashoffset={-CIRC * dangerPct} opacity={0.7}
          />
        )}
        <Path
          d={`M ${50 - R} 50 A ${R} ${R} 0 0 1 ${50 + R} 50`}
          fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${CIRC * pct} ${CIRC}`}
        />
      </Svg>
      <View style={[s.gaugeReadout, { marginTop: -12 }]}>
        <Text style={[T.readout, { fontSize: 17, fontFamily: F.monoSemi, lineHeight: 20 }]}>
          {value < 10 ? value.toFixed(1) : Math.round(value)}
          <Text style={{ fontSize: 10, fontFamily: F.mono, color: C.ink3 }}>{unit}</Text>
        </Text>
        <Text style={[T.micro, { marginTop: 6 }]}>{label}</Text>
      </View>
    </View>
  )
}

/* ============================================================================
   THREAT RIBBON — 24h score history
   ========================================================================== */

const RIBBON_TONE: Record<ThreatClass, string> = {
  safe: C.safe,
  caution: C.caution,
  threat: C.threat,
}

export function ThreatRibbon({ points }: { points: Array<{ score: number; klass: ThreatClass }> }) {
  return (
    <View style={s.ribbonWrap}>
      {points.map((p, i) => (
        <View
          key={i}
          style={[
            s.ribbonBar,
            {
              height: Math.max(8, p.score) * 0.36,
              backgroundColor: RIBBON_TONE[p.klass],
              opacity: p.klass === 'safe' ? 0.4 : 0.9,
            },
          ]}
        />
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  traceLabel: { position: 'absolute', top: 4, right: 0, flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  traceLast: { fontFamily: F.monoSemi, fontSize: 15, lineHeight: 18 },

  evidenceWrap: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  evidenceLabel: { width: 104 },
  evidenceName: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 16 },
  evidenceBar: { flex: 1, height: 18, borderRadius: 3, backgroundColor: C.bg2, overflow: 'hidden', position: 'relative' },
  evidenceGhost: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 3, borderWidth: 1, borderColor: C.line },
  evidenceFill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  evidenceWeight: { fontFamily: F.mono, width: 52, fontSize: 11, lineHeight: 14, color: C.ink3, textAlign: 'right' },

  signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  signalBar: { width: 3, borderRadius: 1 },

  spectrumWrap: { flexDirection: 'row', height: 128, alignItems: 'flex-end', gap: 6, paddingHorizontal: 16, paddingBottom: 4 },
  spectrumCol: { flex: 1, alignItems: 'center', gap: 8 },
  /* Explicit height: the row is `alignItems: flex-end`, so columns are sized to
     their content and a flex:1 track would collapse to zero. */
  spectrumTrack: { height: 92, width: '100%', borderRadius: 6, backgroundColor: alpha(C.ink, 0.06), overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
  spectrumGrid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.line },
  spectrumFill: { width: '100%' },
  spectrumLabel: { fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.85 },

  gaugeWrap: { alignItems: 'center' },
  gaugeReadout: { alignItems: 'center' },

  ribbonWrap: { flexDirection: 'row', height: 36, alignItems: 'flex-end', gap: 2, paddingHorizontal: 16 },
  ribbonBar: { flex: 1, borderRadius: 1 },
})
