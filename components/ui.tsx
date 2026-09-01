import React from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, StyleProp,
} from 'react-native'
import { C } from '../lib/colors'

/* ── Label ───────────────────────────────────────────────────────────────── */

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.label, style]}>{children}</Text>
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

export function Panel({
  children,
  style,
  accent,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  accent?: string
}) {
  return (
    <View
      style={[
        s.panel,
        accent ? { borderColor: hexAlpha(accent, 0.22) } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  )
}

/* ── PanelHeader ─────────────────────────────────────────────────────────── */

export function PanelHeader({
  title,
  hint,
  right,
}: {
  title: string
  hint?: string
  right?: React.ReactNode
}) {
  return (
    <View style={s.panelHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.panelTitle}>{title}</Text>
        {hint ? <Text style={s.panelHint} numberOfLines={1}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  )
}

/* ── Divider ─────────────────────────────────────────────────────────────── */

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line2, marginHorizontal: 16 }} />
}

/* ── Pill ────────────────────────────────────────────────────────────────── */

export function Pill({
  children,
  accent,
}: {
  children: React.ReactNode
  accent?: string
}) {
  const color = accent ?? C.irisB
  return (
    <View style={[s.pill, { backgroundColor: hexAlpha(color, 0.12), borderColor: hexAlpha(color, 0.28) }]}>
      <Text style={[s.pillText, { color }]}>{children}</Text>
    </View>
  )
}

/* ── Button ──────────────────────────────────────────────────────────────── */

export function Button({
  children,
  onPress,
  variant = 'default',
  style,
}: {
  children: React.ReactNode
  onPress?: () => void
  variant?: 'default' | 'ghost' | 'accent' | 'quiet'
  style?: StyleProp<ViewStyle>
}) {
  const bg =
    variant === 'accent' ? C.irisA
    : variant === 'ghost' ? 'transparent'
    : variant === 'quiet' ? C.surface3
    : C.ink

  const fg =
    variant === 'ghost' ? C.ink3
    : variant === 'quiet' ? C.ink2
    : '#FFFFFF'

  const border =
    variant === 'ghost' ? C.line2 : 'transparent'

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        s.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'ghost' ? 1 : 0 },
        style,
      ]}
    >
      <Text style={[s.btnText, { color: fg }]}>{children}</Text>
    </TouchableOpacity>
  )
}

/* ── Row ─────────────────────────────────────────────────────────────────── */

export function Row({
  icon,
  title,
  sub,
  right,
  onPress,
}: {
  icon?: React.ReactNode
  title: string
  sub?: string
  right?: React.ReactNode
  onPress?: () => void
}) {
  const Container = onPress ? TouchableOpacity : View
  return (
    <Container
      activeOpacity={0.7}
      onPress={onPress}
      style={s.row}
    >
      {icon && <View style={s.rowIcon}>{icon}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.rowSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right}
    </Container>
  )
}

/* ── Switch ──────────────────────────────────────────────────────────────── */

import { Animated } from 'react-native'

export function Toggle({
  value,
  onValueChange,
}: {
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current
  React.useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start()
  }, [value, anim])

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 18] })

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={[s.toggleTrack, { backgroundColor: value ? C.safe : C.line2 }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[s.toggleThumb, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  )
}

/* ── Segmented control ───────────────────────────────────────────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <View style={s.segmented}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[s.segOpt, value === o.value && s.segOptActive]}
          activeOpacity={0.8}
        >
          <Text style={[s.segLabel, value === o.value && s.segLabelActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

/* ── Meter bar ───────────────────────────────────────────────────────────── */

export function MeterBar({ pct: p, accent }: { pct: number; accent?: string }) {
  return (
    <View style={s.meterTrack}>
      <View style={[s.meterFill, { width: `${Math.round(p * 100)}%`, backgroundColor: accent ?? C.irisB }]} />
    </View>
  )
}

/* ── Helper ──────────────────────────────────────────────────────────────── */

export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: C.ink4,
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  panelTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: C.ink4,
    textTransform: 'uppercase',
  },
  panelHint: {
    fontSize: 12,
    color: C.ink4,
    marginTop: 1,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  btn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
    letterSpacing: -0.1,
  },
  rowSub: {
    fontSize: 12,
    color: C.ink3,
    marginTop: 2,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 100,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: C.bg2,
    borderRadius: 9,
    padding: 2,
  },
  segOpt: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 7,
  },
  segOptActive: {
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.ink3,
  },
  segLabelActive: {
    color: C.ink,
    fontWeight: '600',
  },
  meterTrack: {
    height: 3,
    backgroundColor: C.surface3,
    borderRadius: 100,
    marginTop: 8,
    overflow: 'hidden',
  },
  meterFill: {
    height: 3,
    borderRadius: 100,
  },
})
