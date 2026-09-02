import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ApertureRing } from '@/components/ApertureRing'
import { EvidenceStack, Sparkline } from '@/components/viz'
import { Button, Label, LiveDot, Panel, PanelHeader, Pill, Row, SectionTitle, Tone } from '@/components/ui'
import { Glass, GradientOrb, SpectrumRule } from '@/components/Glass'
import { Counter, Float, Parallax, Pressable3D, Reveal, ScrollReveal, Stagger } from '@/components/motion'
import { Icon, type IconName } from '@/components/Icon'
import { Logomark } from '@/components/Brand'
import { actions, selDevices, selFrames, selHw, selPrefs, selVerdict, selPlace, selScanning, useSelect } from '@/engine/store'
import { CLASS_META } from '@/engine/fusion'
import { SCENARIOS } from '@/engine/simulator'
import type { FusionChannel, Reason } from '@/engine/types'
import { pct } from '@/lib/format'
import { C, RADIUS, TONES, alpha } from '@/lib/colors'
import { F, T } from '@/lib/type'

const AScroll = Animated.createAnimatedComponent(ScrollView)

const CHANNEL_ICON: Record<FusionChannel, IconName> = {
  camera: 'camera',
  tracker: 'tag',
  rf: 'radio',
  emf: 'bolt',
  dark: 'moon',
}

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

