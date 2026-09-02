/* ============================================================================
   CONTEXT MENU — iOS long-press peek
   ----------------------------------------------------------------------------
   UIContextMenuInteraction's shape: press and hold, the item lifts and the
   rest of the screen blurs away behind it, then a menu springs in beneath.

   Two details do most of the work and are usually skipped:
     • the item *scales up* while everything else recedes — it is presented,
       not merely highlighted
     • a haptic fires at the moment the menu commits, not when the press
       begins, so the buzz confirms the gesture rather than predicting it
   ========================================================================== */

import { useState, type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Material } from './Material'
import { EASE, SPRING } from './motion'
import { Icon, type IconName } from './Icon'
import { C, RADIUS, SHADOW, alpha } from '@/lib/colors'
import { F } from '@/lib/type'

export interface MenuAction {
  label: string
  icon?: IconName
  /** Renders in vermillion and sits below a divider, as iOS does. */
  destructive?: boolean
  onPress: () => void
}

export function ContextMenu({
  children,
  actions,
  onPress,
}: {
  children: ReactNode
  actions: MenuAction[]
  onPress?: () => void
}) {
  const [open, setOpen] = useState(false)
  const press = useSharedValue(0)

  const commit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    setOpen(true)
  }

  const long = Gesture.LongPress()
    .minDuration(380)
    .onStart(() => {
      'worklet'
      runOnJS(commit)()
    })

  const tap = Gesture.Tap().onEnd((_e, ok) => {
    'worklet'
    if (ok && onPress) runOnJS(onPress)()
  })

  // The press-in swell that precedes the menu, as in iOS.
  const swell = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.97]) }],
  }))

  return (
    <>
      <GestureDetector gesture={Gesture.Exclusive(long, tap)}>
        <Animated.View
          // While presented, the original is hidden but keeps its space, so
          // the list does not reflow behind the menu.
          style={[swell, open && { opacity: 0 }]}
          onTouchStart={() => { press.value = withTiming(1, { duration: 180 }) }}
          onTouchEnd={() => { press.value = withSpring(0, SPRING.snappy) }}
          onTouchCancel={() => { press.value = withSpring(0, SPRING.snappy) }}
        >
          {children}
        </Animated.View>
      </GestureDetector>

      {/* Hosted in a Modal so the backdrop covers the window rather than being
          clipped to this card's layout box. */}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <MenuOverlay actions={actions} onDismiss={() => setOpen(false)}>
          {children}
        </MenuOverlay>
      </Modal>
    </>
  )
}

function MenuOverlay({
  children,
  actions,
  onDismiss,
}: {
  children: ReactNode
  actions: MenuAction[]
  onDismiss: () => void
}) {
  const t = useSharedValue(0)

  useState(() => {
    t.value = withSpring(1, SPRING.sheet)
    return null
  })

  const dismiss = () => {
    t.value = withTiming(0, { duration: 180, easing: EASE.inOut }, (done) => {
      'worklet'
      if (done) runOnJS(onDismiss)()
    })
  }

  const backdrop = useAnimatedStyle(() => ({ opacity: t.value }))

  const lifted = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [
      { scale: interpolate(t.value, [0, 1], [0.94, 1.03]) },
      { translateY: interpolate(t.value, [0, 1], [10, 0]) },
    ],
  }))

  const menu = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [
      { scale: interpolate(t.value, [0, 1], [0.86, 1]) },
      { translateY: interpolate(t.value, [0, 1], [-12, 0]) },
    ],
  }))

  const normal = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
        <Material kind="thick" style={StyleSheet.absoluteFill} specular={false} />
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <View style={styles.stack} pointerEvents="box-none">
        <Animated.View style={[styles.preview, lifted]} pointerEvents="none">
          {children}
        </Animated.View>

        <Animated.View style={[styles.menu, menu]}>
          {normal.map((a, i) => (
            <MenuRow
              key={a.label}
              action={a}
              divider={i < normal.length - 1}
              onDone={dismiss}
            />
          ))}
          {destructive.length > 0 ? <View style={styles.groupGap} /> : null}
          {destructive.map((a, i) => (
            <MenuRow
              key={a.label}
              action={a}
              divider={i < destructive.length - 1}
              onDone={dismiss}
            />
          ))}
        </Animated.View>
      </View>
    </View>
  )
}

function MenuRow({
  action,
  divider,
  onDone,
}: {
  action: MenuAction
  divider: boolean
  onDone: () => void
}) {
  const fg = action.destructive ? C.threat : C.ink
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={action.label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {})
        action.onPress()
        onDone()
      }}
      style={({ pressed }) => [
        styles.row,
        divider && styles.rowDivider,
        pressed && { backgroundColor: alpha(C.ink, 0.06) },
      ]}
    >
      <Text style={[styles.rowLabel, { color: fg }]}>{action.label}</Text>
      {action.icon ? <Icon name={action.icon} size={18} color={fg} strokeWidth={1.9} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: { zIndex: 100, justifyContent: 'center' },
  stack: { paddingHorizontal: 20, gap: 12, maxHeight: '86%' },
  preview: {},
  menu: {
    alignSelf: 'flex-end',
    minWidth: 240,
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.lift,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowLabel: { fontFamily: F.medium, fontSize: 15.5, letterSpacing: -0.3 },
  groupGap: { height: StyleSheet.hairlineWidth * 4, backgroundColor: C.line2 },
})
