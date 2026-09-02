/* ============================================================================
   LARGE TITLE — the iOS collapsing navigation bar
   ----------------------------------------------------------------------------
   UIKit's large-title behaviour, rebuilt on scroll offset:

     • at rest the title sits large in the content, and the bar is transparent
     • as content scrolls under it, the bar's material and its separator
       fade in — the bar only becomes glass once there is something behind it
     • the large title slides up and fades out, and a compact title fades in
       to replace it, crossing over around the same point

   Everything is driven from one shared scroll value on the UI thread, so the
   bar tracks the finger exactly rather than lagging a frame behind.
   ========================================================================== */

import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Material } from './Material'
import { C } from '@/lib/colors'
import { F } from '@/lib/type'

/** Scroll distance over which the bar swaps from large to compact. */
export const TITLE_COLLAPSE = 52
/** Height of the compact bar, excluding the safe-area inset. */
export const NAV_BAR_HEIGHT = 44

export function LargeTitleBar({
  title,
  scrollY,
  leading,
  trailing,
}: {
  title: string
  scrollY: SharedValue<number>
  leading?: ReactNode
  trailing?: ReactNode
}) {
  const insets = useSafeAreaInsets()

  // The material only appears once content is actually behind the bar.
  const chrome = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, TITLE_COLLAPSE * 0.6], [0, 1], Extrapolation.CLAMP),
  }))

  // Compact title crosses in as the large one leaves.
  const compact = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [TITLE_COLLAPSE * 0.55, TITLE_COLLAPSE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [TITLE_COLLAPSE * 0.55, TITLE_COLLAPSE],
          [8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }))

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { paddingTop: insets.top, height: insets.top + NAV_BAR_HEIGHT }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, chrome]} pointerEvents="none">
        <Material kind="regular" separator="bottom" specular={false} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.row}>
        <View style={styles.side}>{leading}</View>
        <Animated.Text numberOfLines={1} style={[styles.compactTitle, compact]}>
          {title}
        </Animated.Text>
        <View style={[styles.side, styles.sideRight]}>{trailing}</View>
      </View>
    </View>
  )
}

/** The large title itself, placed as the first item in the scroll content. */
export function LargeTitle({
  children,
  scrollY,
  subtitle,
}: {
  children: string
  scrollY: SharedValue<number>
  subtitle?: ReactNode
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, TITLE_COLLAPSE * 0.85],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, TITLE_COLLAPSE],
          [0, -14],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }))

  return (
    <Animated.View style={[styles.largeWrap, style]}>
      <Text style={styles.largeTitle}>{children}</Text>
      {subtitle}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  row: {
    height: NAV_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  side: { minWidth: 44, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  compactTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: F.semibold,
    fontSize: 16,
    letterSpacing: -0.4,
    color: C.ink,
  },
  largeWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  largeTitle: {
    fontFamily: F.semibold,
    // iOS large title is 34pt with tight tracking.
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -1.4,
    color: C.ink,
  },
})
