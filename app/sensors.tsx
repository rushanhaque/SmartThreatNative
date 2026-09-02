import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Label, LiveDot, Panel, PanelHeader, Tone } from '@/components/ui'
import { Surface, Rule } from '@/components/Surface'
import { Parallax, Pressable3D, Reveal, ScrollReveal, Stagger } from '@/components/motion'
import { Icon } from '@/components/Icon'
import { Gauge, Spectrum, Trace } from '@/components/viz'
import { selDevices, selFrames, selScanning, useSelect } from '@/engine/store'
import { C, RADIUS, TONES } from '@/lib/colors'
import { F, T } from '@/lib/type'

const AScroll = Animated.createAnimatedComponent(ScrollView)
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

export default function SensorsScreen() {
  const frames   = useSelect(selFrames)
  const devices  = useSelect(selDevices)
  const scanning = useSelect(selScanning)
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { height: VH } = useWindowDimensions()

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y })

  const last = frames[frames.length - 1]
  const window = useMemo(() => frames.slice(-90), [frames])

  /* Band occupancy is derived from what the radios actually report — device
     kinds, channel numbers and the RF detector — rather than invented. The
     hardware has no per-band receiver, so this is a model, and it is labelled
     as an estimate in the UI. */
  const { levels, peakBand } = useMemo(() => {
    const norm = (v: number, lo: number, hi: number) =>
      Math.min(1, Math.max(0, (v - lo) / (hi - lo)))

    const wifi24 = devices.filter((d) => d.kind.startsWith('wifi') && (d.channel ?? 1) <= 14)
    const wifi5  = devices.filter((d) => d.kind.startsWith('wifi') && (d.channel ?? 1) > 14)
    const ble    = devices.filter((d) => d.kind.startsWith('ble'))
    const rf     = devices.filter((d) => d.kind === 'rf-emitter')
    const analog = devices.filter((d) => d.signals.includes('camera-oui'))

    const rfFloor = norm(last.rfDbm, -85, -30)

    const l = [
      norm(rf.length, 0, 3) * 0.7 + rfFloor * 0.25,                    // 433 MHz
      norm(rf.length, 0, 4) * 0.45 + rfFloor * 0.2,                    // 868 MHz
      norm(analog.length, 0, 2) * 0.5 + rfFloor * 0.3,                 // 1.2 GHz
      norm(wifi24.length + ble.length, 0, 8) * 0.8 + rfFloor * 0.2,    // 2.4 GHz
      norm(wifi5.length, 0, 4) * 0.7 + rfFloor * 0.15,                 // 5.2 GHz
      norm(analog.length, 0, 2) * 0.6 + rfFloor * 0.2,                 // 5.8 GHz
    ].map((v) => Math.min(1, v))

    return { levels: l, peakBand: l.indexOf(Math.max(...l)) }
  }, [devices, last.rfDbm])

  return (
    <Tone value="neutral">
      <View style={s.root}>
        <View style={[s.navWrap, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Reveal kind="down" duration={560}>
            <Pressable3D onPress={() => { tap(); router.back() }}>
              <Surface variant="card" radius={RADIUS.pill} style={s.backBtn}>
                <Icon name="arrow-left" size={18} color={C.ink} strokeWidth={2} />
                <Text style={s.backText}>Shield</Text>
              </Surface>
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
          <Parallax scrollY={scrollY} speed={0.22} fade={220} style={s.titleWrap}>
            <Reveal kind="up" duration={700}>
              <Text style={s.h1}>Sensors</Text>
              <View style={s.titleMeta}>
                <Rule width={20} height={2.5} />
                <LiveDot label={scanning ? '500 MS CADENCE' : 'PAUSED'} active={scanning} />
              </View>
            </Reveal>
          </Parallax>

          <Stagger base={110} step={80}>
            {/* ── Gauges ──────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel variant="raised">
                <PanelHeader title="CURRENT" />
                <View style={s.gaugeRow}>
                  <View style={s.gaugeCell}>
                    <Gauge value={last.emfMg} max={12} label="EM FIELD" unit="mG" danger={6} />
                  </View>
                  <View style={s.vDivider} />
                  <View style={s.gaugeCell}>
                    <Gauge value={last.lux} max={400} label="AMBIENT" unit="lx" danger={15} />
                  </View>
                </View>
                <View style={s.countRow}>
                  <Count label="WI-FI" value={last.wifiCount} />
                  <View style={s.vDivider} />
                  <Count label="BLE" value={last.bleCount} />
                  <View style={s.vDivider} />
                  <Count label="TOTAL" value={devices.length} />
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Spectrum ────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader title="BAND OCCUPANCY" hint="Modelled from radio census" />
                <Spectrum levels={levels} peakBand={peakBand} />
              </Panel>
            </ScrollReveal>

            {/* ── Traces ──────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader title="RF POWER" action={<Label>AD8318</Label>} />
                <View style={s.traceWrap}>
                  <Trace frames={window} channel="rfDbm" unit="dBm" domain={[-90, -20]} threshold={-45} />
                </View>
              </Panel>
            </ScrollReveal>

            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader title="MAGNETIC FIELD" action={<Label>COIL + LM358</Label>} />
                <View style={s.traceWrap}>
                  <Trace frames={window} channel="emfMg" unit="mG" domain={[0, 12]} threshold={6} />
                </View>
              </Panel>
            </ScrollReveal>

            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="up" style={s.section}>
              <Panel>
                <PanelHeader title="AMBIENT LIGHT" action={<Label>BH1750</Label>} />
                <View style={s.traceWrap}>
                  <Trace frames={window} channel="lux" unit="lx" domain={[0, 400]} threshold={15} />
                </View>
              </Panel>
            </ScrollReveal>
          </Stagger>
        </AScroll>
      </View>
    </Tone>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.count}>
      <Label>{label}</Label>
      <Text style={s.countValue}>{value}</Text>
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

  titleWrap: { paddingHorizontal: 20, paddingBottom: 16 },
  h1: { fontFamily: F.semibold, fontSize: 34, lineHeight: 37, letterSpacing: -1.4, color: C.ink },
  titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 },

  section: { paddingHorizontal: 16, marginBottom: 14 },

  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    gap: 10,
  },
  gaugeCell: { flex: 1, alignItems: 'center' },
  vDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: C.line },
  countRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  count: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6 },
  countValue: { fontFamily: F.monoSemi, fontSize: 20, color: C.ink, letterSpacing: -0.6 },

  traceWrap: { paddingHorizontal: 6, paddingBottom: 16 },
})
