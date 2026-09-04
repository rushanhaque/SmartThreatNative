/* ============================================================================
   MATERIAL — Apple-style blur chrome
   ----------------------------------------------------------------------------
   Apple reserves glass for *chrome*: the tab bar, nav bars, sheets, popovers —
   surfaces that float above content and need to signal "this is not part of
   the page". Content itself stays opaque. That distinction is what keeps the
   effect legible instead of turning the whole app into frosted soup, so this
   module is deliberately not used for cards.

   A material is three layers:
     1. a backdrop blur of whatever scrolls beneath it
     2. a thin tint so text keeps contrast over any content
     3. a specular hairline on the leading edge, brighter than the border

   `separator` draws the 0.5pt hairline Apple puts between chrome and content.
   ========================================================================== */

import { memo, type ReactNode } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { C, alpha } from '@/lib/colors'

const ANDROID = Platform.OS === 'android'

/** Mirrors UIBlurEffect.Style — thin floats, regular is the default chrome. */
export type MaterialKind = 'ultraThin' | 'thin' | 'regular' | 'thick'

/* Tint is deliberately low. A material's job is to let you *see* the content
   moving underneath while keeping text legible — push the tint much past these
   values and it stops being glass and becomes a frosted white card. */
const KIND = {
  ultraThin: { intensity: 26, tint: 0.30 },
  thin:      { intensity: 46, tint: 0.38 },
  regular:   { intensity: 72, tint: 0.46 },
  thick:     { intensity: 96, tint: 0.62 },
} as const

export const Material = memo(function Material({
  children,
  kind = 'regular',
  style,
  radius = 0,
  /** Hairline along the top or bottom edge, as chrome docked to that side. */
  separator,
  /** Specular highlight along the top edge — reads as a lit bevel. */
  specular = true,
}: {
  children?: ReactNode
  kind?: MaterialKind
  style?: StyleProp<ViewStyle>
  radius?: number
  separator?: 'top' | 'bottom' | 'none'
  specular?: boolean
}) {
  const k = KIND[kind]

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView
        intensity={ANDROID ? k.intensity * 0.8 : k.intensity}
        tint="light"
        // Android needs the opt-in renderer to sample the real backdrop.
        experimentalBlurMethod={ANDROID ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />

      {/* tint — flat, so it does not reintroduce a blend */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: alpha('#FFFFFF', k.tint) }]}
      />

      {specular ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: radius,
            right: radius,
            height: StyleSheet.hairlineWidth * 2,
            backgroundColor: alpha('#FFFFFF', 0.9),
          }}
        />
      ) : null}

      {separator && separator !== 'none' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            [separator]: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: C.line2,
          } as ViewStyle}
        />
      ) : null}

      {/* Content must sit above the absolutely-positioned layers: on web,
          positioned siblings paint over in-flow ones regardless of order. */}
      <View style={styles.content}>{children}</View>
    </View>
  )
})

const styles = StyleSheet.create({
  content: { zIndex: 2 },
})
