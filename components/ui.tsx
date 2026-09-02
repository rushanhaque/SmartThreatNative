/* ============================================================================
   UI PRIMITIVES — liquid glass edition
   ----------------------------------------------------------------------------
   Tone still travels by React context (RN has no CSS cascade), but every
   surface is now glass and every state change is a spring rather than a
   step. Interaction feedback is handled by Pressable3D so the whole app
   shares one touch feel.
   ========================================================================== */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { C, RADIUS, TONES, alpha, type Tone as ToneName, type ToneTokens } from '@/lib/colors'
import { F, T } from '@/lib/type'
import { Icon, type IconName } from './Icon'
import { Glass, GradientOrb, SpectrumRule } from './Glass'
import { EASE, Pressable3D, Pulse, SPRING } from './motion'

/* ── Tone context ────────────────────────────────────────────────────────── */

const ToneCtx = createContext<ToneTokens>(TONES.neutral)

export function Tone({ value, children }: { value: ToneName; children: ReactNode }) {
  return <ToneCtx.Provider value={TONES[value]}>{children}</ToneCtx.Provider>
}

export function useTone() {
  return useContext(ToneCtx)
}

/* ── Micro label ─────────────────────────────────────────────────────────── */

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.micro, style]}>{children}</Text>
}

/** Section heading with a spectral rule beneath it. */
export function SectionTitle({
  children,
  right,
  style,
}: {
  children: ReactNode
  right?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const t = useTone()
  return (
    <View style={[styles.sectionTitle, style]}>
      <View style={{ flex: 1 }}>
        <Text style={T.micro}>{children}</Text>
        <SpectrumRule width={22} height={2.5} colors={t.grad} style={{ marginTop: 6 }} />
      </View>
      {right}
    </View>
  )
}

/* Legacy alias kept so older call sites keep compiling. */
export const Press = Pressable3D

/* ── Button ──────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'accent' | 'quiet' | 'ghost' | 'danger'

const SIZES = {
  sm: { h: 38, px: 16, fs: 13, icon: 16, r: RADIUS.sm },
  md: { h: 48, px: 20, fs: 14.5, icon: 18, r: RADIUS.md },
  lg: { h: 56, px: 24, fs: 16, icon: 20, r: RADIUS.lg },
} as const

export function Button({
  variant = 'quiet',
  size = 'md',
  icon,
  iconAfter,
  onPress,
  disabled,
  children,
  style,
}: {
  variant?: ButtonVariant
  size?: keyof typeof SIZES
  icon?: IconName
  iconAfter?: IconName
  onPress?: () => void
  disabled?: boolean
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const t = useTone()
  const s = SIZES[size]

  const gradient: [string, string] | null =
    variant === 'primary' ? [C.ink2, C.ink]
    : variant === 'accent' ? t.grad
    : variant === 'danger' ? [C.threatLift, C.threat]
    : null

  const fg =
    variant === 'primary' || variant === 'accent' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? C.ink2
        : C.ink

  const body = (
    <View style={s2.btnInner(s)}>
      {icon ? <Icon name={icon} size={s.icon} color={fg} strokeWidth={1.9} /> : null}
      <Text style={{ fontFamily: F.semibold, fontSize: s.fs, color: fg, letterSpacing: -0.2 }}>
        {children}
      </Text>
      {iconAfter ? <Icon name={iconAfter} size={s.icon} color={fg} strokeWidth={1.9} /> : null}
    </View>
  )

  return (
    <Pressable3D
      onPress={onPress}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.4 : 1 }, style]}
    >
      {gradient ? (
        <View
          style={{
            height: s.h,
            borderRadius: s.r,
            overflow: 'hidden',
            shadowColor: gradient[1],
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* gloss */}
          <LinearGradient
            colors={[alpha('#FFFFFF', 0.32), 'transparent']}
            style={[StyleSheet.absoluteFill, { height: '55%' }]}
          />
          {body}
        </View>
      ) : variant === 'ghost' ? (
        <View style={{ height: s.h, borderRadius: s.r }}>{body}</View>
      ) : (
        <Glass variant="card" radius={s.r} style={{ height: s.h }}>
          {body}
        </Glass>
      )}
    </Pressable3D>
  )
}

