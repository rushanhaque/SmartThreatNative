/* ============================================================================
   APERTURE RING — the primary instrument
   ----------------------------------------------------------------------------
   72 blades on a 5° pitch. Filled blades carry a two-stop gradient with a
   bright leading edge; unfilled blades sit as faint tick marks. Above that:
   a rotating specular sweep, a counter-rotating outer track, and three
   orbiting particles that make the instrument feel alive without redrawing
   the blade set every frame.

   All motion is Reanimated on the UI thread — the SVG blade geometry is
   memoised and only recomputes when the score bucket actually changes.
   ========================================================================== */

import { memo, useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import type { ThreatClass } from '@/engine/types'
import { C, TONES, alpha } from '@/lib/colors'

const BLADES = 72
const TAU = Math.PI * 2
const CX = 150
const CY = 150

const GEOM = Array.from({ length: BLADES }, (_, i) => {
  const a = (i / BLADES) * TAU - Math.PI / 2
  const inner = 106
  const outer = 128
  const major = i % 6 === 0
  return {
    i,
    major,
    x1: CX + Math.cos(a) * (major ? inner - 5 : inner),
    y1: CY + Math.sin(a) * (major ? inner - 5 : inner),
    x2: CX + Math.cos(a) * outer,
    y2: CY + Math.sin(a) * outer,
    // orbit anchor for particles
    ax: CX + Math.cos(a) * 138,
    ay: CY + Math.sin(a) * 138,
  }
})

export const ApertureRing = memo(function ApertureRing({
  score,
  klass,
  size = 268,
  scanning = true,
  children,
}: {
  score: number
  klass: ThreatClass
  size?: number
  scanning?: boolean
  children?: React.ReactNode
}) {
  const tone = TONES[klass]
  const filled = Math.round((score / 100) * BLADES)

  /* ── continuous drivers ─────────────────────────────────────────── */
  const spin = useSharedValue(0)
  const counter = useSharedValue(0)
  const breathe = useSharedValue(0)

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false)
    counter.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.linear }), -1, false)
    breathe.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
    return () => {
      cancelAnimation(spin)
      cancelAnimation(counter)
      cancelAnimation(breathe)
    }
  }, [spin, counter, breathe])

  const sweepStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      opacity: scanning ? 1 : 0,
      transform: [{ rotate: `${spin.value * 360}deg` }],
    }
  })

  const trackStyle = useAnimatedStyle(() => {
    'worklet'
    return { transform: [{ rotate: `${-counter.value * 360}deg` }] }
  })

  const haloStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      opacity: interpolate(breathe.value, [0, 1], [0.35, 0.72]),
      transform: [{ scale: interpolate(breathe.value, [0, 1], [0.95, 1.06]) }],
    }
  })

  const blades = useMemo(
    () =>
      GEOM.map((b) => {
        const on = b.i < filled
        const lead = filled - b.i
        const opacity = on
          ? lead <= 2 ? 1 : lead <= 8 ? 0.9 : lead <= 20 ? 0.7 : 0.5
          : b.major ? 0.2 : 0.09
        return { ...b, on, opacity }
      }),
    [filled],
  )

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* breathing halo behind everything */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size * 0.86,
            height: size * 0.86,
            borderRadius: size,
            backgroundColor: alpha(tone.accent, 0.13),
          },
          haloStyle,
        ]}
      />

      {/* counter-rotating dashed outer track */}
      <Animated.View style={[StyleSheet.absoluteFill, trackStyle]} pointerEvents="none">
        <Svg viewBox="0 0 300 300" width={size} height={size}>
          <Circle
            cx={CX}
            cy={CY}
            r={141}
            stroke={alpha(tone.accent, 0.3)}
            strokeWidth={1.2}
            strokeDasharray="2 12"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* static instrument face */}
      <Svg
        viewBox="0 0 300 300"
        width={size}
        height={size}
        style={{ position: 'absolute' }}
      >
        <Defs>
          <RadialGradient id="ap-core" cx="50%" cy="42%" r="62%">
            <Stop offset="0%" stopColor={tone.lift} stopOpacity={0.2} />
            <Stop offset="58%" stopColor={tone.accent} stopOpacity={0.06} />
            <Stop offset="100%" stopColor={tone.accent} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="ap-blade" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={tone.lift} />
            <Stop offset="100%" stopColor={tone.accent} />
          </LinearGradient>
          <LinearGradient id="ap-rim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={C.irisA} stopOpacity={0.5} />
            <Stop offset="50%" stopColor={C.irisB} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={C.irisC} stopOpacity={0.5} />
          </LinearGradient>
        </Defs>

        {/* core wash */}
        <Circle cx={CX} cy={CY} r={122} fill="url(#ap-core)" />

        {/* structural hairlines */}
        <Circle cx={CX} cy={CY} r={98} stroke={C.line} strokeWidth={1} fill="none" />
        <Circle cx={CX} cy={CY} r={134} stroke="url(#ap-rim)" strokeWidth={1.4} fill="none" />

        {/* blades */}
        <G strokeLinecap="round">
          {blades.map((b) => (
            <Line
              key={b.i}
              x1={b.x1}
              y1={b.y1}
              x2={b.x2}
              y2={b.y2}
              stroke={b.on ? 'url(#ap-blade)' : C.ink}
              strokeWidth={b.major ? 3 : 1.9}
              opacity={b.opacity}
            />
          ))}
        </G>
      </Svg>

      {/* rotating specular sweep */}
      <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]} pointerEvents="none">
        <Svg viewBox="0 0 300 300" width={size} height={size}>
          <Defs>
            <LinearGradient id="ap-sweep" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0%" stopColor={tone.lift} stopOpacity={0.75} />
              <Stop offset="100%" stopColor={tone.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d="M150 150 L150 20 A130 130 0 0 1 226 44 Z"
            fill="url(#ap-sweep)"
            opacity={0.24}
          />
          <Line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={22}
            stroke={tone.lift}
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={0.7}
          />
          <Circle cx={CX} cy={24} r={3.2} fill={tone.lift} />
        </Svg>
      </Animated.View>

      {/* orbiting particles */}
      {[0, 1, 2].map((n) => (
        <Orbiter key={n} index={n} size={size} color={n === 1 ? C.irisB : tone.accent} />
      ))}

      <View style={{ position: 'relative', zIndex: 2, alignItems: 'center' }}>{children}</View>
    </View>
  )
})

/* ── A single particle riding the outer track ────────────────────────────── */

function Orbiter({ index, size, color }: { index: number; size: number; color: string }) {
  const t = useSharedValue(0)
  const dur = 9000 + index * 3400
  const radius = size * 0.485
  const offset = index * (TAU / 3)

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false)
    return () => cancelAnimation(t)
  }, [t, dur])

  const style = useAnimatedStyle(() => {
    'worklet'
    const a = t.value * TAU + offset
    return {
      transform: [
        { translateX: Math.cos(a) * radius },
        { translateY: Math.sin(a) * radius },
        { scale: interpolate(Math.sin(a * 2), [-1, 1], [0.7, 1.25]) },
      ],
      opacity: interpolate(Math.sin(a), [-1, 1], [0.35, 0.95]),
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  )
}
