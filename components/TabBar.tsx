/* ============================================================================
   TAB BAR — floating chrome
   ----------------------------------------------------------------------------
   A detached bar in Apple's regular material: content blurs beneath it as you
   scroll, which is the cue that this floats above the page rather than
   belonging to it. The colour on top stays flat — a Klein-blue block behind
   the active icon and a solid rule above it — so the material reads as depth,
   not as a wash of colour.

   The block springs between slots on the UI thread, and switching fires the
   selection haptic iOS uses for segmented pickers rather than an impact.
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
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Material } from './Material'
import { Icon, type IconName } from './Icon'
import { SPRING } from './motion'
import { C, RADIUS, SHADOW, alpha } from '@/lib/colors'
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
  const pad = 6
  const cell = w > 0 ? (w - pad * 2) / routes.length : 0

  const x = useSharedValue(0)
  const placed = useRef(false)

  useEffect(() => {
    if (cell <= 0) return
    const target = state.index * cell
    if (!placed.current) {
      placed.current = true
      x.value = target
    } else {
      x.value = withSpring(target, SPRING.snappy)
    }
  }, [state.index, cell, x])

  const block = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <Material kind="regular" radius={RADIUS.lg} style={styles.bar}>
        <View style={styles.inner} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {cell > 0 ? (
            <Animated.View style={[styles.block, { width: cell - 8 }, block]}>
              <View style={styles.blockRule} />
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
                  Haptics.selectionAsync().catch(() => {})
                  navigation.navigate(route.name)
                }
              }}
            />
          ))}
        </View>
      </Material>
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
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, -2]) }],
  }))

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [C.ink3, C.klein]),
  }))

  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={4}>
      <Animated.View style={iconStyle}>
        <Icon
          name={ICONS[routeName] ?? 'shield'}
          size={21}
          color={focused ? C.klein : C.ink3}
          strokeWidth={focused ? 2.2 : 1.7}
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
    paddingHorizontal: 12,
  },
  bar: {
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.line2,
    overflow: 'hidden',
    ...SHADOW.lift,
  },
  inner: {
    flexDirection: 'row',
    padding: 6,
    height: 64,
    alignItems: 'center',
  },
  block: {
    position: 'absolute',
    left: 6 + 4,
    top: 6,
    bottom: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: alpha(C.klein, 0.09),
    overflow: 'hidden',
  },
  blockRule: {
    position: 'absolute',
    top: 0,
    left: '26%',
    right: '26%',
    height: 3,
    backgroundColor: C.klein,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  label: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 0.1,
  },
})