const s2 = {
  btnInner: (s: (typeof SIZES)[keyof typeof SIZES]): ViewStyle => ({
    height: s.h,
    paddingHorizontal: s.px,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  }),
}

export function IconButton({
  name,
  size = 20,
  color = C.ink2,
  onPress,
  glass = true,
}: {
  name: IconName
  size?: number
  color?: string
  onPress?: () => void
  glass?: boolean
}) {
  const inner = (
    <View style={{ height: 42, width: 42, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size} color={color} strokeWidth={1.8} />
    </View>
  )
  return (
    <Pressable3D onPress={onPress}>
      {glass ? <Glass variant="card" radius={RADIUS.sm}>{inner}</Glass> : inner}
    </Pressable3D>
  )
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

export function Panel({
  children,
  style,
  variant = 'card',
  edge,
}: {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  variant?: 'card' | 'raised'
  edge?: string
  /** legacy no-op */
  lit?: boolean
}) {
  return (
    <Glass variant={variant} edge={edge} style={style}>
      {children}
    </Glass>
  )
}

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  const t = useTone()
  return (
    <View style={styles.panelHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SpectrumRule width={14} height={2.5} colors={t.grad} />
          <Label>{title}</Label>
        </View>
        {hint ? (
          <Text numberOfLines={1} style={styles.panelHint}>
            {hint}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}

/* ── Pill ────────────────────────────────────────────────────────────────── */

export function Pill({
  children,
  icon,
  tone = 'accent',
  solid = false,
}: {
  children: ReactNode
  icon?: IconName
  tone?: 'neutral' | 'accent' | 'muted'
  /** Filled gradient instead of a tinted wash. */
  solid?: boolean
}) {
  const t = useTone()

  if (solid) {
    return (
      <View style={styles.pillSolidWrap}>
        <LinearGradient
          colors={t.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {icon ? <Icon name={icon} size={12} color="#FFFFFF" strokeWidth={2} /> : null}
        <Text style={styles.pillSolidText}>{children}</Text>
      </View>
    )
  }

  const skin =
    tone === 'accent'
      ? { borderColor: alpha(t.accent, 0.28), backgroundColor: t.soft }
      : tone === 'muted'
        ? { borderColor: C.line, backgroundColor: alpha(C.ink4, 0.09) }
        : { borderColor: C.line, backgroundColor: C.glassSoft }
  const fg = tone === 'accent' ? t.accent : tone === 'muted' ? C.ink3 : C.ink2

  return (
    <View style={[styles.pill, skin]}>
      {icon ? <Icon name={icon} size={12} color={fg} strokeWidth={2} /> : null}
      <Text style={{ fontFamily: F.semibold, fontSize: 11, lineHeight: 14, color: fg, letterSpacing: -0.1 }}>
        {children}
      </Text>
    </View>
  )
}

/* ── Live indicator ──────────────────────────────────────────────────────── */

export function LiveDot({ label, active = true }: { label?: string; active?: boolean }) {
  const t = useTone()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
        {active ? <Pulse size={8} color={t.accent} duration={2000} /> : null}
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: active ? t.accent : C.ink4,
            shadowColor: t.accent,
            shadowOpacity: active ? 0.7 : 0,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      </View>
      {label ? <Text style={T.micro}>{label}</Text> : null}
    </View>
  )
}

/* ── Segmented control — sliding glass thumb ─────────────────────────────── */

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: Array<{ value: V; label: string }>
  value: V
  onChange: (v: V) => void
  style?: StyleProp<ViewStyle>
}) {
  const t = useTone()
  const [w, setW] = useState(0)
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const x = useSharedValue(0)
  const pad = 4
  const cell = w > 0 ? (w - pad * 2) / options.length : 0

  useEffect(() => {
    x.value = withSpring(idx * cell, SPRING.snappy)
  }, [idx, cell, x])

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <View
      style={[styles.segmented, style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {cell > 0 ? (
        <Animated.View style={[styles.segmentedThumb, { width: cell }, thumb]}>
          <LinearGradient
            colors={[alpha('#FFFFFF', 0.98), alpha('#FFFFFF', 0.86)]}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: RADIUS.xs,
                borderWidth: StyleSheet.hairlineWidth * 1.5,
                borderColor: alpha(t.accent, 0.22),
              },
            ]}
          />
        </Animated.View>
      ) : null}
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={{ flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontFamily: o.value === value ? F.semibold : F.medium,
              fontSize: 13,
              color: o.value === value ? C.ink : C.ink3,
              letterSpacing: -0.15,
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

/* ── Switch — gradient track, spring thumb ───────────────────────────────── */

export function Switch({
  checked,
  onChange,
  label: _label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  const t = useTone()
  const p = useSharedValue(checked ? 1 : 0)

  useEffect(() => {
    p.value = withSpring(checked ? 1 : 0, SPRING.snappy)
  }, [checked, p])

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [C.surface3, t.accent]),
  }))

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [3, 25]) },
      { scale: interpolate(p.value, [0, 0.5, 1], [1, 1.08, 1]) },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({ opacity: p.value }))

  return (
    <Pressable onPress={() => onChange(!checked)} hitSlop={10}>
      <Animated.View style={[styles.switchTrack, trackStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
          <LinearGradient
            colors={t.grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 15 }]}
          />
        </Animated.View>
        <Animated.View style={[styles.switchThumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  )
}

/* ── List row ────────────────────────────────────────────────────────────── */

export function Row({
  title,
  sub,
  right,
  icon,
  onPress,
  dense,
}: {
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  icon?: ReactNode
  onPress?: () => void
  dense?: boolean
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: dense ? 12 : 16,
      }}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 14.5, color: C.ink, letterSpacing: -0.2 }}>
          {title}
        </Text>
        {sub ? (
          <Text
            numberOfLines={1}
            style={{ fontFamily: F.regular, fontSize: 12.5, color: C.ink3, marginTop: 3 }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={17} color={C.ink4} /> : null)}
    </View>
  )
  return onPress ? <Pressable3D onPress={onPress}>{body}</Pressable3D> : body
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }, style]} />
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

