/* ============================================================================
   SURFACE — flat paper, not glass
   ----------------------------------------------------------------------------
   A card is a solid white sheet on the stone ground, with a hairline and one
   honest shadow. No blur, no wash, no specular sweep — depth comes from the
   value step between paper and ground, which is how print does it.

   Dropping the blur also removed a real cost: BlurView sampled the backdrop
   on every frame for every card.
   ========================================================================== */

import { memo, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { C, RADIUS, SHADOW, alpha } from '@/lib/colors'
import type { IconName } from './Icon'

export type SurfaceVariant = 'card' | 'raised' | 'flat' | 'sunken' | 'bar'

const VARIANT = {
  card:   { bg: C.surface, radius: RADIUS.lg, shadow: SHADOW.card, border: C.line },
  raised: { bg: C.surface, radius: RADIUS.lg, shadow: SHADOW.lift, border: C.line },
  flat:   { bg: C.surface, radius: RADIUS.md, shadow: null,        border: C.line },
  sunken: { bg: C.bg2,     radius: RADIUS.md, shadow: null,        border: C.line },
  bar:    { bg: C.surface, radius: RADIUS.xl, shadow: SHADOW.lift, border: C.line },
} as const

export const Surface = memo(function Surface({
  children,
  variant = 'card',
  style,
  radius,
  /** Accent used for the left edge marker and border. */
  edge,
  /** Draw a 3px accent bar down the leading edge. */
  edgeBar = false,
}: {
  children?: ReactNode
  variant?: SurfaceVariant
  style?: StyleProp<ViewStyle>
  radius?: number
  edge?: string
  edgeBar?: boolean
}) {
  const v = VARIANT[variant]
  const r = radius ?? v.radius

  return (
    <View
      style={[
        {
          backgroundColor: v.bg,
          borderRadius: r,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: edge ? alpha(edge, 0.3) : v.border,
          overflow: 'hidden',
        },
        v.shadow ?? null,
        style,
      ]}
    >
      {edgeBar && edge ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: edge,
          }}
        />
      ) : null}
      {children}
    </View>
  )
})

/* ── Rule — a flat accent bar, replaces the old 3-stop spectrum line ─────── */

export function Rule({
  width = 22,
  height = 3,
  color = C.indigo,
  style,
}: {
  width?: number
  height?: number
  color?: string
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[{ width, height, borderRadius: 0, backgroundColor: color }, style]} />
}

/* ── Orb — a flat accent tile behind an icon ─────────────────────────────── */

export function Orb({
  size = 40,
  color,
  on,
  radius,
  style,
  children,
  /** Pale tint block instead of a saturated fill. */
  soft = false,
}: {
  size?: number
  color: string
  /** Colour of the content sitting on the fill. */
  on?: string
  radius?: number
  style?: StyleProp<ViewStyle>
  children?: ReactNode
  soft?: boolean
}) {
  const r = radius ?? RADIUS.md
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: soft ? alpha(color, 0.12) : color,
        },
        soft && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: alpha(color, 0.26) },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export type { IconName }
