import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Empty, Label, Panel, PanelHeader, Pill, Tone } from '@/components/ui'
import { Glass, GradientOrb, SpectrumRule } from '@/components/Glass'
import { Parallax, Pressable3D, Reveal, ScrollReveal, Stagger } from '@/components/motion'
import { Icon } from '@/components/Icon'
import { Series, SignalBars } from '@/components/viz'
import { actions, selDevices, useSelect } from '@/engine/store'
import type { Trust } from '@/engine/types'
import { KIND_ICON, KIND_LABEL, SIGNAL_LABEL, STRONG_SIGNALS, deviceTone } from '@/lib/device'
import { ago, clockTime, proximityLabel, rssiBars, splitMac, throughput } from '@/lib/format'
import { C, RADIUS, TONES, alpha } from '@/lib/colors'
import { F, T } from '@/lib/type'

const AScroll = Animated.createAnimatedComponent(ScrollView)
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

const TRUST_OPTIONS: Array<{ value: Trust; label: string; icon: 'check' | 'flag' | 'minus' }> = [
  { value: 'trusted', label: 'Trust',   icon: 'check' },
  { value: 'unknown', label: 'Neutral', icon: 'minus' },
  { value: 'flagged', label: 'Flag',    icon: 'flag'  },
]

export default function DeviceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const devices = useSelect(selDevices)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { height: VH } = useWindowDimensions()

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y })

  const device = useMemo(() => devices.find((d) => d.id === id), [devices, id])

  if (!device) {
    return (
      <Tone value="neutral">
        <View style={[s.root, { paddingTop: insets.top + 60 }]}>
          <Empty icon="search" title="Device out of range" body="It stopped advertising." />
        </View>
      </Tone>
    )
  }

  const tone = deviceTone(device)
  const tk = TONES[tone === 'muted' ? 'neutral' : tone]
  const [oui, rest] = splitMac(device.mac)
  const bars = rssiBars(device.rssi)

  return (
    <Tone value={tone === 'muted' ? 'neutral' : tone}>
      <View style={s.root}>
        {/* ── Back bar ──────────────────────────────────────────── */}
        <View style={[s.navWrap, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Reveal kind="down" duration={560}>
            <Pressable3D onPress={() => { tap(); router.back() }}>
              <Glass variant="card" radius={RADIUS.pill} style={s.backBtn}>
                <Icon name="arrow-left" size={18} color={C.ink} strokeWidth={2} />
                <Text style={s.backText}>Devices</Text>
              </Glass>
            </Pressable3D>
          </Reveal>
        </View>

        <AScroll
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 76,
            paddingBottom: insets.bottom + 48,
          }}
        >
          {/* ── Hero ────────────────────────────────────────────── */}
          <Parallax scrollY={scrollY} speed={0.24} fade={260} style={s.hero}>
            <Reveal kind="scale" duration={760}>
              <GradientOrb size={76} radius={26} colors={tk.grad}>
                <Icon name={KIND_ICON[device.kind]} size={32} color="#FFFFFF" strokeWidth={1.9} />
              </GradientOrb>
            </Reveal>
            <Reveal kind="up" delay={140} duration={700}>
              <Text style={s.title} numberOfLines={2}>{device.label ?? device.vendor}</Text>
              <View style={s.subRow}>
                <SpectrumRule width={16} height={2.5} colors={tk.grad} />
                <Text style={[s.subText, { color: tk.accent }]}>{KIND_LABEL[device.kind]}</Text>
              </View>
              <View style={s.macRow}>
                <Text style={[s.macOui, { color: tk.accent }]}>{oui}</Text>
                <Text style={s.macRest}>{rest}</Text>
                {device.macRandomised && <Pill tone="muted">Randomised</Pill>}
              </View>
            </Reveal>
          </Parallax>

          <Stagger base={120} step={80}>
            {/* ── Signal ──────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel variant="raised" edge={tk.accent}>
                <PanelHeader
                  title="SIGNAL STRENGTH"
                  hint={proximityLabel(device.rssi)}
                  action={
                    <View style={s.barsRow}>
                      <SignalBars bars={bars} />
                      <Text style={[s.rssiNow, { color: tk.accent }]}>{device.rssi}</Text>
                      <Text style={T.micro}>dBm</Text>
                    </View>
                  }
                />
                <View style={s.chartWrap}>
                  <Series
                    data={device.rssiTrail}
                    domain={[-100, -20]}
                    height={130}
                    showLast={false}
                  />
                </View>
                <View style={s.chartAxis}>
                  <Text style={T.micro}>{device.rssiTrail.length} SAMPLES</Text>
                  <Text style={T.micro}>NOW</Text>
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Evidence ────────────────────────────────────────── */}
            {device.signals.length > 0 && (
              <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
                <Panel>
                  <PanelHeader title="EVIDENCE" hint={`${device.signals.length} signals`} />
                  <View style={s.pillWrap}>
                    {device.signals.map((sig) => (
                      <Pill key={sig} solid={STRONG_SIGNALS.has(sig)}>
                        {SIGNAL_LABEL[sig]}
                      </Pill>
                    ))}
                  </View>
                </Panel>
              </ScrollReveal>
            )}

            {/* ── Detail ──────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader title="DETAIL" />
                <View style={s.kvGrid}>
                  <KV label="VENDOR"     value={device.vendor} />
                  <KV label="OUI"        value={device.oui} />
                  {device.channel != null && <KV label="CHANNEL" value={String(device.channel)} />}
                  <KV label="THROUGHPUT" value={throughput(device.throughputKbps)} />
                  <KV label="FIRST SEEN" value={`${clockTime(device.firstSeen)} · ${ago(device.firstSeen)} ago`} />
                  <KV label="LAST SEEN"  value={ago(device.lastSeen) === 'now' ? 'just now' : `${ago(device.lastSeen)} ago`} />
                  <KV
                    label="OPEN PORTS"
                    value={device.openPorts.length ? device.openPorts.join(', ') : 'none'}
                  />
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Trust ───────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="up" style={s.section}>
              <Panel>
                <PanelHeader
                  title="TRUST"
                  hint="Changes how this device scores"
                />
                <View style={s.trustRow}>
                  {TRUST_OPTIONS.map((opt) => {
                    const on = device.trust === opt.value
                    const optTone =
                      opt.value === 'trusted' ? TONES.safe
                      : opt.value === 'flagged' ? TONES.threat
                      : TONES.neutral
                    return (
                      <Pressable3D
                        key={opt.value}
                        containerStyle={{ flex: 1 }}
                        onPress={() => { tap(); actions.setTrust(device.id, opt.value) }}
                      >
                        <View
                          style={[
                            s.trustBtn,
                            on
                              ? { borderColor: alpha(optTone.accent, 0.4), backgroundColor: optTone.soft }
                              : { borderColor: C.line, backgroundColor: alpha('#FFFFFF', 0.4) },
                          ]}
                        >
                          <Icon
                            name={opt.icon}
                            size={17}
                            color={on ? optTone.accent : C.ink3}
                            strokeWidth={2.1}
                          />
                          <Text
                            style={[s.trustText, { color: on ? optTone.accent : C.ink3 }]}
                          >
                            {opt.label}
                          </Text>
                        </View>
                      </Pressable3D>
                    )
                  })}
                </View>
              </Panel>
            </ScrollReveal>
          </Stagger>
        </AScroll>
      </View>
    </Tone>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kv}>
      <Label>{label}</Label>
      <Text style={s.kvValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },

  navWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backText: { fontFamily: F.semibold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },

  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 26, gap: 16 },
  title: {
    fontFamily: F.semibold,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: -1,
    color: C.ink,
    textAlign: 'center',
  },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 },
  subText: { fontFamily: F.semibold, fontSize: 12.5, letterSpacing: -0.1 },
  macRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  macOui: { fontFamily: F.monoSemi, fontSize: 13 },
  macRest: { fontFamily: F.mono, fontSize: 13, color: C.ink3 },

  section: { paddingHorizontal: 16, marginBottom: 14 },

  barsRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rssiNow: { fontFamily: F.monoSemi, fontSize: 16, letterSpacing: -0.5 },
  chartWrap: { paddingHorizontal: 6, paddingTop: 4 },
  chartAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },

  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 18 },

  kvGrid: { paddingHorizontal: 18, paddingBottom: 18, gap: 12 },
  kv: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 14 },
  kvValue: { fontFamily: F.monoSemi, fontSize: 12.5, color: C.ink2, flexShrink: 1, textAlign: 'right' },

  trustRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingBottom: 18 },
  trustBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  trustText: { fontFamily: F.semibold, fontSize: 12.5, letterSpacing: -0.1 },
})
