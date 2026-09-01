import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { C, TONE_COLORS } from '../lib/colors'
import type { ThreatClass } from '../engine/types'

const SIZE = 210
const STROKE = 6
const RADIUS = (SIZE - STROKE * 2) / 2
const CIRC = 2 * Math.PI * RADIUS

interface Props {
  score: number
  klass: ThreatClass
  scanning: boolean
  children?: React.ReactNode
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function ApertureRing({ score, klass, scanning, children }: Props) {
  const { accent } = TONE_COLORS[klass]
  const progress = useRef(new Animated.Value(score / 100)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(progress, {
      toValue: score / 100,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start()
  }, [score])

  useEffect(() => {
    if (!scanning) {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [scanning, klass])

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  })

  const pulseColor = klass === 'threat' ? C.threat : klass === 'caution' ? C.caution : C.safe
  const trackOpacity = klass === 'threat' ? 0.10 : 0.08

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glow,
          {
            borderColor: accent,
            opacity: pulseAnim.interpolate({ inputRange: [0.6, 1], outputRange: [0.3, 0.08] }),
          },
        ]}
      />
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={accent} stopOpacity="1" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={accent}
          strokeOpacity={trackOpacity}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={accent}
          strokeWidth={STROKE + 1}
          fill="none"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.inner}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: SIZE + 24,
    height: SIZE + 24,
    borderRadius: (SIZE + 24) / 2,
    borderWidth: 1,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
})
