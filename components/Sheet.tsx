/* ============================================================================
   SHEET — UISheetPresentationController, rebuilt
   ----------------------------------------------------------------------------
   The behaviours that make an iOS sheet feel like an iOS sheet, and which are
   usually the ones missing from a hand-rolled one:

     • detents — it rests at defined heights, not wherever you let go
     • velocity decides the destination, not just displacement, so a fast
       flick dismisses from near the top
     • rubber-banding above the tallest detent, so it resists rather than stops
     • the grabber and the backdrop track the drag continuously
     • dragging is handed off to the gesture thread; JS is only told the final
       resting decision

   Pan handling runs in the gesture worklet, so the sheet stays glued to the
   finger even while the telemetry loop is busy in JS.
   ========================================================================== */

import { useCallback, useEffect, type ReactNode } from 'react'
import { StyleSheet, View, useWindowDimensions, BackHandler, Platform } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Material } from './Material'
import { EASE, SPRING } from './motion'
import { C, RADIUS, alpha } from '@/lib/colors'

/** Fraction of the screen each detent occupies. */
export type Detent = number

export function Sheet({
  open,
  onClose,
  children,
  detents = [0.55, 0.92],
  initialDetent = 0,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  detents?: Detent[]
  initialDetent?: number
}) {
  const { height: H } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  // Translate values, measured from the top of the screen downward.
  const stops = detents.map((d) => H * (1 - d)).sort((a, b) => a - b)
  const closedY = H
  const y = useSharedValue(closedY)
  const dragging = useSharedValue(0)

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (open) {
      y.value = withSpring(stops[Math.min(initialDetent, stops.length - 1)], SPRING.sheet)
    } else {
      y.value = withTiming(closedY, { duration: 260, easing: EASE.inOut })
    }
    // stops is derived from H; re-running on H change is correct.
  }, [open, H])

  // Android hardware back should dismiss, as it would a native sheet.
  useEffect(() => {
    if (!open || Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close()
      return true
    })
    return () => sub.remove()
  }, [open, close])

  const pan = Gesture.Pan()
    .onStart(() => {
      'worklet'
      dragging.value = 1
    })
    .onChange((e) => {
      'worklet'
      const next = y.value + e.changeY
      const top = stops[0]
      // Rubber-band above the tallest detent rather than hard-stopping.
      y.value = next < top ? top - (top - next) * 0.28 : next
    })
    .onEnd((e) => {
      'worklet'
      dragging.value = 0
      const v = e.velocityY
      const projected = y.value + v * 0.12

      // A fast downward flick dismisses regardless of position.
      if (v > 900 || projected > H * 0.78) {
        y.value = withTiming(closedY, { duration: 220, easing: EASE.inOut }, (done) => {
          if (done) runOnJS(close)()
        })
        return
      }

      // Otherwise settle to whichever detent the projected position is nearest.
      let best = stops[0]
      for (const s of stops) {
        if (Math.abs(s - projected) < Math.abs(best - projected)) best = s
      }
      y.value = withSpring(best, SPRING.sheet)
    })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [closedY, stops[0]], [0, 1], Extrapolation.CLAMP),
  }))

  const grabberStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragging.value, [0, 1], [0.28, 0.5]),
    transform: [{ scaleX: interpolate(dragging.value, [0, 1], [1, 1.12]) }],
  }))

  if (!open) return null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: alpha(C.ink, 0.28) }]}
          onTouchEnd={() => {
            Haptics.selectionAsync().catch(() => {})
            close()
          }}
        />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, { height: H }, sheetStyle]}>
          <Material kind="thick" radius={RADIUS.xl} style={styles.material}>
            <View style={styles.grabberWrap}>
              <Animated.View style={[styles.grabber, grabberStyle]} />
            </View>
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
          </Material>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  material: {
    flex: 1,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  grabberWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.ink,
  },
})
