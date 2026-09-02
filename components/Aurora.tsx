/* ============================================================================
   AURORA — the living background
   ----------------------------------------------------------------------------
   Four soft chromatic blobs drifting on independent, slow, out-of-phase loops.
   Everything runs on the UI thread via Reanimated worklets, so the field keeps
   moving at display refresh rate even while JS is busy re-fusing telemetry.

   Rendered once at the root and shared by every screen — glass surfaces above
   simply blur whatever this is doing underneath.
   ========================================================================== */

import { memo, useEffect } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { C, alpha } from '@/lib/colors'

interface BlobSpec {
  id: string
  size: number
  from: [number, number]
  to: [number, number]
  color: string
  peak: number
  duration: number
  delay: number
}

function Blob({ spec }: { spec: BlobSpec }) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, {
        duration: spec.duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    )
  }, [spec.duration, t])

  const style = useAnimatedStyle(() => {
    'worklet'
    return {
      transform: [
        { translateX: interpolate(t.value, [0, 1], [spec.from[0], spec.to[0]]) },
        { translateY: interpolate(t.value, [0, 1], [spec.from[1], spec.to[1]]) },
        { scale: interpolate(t.value, [0, 0.5, 1], [1, 1.18, 1]) },
      ],
      opacity: interpolate(t.value, [0, 0.5, 1], [0.55, 0.85, 0.55]),
    }
  })

  // A radial falloff to fully transparent — no visible circle edge, which is
  // what separates an aurora from a stack of coloured discs. SVG is the only
  // way to get a real radial gradient here.
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: spec.size, height: spec.size },
        style,
      ]}
    >
      <Svg width={spec.size} height={spec.size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={spec.id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={spec.color} stopOpacity={spec.peak} />
            <Stop offset="42%"  stopColor={spec.color} stopOpacity={spec.peak * 0.55} />
            <Stop offset="72%"  stopColor={spec.color} stopOpacity={spec.peak * 0.18} />
            <Stop offset="100%" stopColor={spec.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${spec.id})`} />
      </Svg>
    </Animated.View>
  )
}

export const Aurora = memo(function Aurora() {
  const { width: W, height: H } = useWindowDimensions()
  const R = Math.max(W, 380)

  const blobs: BlobSpec[] = [
    {
      id: 'au-a',
      size: R * 1.5,
      from: [-R * 0.5, -R * 0.55],
      to: [-R * 0.12, -R * 0.3],
      color: C.violet,
      peak: 0.5,
      duration: 17000,
      delay: 0,
    },
    {
      id: 'au-b',
      size: R * 1.35,
      from: [W - R * 0.85, -R * 0.5],
      to: [W - R * 1.15, -R * 0.15],
      color: C.cyan,
      peak: 0.46,
      duration: 21000,
      delay: 900,
    },
    {
      id: 'au-c',
      size: R * 1.3,
      from: [-R * 0.5, H * 0.4],
      to: [-R * 0.15, H * 0.15],
      color: C.pink,
      peak: 0.36,
      duration: 25000,
      delay: 1800,
    },
    {
      id: 'au-d',
      size: R * 1.2,
      from: [W - R * 0.7, H * 0.45],
      to: [W - R * 1.0, H * 0.2],
      color: C.mint,
      peak: 0.34,
      duration: 19000,
      delay: 2600,
    },
  ]

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} pointerEvents="none">
      {blobs.map((b, i) => (
        <Blob key={i} spec={b} />
      ))}
      {/* porcelain veil — just enough to keep body text legible over the
          brightest part of the field, while letting hue through elsewhere */}
      <LinearGradient
        colors={[alpha(C.bg, 0.04), alpha(C.bg, 0.2), alpha(C.bg, 0.44)]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  )
})
