/* ============================================================================
   APERTURE RING — the primary instrument
   ----------------------------------------------------------------------------
   72 blades on a 5° pitch, drawn in one flat ink. Filled blades step through
   three discrete opacities rather than fading continuously, so the ring reads
   as a counted scale — like a printed dial — instead of a glow.

   Motion is Reanimated on the UI thread; blade geometry is module-level and
   only re-derives when the filled count actually changes.
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
import Svg, { Circle, G, Line } from 'react-native-svg'
import type { ThreatClass } from '@/engine/types'
import { C, TONES, alpha } from '@/lib/colors'

const BLADES = 72
const TAU = Math.PI * 2
const CX = 150
const CY = 150

const GEOM = Array.from({ length: BLADES }, (_, i) => {
  const a = (i / BLADES) * TAU - Math.PI / 2
  const major = i % 6 === 0
  const inner = major ? 101 : 106
  const outer = 128
  return {
    i,
    major,
    x1: CX + Math.cos(a) * inner,
    y1: CY + Math.sin(a) * inner,
    x2: CX + Math.cos(a) * outer,
    y2: CY + Math.sin(a) * outer,
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

  const spin = useSharedValue(0)

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false)
    return () => cancelAnimation(spin)
  }, [spin])

  const sweepStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      opacity: scanning ? 1 : 0,
      transform: [{ rotate: `${spin.value * 360}deg` }],
    }
  })

  const blades = useMemo(
    () =>
      GEOM.map((b) => {
        const on = b.i < filled
        const lead = filled - b.i
        // Three discrete steps, not a ramp — a counted scale, not a glow.
        const opacity = on ? (lead <= 3 ? 1 : lead <= 18 ? 0.72 : 0.44) : b.major ? 0.22 : 0.1
        return { ...b, on, opacity }
      }),
    [filled],
  )

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* flat tint disc — a block of colour, not a glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 0.66,
          height: size * 0.66,
          borderRadius: size,
          backgroundColor: tone.tint,
        }}
      />

      <Svg viewBox="0 0 300 300" width={size} height={size} style={{ position: 'absolute' }}>
        {/* structural hairlines */}
        <Circle cx={CX} cy={CY} r={98} stroke={C.line} strokeWidth={1.5} fill="none" />
        <Circle cx={CX} cy={CY} r={134} stroke={C.line2} strokeWidth={1.5} fill="none" />

        <G strokeLinecap="butt">
          {blades.map((b) => (
            <Line
              key={b.i}
              x1={b.x1}
              y1={b.y1}
              x2={b.x2}
              y2={b.y2}
              stroke={b.on ? tone.accent : C.ink}
              strokeWidth={b.major ? 3.4 : 2}
              opacity={b.opacity}
            />
          ))}
        </G>
      </Svg>

      {/* scan hand — a single flat needle */}
      <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]} pointerEvents="none">
        <Svg viewBox="0 0 300 300" width={size} height={size}>
          <Line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={26}
            stroke={tone.accent}
            strokeWidth={2}
            strokeLinecap="butt"
            opacity={0.5}
          />
          <Circle cx={CX} cy={26} r={4} fill={tone.accent} />
        </Svg>
      </Animated.View>

      <View style={{ position: 'relative', zIndex: 2, alignItems: 'center' }}>{children}</View>
    </View>
  )
})
