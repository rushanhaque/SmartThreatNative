/* ============================================================================
   MOTION
   ----------------------------------------------------------------------------
   The React Native answer to GSAP + ScrollTrigger. Every animation here is a
   Reanimated worklet, which means it is evaluated on the UI thread — the
   telemetry loop can be re-fusing 240 frames of sensor data in JS and none of
   this drops a frame.

   Vocabulary:
     Reveal        — entrance on mount, or when scrolled into view
     Stagger       — sequences a group of Reveals
     Pressable3D   — spring scale + subtle tilt on touch
     Counter       — odometer for numeric readouts
     Float         — perpetual gentle drift, for hero ornaments
     Pulse         — breathing halo for live/threat states
   ========================================================================== */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

/* Expo's easing curves, matched to the web build's --ease-out-expo. */
export const EASE = {
  outExpo: Easing.bezier(0.16, 1, 0.3, 1),
  outQuart: Easing.bezier(0.25, 1, 0.5, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
} as const

export const SPRING = {
  soft:  { damping: 18, stiffness: 160, mass: 0.9 },
  snappy:{ damping: 22, stiffness: 320, mass: 0.7 },
  bouncy:{ damping: 11, stiffness: 190, mass: 0.8 },
} as const

/* ── Stagger context ─────────────────────────────────────────────────────── */

const StaggerCtx = createContext<{ base: number; step: number }>({ base: 0, step: 0 })

export function Stagger({
  children,
  base = 0,
  step = 70,
}: {
  children: ReactNode
  base?: number
  step?: number
}) {
  const value = useMemo(() => ({ base, step }), [base, step])
  return <StaggerCtx.Provider value={value}>{children}</StaggerCtx.Provider>
}

/* ── Reveal ──────────────────────────────────────────────────────────────── */

export type RevealKind = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blurUp'

/**
 * Entrance animation. `index` slots it into the surrounding <Stagger>.
 * `scrollY` + `triggerAt` turn it into a scroll-trigger instead of a mount
 * animation — the element waits until the viewport reaches it.
 */
export function Reveal({
  children,
  kind = 'up',
  index = 0,
  delay,
  distance = 26,
  duration = 720,
  style,
}: {
  children: ReactNode
  kind?: RevealKind
  index?: number
  delay?: number
  distance?: number
  duration?: number
  style?: StyleProp<ViewStyle>
}) {
  const { base, step } = useContext(StaggerCtx)
  const wait = delay ?? base + index * step
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withDelay(wait, withTiming(1, { duration, easing: EASE.outExpo }))
  }, [wait, duration, t])

  const aStyle = useAnimatedStyle(() => {
    'worklet'
    const p = t.value
    const out: Record<string, unknown> = { opacity: p }
    const transform: Array<Record<string, number>> = []

    if (kind === 'up')     transform.push({ translateY: interpolate(p, [0, 1], [distance, 0]) })
    if (kind === 'down')   transform.push({ translateY: interpolate(p, [0, 1], [-distance, 0]) })
    if (kind === 'left')   transform.push({ translateX: interpolate(p, [0, 1], [distance, 0]) })
    if (kind === 'right')  transform.push({ translateX: interpolate(p, [0, 1], [-distance, 0]) })
    if (kind === 'scale')  transform.push({ scale: interpolate(p, [0, 1], [0.9, 1]) })
    if (kind === 'blurUp') {
      transform.push({ translateY: interpolate(p, [0, 1], [distance, 0]) })
      transform.push({ scale: interpolate(p, [0, 1], [0.96, 1]) })
    }

    out.transform = transform
    return out as never
  })

  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>
}

/* ── Scroll-triggered reveal ─────────────────────────────────────────────── */

/**
 * Fires once the element's measured top crosses `triggerRatio` of the viewport.
 * Mirrors ScrollTrigger's `start: 'top 88%'` behaviour.
 */
export function ScrollReveal({
  children,
  scrollY,
  viewportHeight,
  kind = 'up',
  distance = 28,
  duration = 760,
  triggerRatio = 0.9,
  style,
}: {
  children: ReactNode
  scrollY: SharedValue<number>
  viewportHeight: number
  kind?: RevealKind
  distance?: number
  duration?: number
  triggerRatio?: number
  style?: StyleProp<ViewStyle>
}) {
  const top = useSharedValue(Number.POSITIVE_INFINITY)
  const t = useSharedValue(0)
  const [armed, setArmed] = useState(false)

  useDerivedValue(() => {
    'worklet'
    if (t.value === 1) return
    const threshold = scrollY.value + viewportHeight * triggerRatio
    if (top.value <= threshold) {
      t.value = withTiming(1, { duration, easing: EASE.outExpo })
    }
  })

  const aStyle = useAnimatedStyle(() => {
    'worklet'
    const p = t.value
    const transform: Array<Record<string, number>> = []
    if (kind === 'up')    transform.push({ translateY: interpolate(p, [0, 1], [distance, 0]) })
    if (kind === 'left')  transform.push({ translateX: interpolate(p, [0, 1], [distance, 0]) })
    if (kind === 'right') transform.push({ translateX: interpolate(p, [0, 1], [-distance, 0]) })
    if (kind === 'scale') transform.push({ scale: interpolate(p, [0, 1], [0.92, 1]) })
    if (kind === 'blurUp') {
      transform.push({ translateY: interpolate(p, [0, 1], [distance, 0]) })
      transform.push({ scale: interpolate(p, [0, 1], [0.97, 1]) })
    }
    return { opacity: p, transform } as never
  })

  return (
    <Animated.View
      style={[style, aStyle]}
      onLayout={(e) => {
        top.value = e.nativeEvent.layout.y
        if (!armed) setArmed(true)
      }}
    >
      {children}
    </Animated.View>
  )
}

