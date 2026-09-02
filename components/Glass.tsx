/* ============================================================================
   LIQUID GLASS
   ----------------------------------------------------------------------------
   Apple-style glass is four stacked layers, not one translucent fill:

     1. a real backdrop blur of whatever sits behind          (BlurView)
     2. a tinted wash so text keeps contrast over any hue     (LinearGradient)
     3. a specular edge — bright at the top-left, fading out  (LinearGradient)
     4. a hairline rim that catches light on one side only    (bordered View)

   Android's blur is more expensive than iOS's, so `experimentalBlurMethod`
   is only enabled where the surface is large enough to be worth it; small
   chips fall back to a plain translucent fill that is visually near-identical
   at that size and costs nothing.
   ========================================================================== */

import { memo, type ReactNode } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { C, IRIS, RADIUS, SHADOW, alpha } from '@/lib/colors'

const ANDROID = Platform.OS === 'android'

export type GlassVariant = 'card' | 'raised' | 'chip' | 'bar' | 'sunken'

const VARIANT = {
  card:   { intensity: 34, radius: RADIUS.lg, tint: C.glass,     shadow: SHADOW.soft },
  raised: { intensity: 46, radius: RADIUS.xl, tint: C.glassDeep, shadow: SHADOW.lift },
  chip:   { intensity: 22, radius: RADIUS.pill, tint: C.glassSoft, shadow: null },
  bar:    { intensity: 58, radius: 0,          tint: C.glassDeep, shadow: null },
  sunken: { intensity: 14, radius: RADIUS.md,  tint: C.glassShade, shadow: null },
} as const

export const Glass = memo(function Glass({
  children,
  variant = 'card',
  style,
  radius,
  /** Tint the specular rim with a colour (e.g. the active threat tone). */
  edge,
  /** Disable the backdrop blur — use for many small repeated surfaces. */
  flat = false,
}: {
  children?: ReactNode
  variant?: GlassVariant
  style?: StyleProp<ViewStyle>
  radius?: number
  edge?: string
  flat?: boolean
}) {
  const v = VARIANT[variant]
  const r = radius ?? v.radius
  // Small chips never justify a real blur pass.
  const useBlur = !flat && variant !== 'chip'

  return (
    <View
      style={[
        { borderRadius: r, overflow: 'hidden' },
        v.shadow ?? null,
        style,
      ]}
    >
      {useBlur ? (
        <BlurView
          intensity={ANDROID ? v.intensity * 0.7 : v.intensity}
          tint="light"
          // Android needs the opt-in renderer for a true backdrop sample.
          experimentalBlurMethod={ANDROID ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* tinted wash — diagonal so the sheet reads as a physical pane */}
      <LinearGradient
        colors={[
          alpha('#FFFFFF', variant === 'sunken' ? 0.24 : 0.74),
          alpha('#FFFFFF', variant === 'sunken' ? 0.1 : 0.5),
          alpha('#FFFFFF', variant === 'sunken' ? 0.16 : 0.62),
        ]}
        locations={[0, 0.58, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* specular sweep across the top-left shoulder */}
      <LinearGradient
        colors={[alpha('#FFFFFF', 0.95), alpha('#FFFFFF', 0.12), 'transparent']}
        locations={[0, 0.36, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.75, y: 0.9 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.75 }]}
        pointerEvents="none"
      />

      {/* rim light — one hairline, brighter along the top edge */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: r,
            borderWidth: StyleSheet.hairlineWidth * 1.6,
            borderColor: edge ? alpha(edge, 0.34) : C.line,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: r * 0.5,
          right: r * 0.5,
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: edge ? alpha(edge, 0.5) : C.glassEdge,
          opacity: 0.9,
        }}
      />

      {children}
    </View>
  )
})

/* ── Spectral hairline — the brand gradient as a 2px rule ─────────────────── */

export function SpectrumRule({
  width = 28,
  height = 3,
  colors,
  style,
}: {
  width?: number
  height?: number
  /** Two or more stops; defaults to the full brand spectrum. */
  colors?: readonly [string, string, ...string[]]
  style?: StyleProp<ViewStyle>
}) {
  return (
    <LinearGradient
      colors={colors ?? IRIS}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[{ width, height, borderRadius: height / 2 }, style]}
    />
  )
}

/* ── Gradient-filled text-adjacent orb, used for icons/avatars ────────────── */

export function GradientOrb({
  size = 40,
  colors,
  radius,
  style,
  children,
  soft = false,
}: {
  size?: number
  colors: [string, string]
  radius?: number
  style?: StyleProp<ViewStyle>
  children?: ReactNode
  /** Pale tinted version instead of a saturated fill. */
  soft?: boolean
}) {
  const r = radius ?? size * 0.34
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        !soft && {
          shadowColor: colors[1],
          shadowOpacity: 0.34,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={soft ? [alpha(colors[0], 0.2), alpha(colors[1], 0.14)] : colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* top gloss */}
      <LinearGradient
        colors={[alpha('#FFFFFF', soft ? 0.5 : 0.42), 'transparent']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '58%' }]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: r,
            borderWidth: StyleSheet.hairlineWidth * 1.5,
            borderColor: alpha('#FFFFFF', soft ? 0.55 : 0.42),
          },
        ]}
      />
      {/* Content must be lifted above the fill: on web, positioned siblings
          paint over in-flow ones regardless of document order, so without
          this the gradient hides the icon. */}
      <View style={styles.orbContent}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  orbContent: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
