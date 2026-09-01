import React, { useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ApertureRing } from '../../components/ApertureRing'
import { Button, Divider, Label, Panel, PanelHeader, Pill, hexAlpha } from '../../components/ui'
import { C, TONE_COLORS } from '../../lib/colors'
import { pct, proximityLabel } from '../../lib/format'
import { useStore, actions } from '../../engine/store'
import { CLASS_META, WEIGHTS } from '../../engine/fusion'
import { SCENARIOS } from '../../engine/simulator'
import type { FusionChannel, Reason } from '../../engine/types'

const CHANNEL_LABEL: Record<FusionChannel, string> = {
  camera: 'Optical',
  tracker: 'Tracker',
  rf: 'RF',
  emf: 'EMF',
  dark: 'Ambient',
}

export default function ShieldScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const verdict = useStore((s) => s.verdict)
  const devices = useStore((s) => s.devices)
  const prefs = useStore((s) => s.prefs)
  const frames = useStore((s) => s.frames)

  const meta = CLASS_META[verdict.klass]
  const { accent } = TONE_COLORS[verdict.klass]
  const top = verdict.reasons.slice(0, 3)
  const unknown = devices.filter((d) => d.trust === 'unknown').length
  const last = frames[frames.length - 1]

  // Animated score counter
  const scoreAnim = useRef(new Animated.Value(verdict.score)).current
  useEffect(() => {
    Animated.spring(scoreAnim, { toValue: verdict.score, useNativeDriver: false, tension: 30, friction: 10 }).start()
  }, [verdict.score])

  // Slide-in entrance animation
  const entrance = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, tension: 60, friction: 14, delay: 60 }).start()
  }, [])

  const entryStyle = {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
  }

  return (
    <View style={[s.screen, { backgroundColor: hexAlpha(accent, 0.04) }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <View style={[s.hero, { paddingTop: insets.top + 20 }]}>
          <ApertureRing score={verdict.score} klass={verdict.klass} scanning={prefs.scanning}>
            <Animated.Text style={s.scoreNumber}>
              {Math.round(verdict.score)}
            </Animated.Text>
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: accent }]} />
              <Text style={[s.statusLabel, { color: accent }]}>{meta.label}</Text>
            </View>
            <Text style={s.confLabel}>CONF {pct(verdict.confidence)}</Text>
          </ApertureRing>

          <Animated.View style={[s.heroText, entryStyle]}>
            <Text style={s.verdictVerb}>{meta.verb}</Text>

            <TouchableOpacity
              onPress={() => actions.toggleScanning()}
              activeOpacity={0.8}
              style={[
                s.scanBtn,
                {
                  backgroundColor: prefs.scanning ? C.surface3 : accent,
                  borderColor: prefs.scanning ? C.line2 : 'transparent',
                },
              ]}
            >
              <Text style={[s.scanBtnText, { color: prefs.scanning ? C.ink2 : '#FFFFFF' }]}>
                {prefs.scanning ? 'Pause scanning' : 'Resume scanning'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={s.body}>
          {/* ── Evidence chain ───────────────────────────────────────── */}
          <Animated.View style={entryStyle}>
            <Panel accent={accent} style={s.section}>
              <PanelHeader
                title="WHY THIS READING"
                hint={top.length ? `${verdict.reasons.length} signals corroborate` : 'All channels at baseline'}
                right={<Pill accent={accent}>{meta.short}</Pill>}
              />
              <Divider />
              {top.length ? (
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 14 }}>
                  {top.map((r, i) => (
                    <EvidenceItem key={r.code + i} reason={r} accent={accent} last={i === top.length - 1} />
                  ))}
                </View>
              ) : (
                <Text style={s.emptyText}>
                  Every channel is at baseline. The glasses keep listening — you will feel a buzz before you need to look.
                </Text>
              )}
            </Panel>
          </Animated.View>

          {/* ── Fusion breakdown ─────────────────────────────────────── */}
          <Animated.View style={[entryStyle, { marginTop: 10 }]}>
            <Panel style={s.section}>
              <PanelHeader
                title="FUSION BREAKDOWN"
                hint={`Σ ${verdict.score}/100`}
              />
              <Divider />
              <View style={{ padding: 16, gap: 12 }}>
                {(Object.keys(verdict.breakdown) as FusionChannel[]).map((ch) => {
                  const v = verdict.breakdown[ch]
                  const barW = Math.round(v * 100)
                  return (
                    <View key={ch}>
                      <View style={s.channelRow}>
                        <Text style={s.channelName}>{CHANNEL_LABEL[ch]}</Text>
                        <Text style={s.channelWeight}>{Math.round(WEIGHTS[ch] * 100)}% wt</Text>
                        <Text style={[s.channelVal, { color: v > 0.4 ? accent : C.ink3 }]}>
                          {Math.round(v * 100)}
                        </Text>
                      </View>
                      <View style={s.channelTrack}>
                        <View style={[s.channelFill, { width: `${barW}%`, backgroundColor: v > 0.4 ? accent : C.ink4 }]} />
                      </View>
                    </View>
                  )
                })}
              </View>
            </Panel>
          </Animated.View>

          {/* ── Sensors ──────────────────────────────────────────────── */}
          {last && (
            <Animated.View style={[entryStyle, { marginTop: 10 }]}>
              <Panel style={s.section}>
                <PanelHeader title="LIVE SENSORS" hint="500 ms cadence · on-device only" />
                <Divider />
                <View style={s.sensorGrid}>
                  <SensorCell label="RF POWER" value={last.rfDbm.toFixed(0)} unit="dBm" />
                  <View style={s.sensorDivider} />
                  <SensorCell label="EM FIELD" value={last.emfMg.toFixed(1)} unit="mG" />
                  <View style={s.sensorDivider} />
                  <SensorCell label="AMBIENT" value={Math.round(last.lux).toString()} unit="lux" />
                </View>
              </Panel>
            </Animated.View>
          )}

          {/* ── Devices row ──────────────────────────────────────────── */}
          <Animated.View style={[entryStyle, { marginTop: 10 }]}>
            <Panel style={s.section}>
              <TouchableOpacity
                onPress={() => router.push('/devices')}
                activeOpacity={0.8}
                style={s.devicesRow}
              >
                <View style={s.devIcon}>
                  <Text style={{ fontSize: 18 }}>📡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.devTitle}>{devices.length} radios in range</Text>
                  <Text style={s.devSub} numberOfLines={1}>
                    {unknown > 0
                      ? `${unknown} unidentified · nearest ${proximityLabel(Math.max(...devices.map((d) => d.rssi)))}`
                      : 'All matched to your trusted list'}
                  </Text>
                </View>
                <Text style={{ color: C.ink4, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </Panel>
          </Animated.View>

          {/* ── Demo scenarios ───────────────────────────────────────── */}
          <View style={{ marginTop: 20 }}>
            <View style={s.scenarioHeader}>
              <Label>DEMO ENVIRONMENTS</Label>
              <Text style={s.swipeHint}>SWIPE →</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              style={{ marginTop: 10 }}
            >
              {SCENARIOS.map((sc) => {
                const active = sc.id === prefs.scenario
                return (
                  <TouchableOpacity
                    key={sc.id}
                    onPress={() => actions.setScenario(sc.id)}
                    activeOpacity={0.8}
                    style={[
                      s.scenarioCard,
                      active && { borderColor: hexAlpha(accent, 0.40), backgroundColor: hexAlpha(accent, 0.06) },
                    ]}
                  >
                    <Text style={[s.scenarioName, { color: active ? accent : C.ink }]}>{sc.name}</Text>
                    <Text style={s.scenarioBlurb}>{sc.blurb}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {/* ── Disclaimer ───────────────────────────────────────────── */}
          <Text style={s.disclaimer}>
            PG-1 is an aid, not a guarantee. If you believe you are being recorded, preserve the scene and contact the police.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function EvidenceItem({ reason, accent, last }: { reason: Reason; accent: string; last: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={[s.evidenceIcon, { backgroundColor: hexAlpha(accent, 0.10), borderColor: hexAlpha(accent, 0.30) }]}>
          <Text style={{ fontSize: 12 }}>{CHANNEL_EMOJI[reason.channel]}</Text>
        </View>
        {!last && <View style={{ width: 1, flex: 1, backgroundColor: C.line, marginTop: 4 }} />}
      </View>
      <View style={{ flex: 1, paddingTop: 2, paddingBottom: last ? 0 : 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={s.evidenceTitle} numberOfLines={1}>{reason.title}</Text>
          <Text style={s.evidenceCode}>{reason.code}</Text>
        </View>
        <Text style={s.evidenceDetail}>{reason.detail}</Text>
      </View>
    </View>
  )
}

function SensorCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={s.sensorCell}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <Text style={s.sensorValue}>{value}</Text>
        <Text style={s.sensorUnit}>{unit}</Text>
      </View>
    </View>
  )
}

const CHANNEL_EMOJI: Record<FusionChannel, string> = {
  camera: '📷', tracker: '🏷', rf: '📻', emf: '⚡', dark: '🌙',
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  hero: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  heroText: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
    gap: 14,
    width: '100%',
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -3,
    lineHeight: 72,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  confLabel: {
    fontSize: 10.5,
    color: C.ink4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  verdictVerb: {
    fontSize: 14,
    color: C.ink2,
    textAlign: 'center',
    lineHeight: 21,
  },
  scanBtn: {
    alignSelf: 'center',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderWidth: 1,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  body: {
    paddingHorizontal: 16,
    gap: 0,
  },
  section: {
    marginBottom: 0,
  },
  emptyText: {
    fontSize: 13,
    color: C.ink3,
    lineHeight: 20,
    padding: 16,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  channelName: {
    flex: 1,
    fontSize: 13,
    color: C.ink2,
    fontWeight: '500',
  },
  channelWeight: {
    fontSize: 11,
    color: C.ink4,
  },
  channelVal: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Courier',
    width: 30,
    textAlign: 'right',
  },
  channelTrack: {
    height: 3,
    backgroundColor: C.surface3,
    borderRadius: 100,
    marginTop: 5,
    overflow: 'hidden',
  },
  channelFill: {
    height: 3,
    borderRadius: 100,
    minWidth: 3,
  },
  sensorGrid: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  sensorDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: C.line,
    marginVertical: 4,
  },
  sensorCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 0,
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
    fontFamily: 'Courier',
  },
  sensorUnit: {
    fontSize: 10,
    color: C.ink4,
  },
  devicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  devIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: C.bg2,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
  },
  devSub: {
    fontSize: 12,
    color: C.ink3,
    marginTop: 2,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  swipeHint: {
    fontSize: 10,
    color: C.ink4,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  scenarioCard: {
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    padding: 14,
    gap: 5,
  },
  scenarioName: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  scenarioBlurb: {
    fontSize: 11.5,
    color: C.ink3,
    lineHeight: 17,
  },
  evidenceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceTitle: {
    fontSize: 13.5,
    fontWeight: '500',
    color: C.ink,
    flex: 1,
  },
  evidenceCode: {
    fontSize: 10,
    color: C.ink4,
    fontFamily: 'Courier',
  },
  evidenceDetail: {
    fontSize: 12.5,
    color: C.ink3,
    lineHeight: 18,
    marginTop: 3,
  },
  disclaimer: {
    fontSize: 11.5,
    color: C.ink4,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
  },
})