/* ── Parallax ────────────────────────────────────────────────────────────── */

/** Moves at a fraction of scroll speed, and optionally fades/shrinks with it. */
export function Parallax({
  children,
  scrollY,
  speed = 0.35,
  fade = 0,
  shrink = 0,
  style,
}: {
  children: ReactNode
  scrollY: SharedValue<number>
  speed?: number
  /** px of scroll over which opacity reaches 0. 0 disables. */
  fade?: number
  /** px of scroll over which scale reaches 0.9. 0 disables. */
  shrink?: number
  style?: StyleProp<ViewStyle>
}) {
  const aStyle = useAnimatedStyle(() => {
    'worklet'
    const y = scrollY.value
    const transform: Array<Record<string, number>> = [{ translateY: y * speed }]
    if (shrink > 0) {
      transform.push({
        scale: interpolate(y, [0, shrink], [1, 0.9], Extrapolation.CLAMP),
      })
    }
    return {
      transform,
      opacity: fade > 0 ? interpolate(y, [0, fade], [1, 0], Extrapolation.CLAMP) : 1,
    } as never
  })

  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>
}

/* ── Pressable with spring + depth ───────────────────────────────────────── */

export function Pressable3D({
  children,
  onPress,
  disabled,
  style,
  containerStyle,
  scaleTo = 0.955,
  haptic,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: {
  children?: ReactNode
  onPress?: () => void
  disabled?: boolean
  /** Applied to the animated inner view. */
  style?: StyleProp<ViewStyle>
  /** Applied to the touchable itself — use for flex/width in a row. */
  containerStyle?: StyleProp<ViewStyle>
  scaleTo?: number
  haptic?: () => void
  accessibilityRole?: PressableProps['accessibilityRole']
  accessibilityLabel?: string
  accessibilityState?: PressableProps['accessibilityState']
}) {
  const p = useSharedValue(0)

  const aStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      transform: [
        { scale: interpolate(p.value, [0, 1], [1, scaleTo]) },
        { translateY: interpolate(p.value, [0, 1], [0, 1.5]) },
      ],
      opacity: interpolate(p.value, [0, 1], [1, 0.94]),
    }
  })

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={containerStyle}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPressIn={() => {
        p.value = withSpring(1, SPRING.snappy)
        haptic?.()
      }}
      onPressOut={() => {
        p.value = withSpring(0, SPRING.soft)
      }}
    >
      <Animated.View style={[style, aStyle]}>{children}</Animated.View>
    </Pressable>
  )
}

/* ── Counter — odometer for the score readout ────────────────────────────── */

/**
 * Odometer that ticks entirely on the UI thread.
 *
 * The obvious implementation — a shared value plus `runOnJS(setState)` in a
 * derived value — re-renders React on every animation frame, roughly sixty
 * times a second, for a number that changes once. Driving an uneditable
 * TextInput through `useAnimatedProps` writes the text natively instead, so
 * the count costs zero React renders.
 */
export function Counter({
  value,
  style,
  duration = 900,
}: {
  value: number
  style?: StyleProp<TextStyle>
  duration?: number
}) {
  const v = useSharedValue(value)

  useEffect(() => {
    v.value = withTiming(value, { duration, easing: EASE.outExpo })
  }, [value, duration, v])

  const animatedProps = useAnimatedProps(() => {
    'worklet'
    return { text: String(Math.round(v.value)) } as never
  })

  return (
    <AnimatedTextInput
      editable={false}
      // iOS needs a defaultValue for the first paint; after that the native
      // `text` prop above drives it.
      defaultValue={String(Math.round(value))}
      style={[counterStyles.base, style]}
      accessibilityRole="text"
      accessibilityLabel={String(Math.round(value))}
      animatedProps={animatedProps}
    />
  )
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

const counterStyles = StyleSheet.create({
  base: {
    padding: 0,
    margin: 0,
    // TextInput adds platform chrome a Text node does not.
    borderWidth: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
})

/* ── Float — perpetual drift ─────────────────────────────────────────────── */

export function Float({
  children,
  amplitude = 6,
  duration = 4200,
  delay = 0,
  style,
}: {
  children: ReactNode
  amplitude?: number
  duration?: number
  delay?: number
  style?: StyleProp<ViewStyle>
}) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    )
  }, [duration, delay, t])

  const aStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      transform: [{ translateY: interpolate(t.value, [0, 1], [-amplitude, amplitude]) }],
    }
  })

  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>
}

/* ── Pulse — breathing halo for live/threat states ───────────────────────── */

export function Pulse({
  size,
  color,
  duration = 2000,
  style,
}: {
  size: number
  color: string
  duration?: number
  style?: StyleProp<ViewStyle>
}) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: EASE.outQuart }), -1, false)
  }, [duration, t])

  const aStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      opacity: interpolate(t.value, [0, 0.15, 1], [0, 0.45, 0]),
      transform: [{ scale: interpolate(t.value, [0, 1], [0.55, 2.3]) }],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        aStyle,
      ]}
    />
  )
}
