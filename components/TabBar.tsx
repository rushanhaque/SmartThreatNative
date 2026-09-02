/* ============================================================================
   TAB BAR — floating liquid glass
   ----------------------------------------------------------------------------
   A detached glass capsule rather than an edge-to-edge bar. The active pill
   springs between slots on the UI thread; the icon lifts, the label fades up,
   and a spectral underglow tracks the pill so the brand gradient reads even
   at 10px.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Glass } from './Glass'
import { Icon, type IconName } from './Icon'
import { SPRING } from './motion'
import { C, RADIUS, alpha } from '@/lib/colors'
import { F } from '@/lib/type'

const ICONS: Record<string, IconName> = {
  index: 'shield',
  devices: 'radio',
  history: 'clock',
  settings: 'sliders',
}

const LABELS: Record<string, string> = {
  index: 'Shield',
  devices: 'Devices',
  history: 'History',
  settings: 'Settings',
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const [w, setW] = useState(0)
  const routes = state.routes
  const count = routes.length
  const pad = 6
  const cell = w > 0 ? (w - pad * 2) / count : 0

  const x = useSharedValue(0)
  const placed = useRef(false)

  useEffect(() => {
    if (cell <= 0) return
    const target = state.index * cell
    if (!placed.current) {
      // First measurement: snap, so a deep link lands with the pill already
      // under the right tab instead of sliding in from slot zero.
      placed.current = true
      x.value = target
    } else {
      x.value = withSpring(target, SPRING.snappy)
    }
  }, [state.index, cell, x])

  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }))

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <Glass variant="raised" radius={RADIUS.xl} style={styles.bar}>
        <View style={styles.inner} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {/* travelling pill */}
          {cell > 0 ? (
            <Animated.View style={[styles.pill, { width: cell - 8 }, pill]}>
              <LinearGradient
                colors={[alpha(C.irisA, 0.16), alpha(C.irisB, 0.13), alpha(C.irisC, 0.15)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.md }]}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: RADIUS.md,
                    borderWidth: StyleSheet.hairlineWidth * 1.5,
                    borderColor: alpha(C.irisA, 0.22),
                  },
                ]}
              />
              {/* spectral underglow */}
              <LinearGradient
                colors={[C.irisA, C.irisB, C.irisC]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.pillGlow}
              />
            </Animated.View>
          ) : null}

          {routes.map((route, i) => (
            <TabItem
              key={route.key}
              routeName={route.name}
              focused={state.index === i}
              onPress={() => {
                const evt = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (state.index !== i && !evt.defaultPrevented) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
                  navigation.navigate(route.name)
                }
              }}
            />
          ))}
        </View>
      </Glass>
    </View>
  )
}

function TabItem({
  routeName,
  focused,
  onPress,
}: {
  routeName: string
  focused: boolean
  onPress: () => void
}) {
  const p = useSharedValue(focused ? 1 : 0)

  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, SPRING.bouncy)
  }, [focused, p])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(p.value, [0, 1], [0, -2]) },
      { scale: interpolate(p.value, [0, 1], [1, 1.12]) },
    ],
  }))

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.6, 1]),
    transform: [{ translateY: interpolate(p.value, [0, 1], [1, 0]) }],
    color: interpolateColor(p.value, [0, 1], [C.ink3, C.ink]),
  }))

  const color = focused ? C.irisA : C.ink3

  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={4}>
      <Animated.View style={iconStyle}>
        <Icon
          name={ICONS[routeName] ?? 'shield'}
          size={21}
          color={color}
          strokeWidth={focused ? 2.1 : 1.7}
        />
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>
        {LABELS[routeName] ?? routeName}
      </Animated.Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    padding: 6,
    height: 66,
    alignItems: 'center',
  },
  pill: {
    position: 'absolute',
    left: 6 + 4,
    top: 6,
    bottom: 6,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  pillGlow: {
    position: 'absolute',
    bottom: 0,
    left: '22%',
    right: '22%',
    height: 2.5,
    borderRadius: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 0.1,
  },
})