export function Empty({
  icon = 'search',
  title,
  body,
}: {
  icon?: IconName
  title: string
  body?: string
}) {
  const t = useTone()
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 }}>
      <GradientOrb size={58} colors={t.grad} soft radius={20}>
        <Icon name={icon} size={22} color={t.accent} strokeWidth={1.8} />
      </GradientOrb>
      <Text style={{ fontFamily: F.semibold, fontSize: 16, color: C.ink, marginTop: 18, letterSpacing: -0.3 }}>
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            fontFamily: F.regular,
            fontSize: 13,
            lineHeight: 20,
            color: C.ink3,
            textAlign: 'center',
            marginTop: 6,
            maxWidth: 280,
          }}
        >
          {body}
        </Text>
      ) : null}
    </View>
  )
}

/* ── Progress bar ────────────────────────────────────────────────────────── */

export function Bar({ value, height = 5 }: { value: number; height?: number }) {
  const t = useTone()
  const p = useSharedValue(0)

  useEffect(() => {
    p.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 900, easing: EASE.outExpo })
  }, [value, p])

  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }))

  return (
    <View
      style={{ height, borderRadius: height / 2, backgroundColor: C.surface3, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, overflow: 'hidden' }, fill]}>
        <LinearGradient
          colors={t.grad}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  panelHint: {
    fontFamily: F.regular,
    fontSize: 12.5,
    color: C.ink3,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillSolidWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    overflow: 'hidden',
  },
  pillSolidText: {
    fontFamily: F.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: C.line,
    backgroundColor: alpha(C.ink, 0.045),
    borderRadius: RADIUS.sm,
    padding: 4,
  },
  segmentedThumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: RADIUS.xs,
    overflow: 'hidden',
    shadowColor: '#1B2559',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1B2559',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
})
