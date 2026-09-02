/* ============================================================================
   UI PRIMITIVES — flat spot ink
   ----------------------------------------------------------------------------
   Every fill here is one solid colour. Tone still travels by context, but a
   tone now resolves to a single ink rather than a blend, so state reads as a
   deliberate colour choice instead of decoration.
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
import { C, RADIUS, TONES, alpha, type Tone as ToneName, type ToneTokens } from '@/lib/colors'
import { F, T } from '@/lib/type'
import { Icon, type IconName } from './Icon'
import { Orb, Rule, Surface } from './Surface'
import { EASE, Pressable3D, Pulse, SPRING } from './motion'

/* ── Tone context ────────────────────────────────────────────────────────── */

const ToneCtx = createContext<ToneTokens>(TONES.neutral)

export function Tone({ value, children }: { value: ToneName; children: ReactNode }) {
  return <ToneCtx.Provider value={TONES[value]}>{children}</ToneCtx.Provider>
}

export function useTone() {
  return useContext(ToneCtx)
}

/* ── Labels ──────────────────────────────────────────────────────────────── */

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.micro, style]}>{children}</Text>
}

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
        <Rule width={16} height={3} color={t.accent} />
        <Text style={T.micro}>{children}</Text>
      </View>
      {right}
    </View>
  )
}

export const Press = Pressable3D

/* ── Button ──────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'accent' | 'quiet' | 'ghost' | 'danger'

const SIZES = {
  sm: { h: 38, px: 15, fs: 13, icon: 16, r: RADIUS.sm },
  md: { h: 48, px: 19, fs: 14.5, icon: 18, r: RADIUS.md },
  lg: { h: 54, px: 23, fs: 15.5, icon: 19, r: RADIUS.md },
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

  const skin: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: C.ink }
      : variant === 'accent'
        ? { backgroundColor: t.accent }
        : variant === 'danger'
          ? { backgroundColor: C.threat }
          : variant === 'quiet'
            ? {
                backgroundColor: C.surface,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: C.line2,
              }
            : { backgroundColor: 'transparent' }

  const fg =
    variant === 'primary' ? C.surface
    : variant === 'accent' ? t.on
    : variant === 'danger' ? '#FFFFFF'
    : variant === 'ghost' ? C.ink2
    : C.ink

  return (
    <Pressable3D onPress={onPress} disabled={disabled} style={[{ opacity: disabled ? 0.4 : 1 }, style]}>
      <View
        style={[
          {
            height: s.h,
            paddingHorizontal: s.px,
            borderRadius: s.r,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
          },
          skin,
        ]}
      >
        {icon ? <Icon name={icon} size={s.icon} color={fg} strokeWidth={2} /> : null}
        <Text style={{ fontFamily: F.semibold, fontSize: s.fs, color: fg, letterSpacing: -0.2 }}>
          {children}
        </Text>
        {iconAfter ? <Icon name={iconAfter} size={s.icon} color={fg} strokeWidth={2} /> : null}
      </View>
    </Pressable3D>
  )
}

export function IconButton({
  name,
  size = 20,
  color = C.ink2,
  onPress,
}: {
  name: IconName
  size?: number
  color?: string
  onPress?: () => void
}) {
  return (
    <Pressable3D onPress={onPress}>
      <Surface variant="flat" radius={RADIUS.sm}>
        <View style={{ height: 42, width: 42, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={name} size={size} color={color} strokeWidth={1.9} />
        </View>
      </Surface>
    </Pressable3D>
  )
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

export function Panel({
  children,
  style,
  variant = 'card',
  edge,
  edgeBar,
}: {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  variant?: 'card' | 'raised' | 'flat'
  edge?: string
  edgeBar?: boolean
}) {
  return (
    <Surface variant={variant} edge={edge} edgeBar={edgeBar} style={style}>
      {children}
    </Surface>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Rule width={13} height={3} color={t.accent} />
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
  /** Saturated block instead of a pale tint. */
  solid?: boolean
}) {
  const t = useTone()

  const bg =
    solid ? t.accent
    : tone === 'accent' ? t.tint
    : tone === 'muted' ? C.surface3
    : C.bg2

  const fg =
    solid ? t.on
    : tone === 'accent' ? t.accent
    : tone === 'muted' ? C.ink3
    : C.ink2

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: bg },
        !solid && tone === 'accent' && { borderColor: alpha(t.accent, 0.22), borderWidth: StyleSheet.hairlineWidth * 2 },
      ]}
    >
      {icon ? <Icon name={icon} size={12} color={fg} strokeWidth={2.2} /> : null}
      <Text style={{ fontFamily: F.semibold, fontSize: 11, lineHeight: 14, color: fg, letterSpacing: 0 }}>
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
          }}
        />
      </View>
      {label ? <Text style={T.micro}>{label}</Text> : null}
    </View>
  )
}

/* ── Segmented control ───────────────────────────────────────────────────── */

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
  const [w, setW] = useState(0)
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const x = useSharedValue(0)
  const pad = 3
  const cell = w > 0 ? (w - pad * 2) / options.length : 0

  useEffect(() => {
    x.value = withSpring(idx * cell, SPRING.snappy)
  }, [idx, cell, x])

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <View style={[styles.segmented, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {cell > 0 ? (
        <Animated.View style={[styles.segmentedThumb, { width: cell }, thumb]} />
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

/* ── Switch ──────────────────────────────────────────────────────────────── */

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
    transform: [{ translateX: interpolate(p.value, [0, 1], [3, 24]) }],
  }))

  return (
    <Pressable onPress={() => onChange(!checked)} hitSlop={10}>
      <Animated.View style={[styles.switchTrack, trackStyle]}>
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
        paddingHorizontal: 17,
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
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: C.line }, style]} />
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
      <Orb size={54} color={t.accent} radius={RADIUS.md} soft>
        <Icon name={icon} size={22} color={t.accent} strokeWidth={1.9} />
      </Orb>
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

export function Bar({ value, height = 6 }: { value: number; height?: number }) {
  const t = useTone()
  const p = useSharedValue(0)

  useEffect(() => {
    p.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 800, easing: EASE.outExpo })
  }, [value, p])

  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }))

  return (
    <View style={{ height, backgroundColor: C.surface3, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: t.accent }, fill]} />
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingHorizontal: 17,
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
    borderRadius: RADIUS.xs,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.line2,
    backgroundColor: C.bg2,
    borderRadius: RADIUS.sm,
    padding: 3,
  },
  segmentedThumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: RADIUS.xs,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.line2,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: RADIUS.xs,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
})