export default function ShieldScreen() {
  const verdict  = useSelect(selVerdict)
  const devices  = useSelect(selDevices)
  const frames   = useSelect(selFrames)
  const prefs    = useSelect(selPrefs)
  const hw       = useSelect(selHw)
  const place    = useSelect(selPlace)
  const scanning = useSelect(selScanning)
  const insets   = useSafeAreaInsets()
  const router   = useRouter()
  const { height: VH } = useWindowDimensions()

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y
  })

  const meta    = CLASS_META[verdict.klass]
  const tone    = TONES[verdict.klass]
  const top     = verdict.reasons.slice(0, 3)
  const unknown = devices.filter((d) => d.trust === 'unknown').length
  const last    = frames[frames.length - 1]
  const rfTrail  = useMemo(() => frames.slice(-40).map((f) => f.rfDbm), [frames])
  const emfTrail = useMemo(() => frames.slice(-40).map((f) => f.emfMg), [frames])
  const luxTrail = useMemo(() => frames.slice(-40).map((f) => f.lux), [frames])

  return (
    <Tone value={verdict.klass}>
      <View style={s.root}>
        {/* ── Floating glass header ─────────────────────────────────── */}
        <View style={[s.headerWrap, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Reveal kind="down" duration={640}>
            <Glass variant="card" radius={RADIUS.lg} style={s.header}>
              <View style={s.headerRow}>
                <Logomark size={24} active />
                <View style={s.headerMid}>
                  <Text style={s.headerPlace} numberOfLines={1}>{place}</Text>
                  <LiveDot label={scanning ? 'SCANNING' : 'PAUSED'} active={scanning} />
                </View>
                <View style={s.battery}>
                  <Icon name="battery" size={14} color={C.ink3} strokeWidth={1.9} />
                  <Text style={s.batteryText}>{hw.batteryPct}%</Text>
                </View>
              </View>
            </Glass>
          </Reveal>
        </View>

        <AScroll
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 88,
            paddingBottom: insets.bottom + 130,
          }}
        >
          {/* ── Hero instrument ─────────────────────────────────────── */}
          <Parallax scrollY={scrollY} speed={0.28} fade={340} shrink={420} style={s.hero}>
            <Reveal kind="scale" duration={900}>
              <Float amplitude={4} duration={5200}>
                <ApertureRing score={verdict.score} klass={verdict.klass} scanning={prefs.scanning}>
                  <Counter value={verdict.score} style={s.score} />
                  <View style={s.verdictRow}>
                    <View style={[s.verdictDot, { backgroundColor: tone.accent }]} />
                    <Text style={[s.verdictLabel, { color: tone.accent }]}>{meta.label}</Text>
                  </View>
                  <View style={s.confWrap}>
                    <SpectrumRule width={16} height={2} colors={tone.grad} />
                    <Label>CONF {pct(verdict.confidence)}</Label>
                  </View>
                </ApertureRing>
              </Float>
            </Reveal>

            <Reveal kind="up" delay={280} duration={760}>
              <Button
                style={{ marginTop: 24 }}
                size="lg"
                variant={prefs.scanning ? 'quiet' : 'accent'}
                icon={prefs.scanning ? 'pause' : 'play'}
                onPress={() => { tap(); actions.toggleScanning() }}
              >
                {prefs.scanning ? 'Pause scanning' : 'Resume scanning'}
              </Button>
            </Reveal>
          </Parallax>

          <Stagger base={120} step={80}>
            {/* ── Evidence chain ────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel edge={tone.accent}>
                <PanelHeader
                  title="WHY THIS READING"
                  hint={top.length ? `${verdict.reasons.length} corroborating signals` : undefined}
                  action={<Pill icon="target" solid>{meta.short}</Pill>}
                />
                {top.length ? (
                  <View style={s.evidenceList}>
                    {top.map((r, i) => (
                      <EvidenceItem
                        key={r.code + i}
                        reason={r}
                        last={i === top.length - 1}
                        index={i}
                        accent={tone.accent}
                        grad={tone.grad}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={s.evidenceEmpty}>Every channel at baseline.</Text>
                )}
              </Panel>
            </ScrollReveal>

            {/* ── Fusion breakdown ──────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader
                  title="FUSION BREAKDOWN"
                  action={
                    <Text style={[s.sigma, { color: tone.accent }]}>
                      Σ {Math.round(verdict.score)}
                      <Text style={s.sigmaMax}>/100</Text>
                    </Text>
                  }
                />
                <EvidenceStack breakdown={verdict.breakdown} />
              </Panel>
            </ScrollReveal>

            {/* ── Live sensors ──────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader
                  title="SENSORS"
                  action={
                    <Pressable3D onPress={() => { tap(); router.push('/sensors') }}>
                      <View style={s.sensorLink}>
                        <LiveDot active={scanning} />
                        <Icon name="arrow-up-right" size={15} color={C.ink3} strokeWidth={2} />
                      </View>
                    </Pressable3D>
                  }
                />
                <View style={s.sensors}>
                  <SensorCell label="RF POWER" value={last.rfDbm.toFixed(0)} unit="dBm" trail={rfTrail} />
                  <View style={s.sensorDivider} />
                  <SensorCell label="EM FIELD" value={last.emfMg.toFixed(1)} unit="mG" trail={emfTrail} />
                  <View style={s.sensorDivider} />
                  <SensorCell label="AMBIENT" value={Math.round(last.lux).toString()} unit="lux" trail={luxTrail} />
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Devices summary ───────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <Row
                  onPress={() => { tap(); router.push('/devices') }}
                  icon={
                    <GradientOrb size={42} colors={[C.violet, C.indigo]}>
                      <Icon name="radio" size={19} color="#FFFFFF" strokeWidth={2} />
                    </GradientOrb>
                  }
                  title={`${devices.length} radios in range`}
                  sub={unknown ? `${unknown} unidentified` : undefined}
                  right={
                    <View style={s.deviceRight}>
                      {devices.some((d) => d.signals.includes('camera-oui')) && (
                        <Pill icon="camera">CAM</Pill>
                      )}
                      <Icon name="chevron-right" size={17} color={C.ink4} />
                    </View>
                  }
                />
              </Panel>
            </ScrollReveal>

            {/* ── Environments rail ─────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="up" style={{ marginTop: 26 }}>
              <SectionTitle right={<Text style={[T.micro, { color: C.ink4 }]}>SWIPE →</Text>}>
                ENVIRONMENTS
              </SectionTitle>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={218}
                contentContainerStyle={s.rail}
              >
                {SCENARIOS.map((sc) => {
                  const active = sc.id === prefs.scenario
                  return (
                    <Pressable3D
                      key={sc.id}
                      onPress={() => { tap(); actions.setScenario(sc.id) }}
                    >
                      <Glass
                        variant={active ? 'raised' : 'card'}
                        radius={RADIUS.lg}
                        edge={active ? tone.accent : undefined}
                        style={s.railCard}
                      >
                        <View style={s.railHead}>
                          <GradientOrb
                            size={30}
                            radius={11}
                            soft={!active}
                            colors={active ? tone.grad : [C.ink4, C.ink5]}
                          >
                            <Icon
                              name={active ? 'check' : 'scan'}
                              size={14}
                              color={active ? '#FFFFFF' : C.ink3}
                              strokeWidth={2.2}
                            />
                          </GradientOrb>
                          {active && <SpectrumRule width={18} height={2.5} colors={tone.grad} />}
                        </View>
                        <Text
                          style={[s.railName, { color: active ? tone.accent : C.ink }]}
                          numberOfLines={1}
                        >
                          {sc.name}
                        </Text>
                      </Glass>
                    </Pressable3D>
                  )
                })}
              </ScrollView>
            </ScrollReveal>
          </Stagger>
        </AScroll>
      </View>
    </Tone>
  )
}

/* ── Evidence item ───────────────────────────────────────────────────────── */

function EvidenceItem({
  reason, last, index, accent, grad,
}: {
  reason: Reason; last: boolean; index: number; accent: string; grad: [string, string]
}) {
  return (
    <Reveal kind="left" index={index} delay={220 + index * 90} distance={18}>
      <View style={s.evidenceItem}>
        {!last && <View style={s.evidenceLine} />}
        <GradientOrb size={34} radius={12} colors={grad}>
          <Icon name={CHANNEL_ICON[reason.channel]} size={16} color="#FFFFFF" strokeWidth={2} />
        </GradientOrb>
        <Text style={s.evidenceTitle} numberOfLines={1}>{reason.title}</Text>
      </View>
    </Reveal>
  )
}

/* ── Sensor cell ─────────────────────────────────────────────────────────── */

function SensorCell({
  label, value, unit, trail,
}: {
  label: string; value: string; unit: string; trail: number[]
}) {
  return (
    <View style={s.sensorCell}>
      <Label>{label}</Label>
      <View style={s.sensorValue}>
        <Text style={s.sensorNum}>{value}</Text>
        <Text style={s.sensorUnit}>{unit}</Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Sparkline data={trail} width={78} height={22} strokeWidth={1.8} fill />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },

  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
  },
  header: { paddingHorizontal: 14, paddingVertical: 11 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerMid: { flex: 1, minWidth: 0, gap: 3 },
  headerPlace: { fontFamily: F.semibold, fontSize: 14, color: C.ink, letterSpacing: -0.25 },
  battery: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  batteryText: { fontFamily: F.monoSemi, fontSize: 11.5, color: C.ink2 },

  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },
  score: {
    fontFamily: F.semibold,
    fontSize: 66,
    lineHeight: 70,
    letterSpacing: -3.6,
    color: C.ink,
  },
  verdictRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 7 },
  verdictDot: { width: 7, height: 7, borderRadius: 4 },
  verdictLabel: { fontFamily: F.semibold, fontSize: 16, letterSpacing: -0.35 },
  confWrap: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },

  section: { paddingHorizontal: 16, marginTop: 14 },

  evidenceList: { paddingHorizontal: 18, paddingBottom: 8 },
  evidenceItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 14 },
  evidenceLine: {
    position: 'absolute',
    left: 17,
    top: 34,
    bottom: 0,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: C.line2,
  },
  evidenceTitle: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
  evidenceEmpty: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    fontFamily: F.regular,
    fontSize: 13,
    color: C.ink3,
  },

  sigma: { fontFamily: F.monoSemi, fontSize: 15 },
  sigmaMax: { fontFamily: F.mono, fontSize: 11, color: C.ink3 },

  sensors: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  sensorCell: { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
  sensorDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.line },
  sensorValue: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 8 },
  sensorNum: { fontFamily: F.monoSemi, fontSize: 19, lineHeight: 23, color: C.ink, letterSpacing: -0.5 },
  sensorUnit: { fontFamily: F.mono, fontSize: 10, color: C.ink3 },

  deviceRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sensorLink: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  rail: { paddingHorizontal: 16, gap: 12, paddingVertical: 4 },
  railCard: { width: 206, padding: 16, gap: 14 },
  railHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  railName: { fontFamily: F.semibold, fontSize: 14, letterSpacing: -0.25 },
})
