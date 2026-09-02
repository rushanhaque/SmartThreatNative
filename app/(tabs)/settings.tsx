import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Bar, Button, Divider, Label, Panel, PanelHeader, Pill, Segmented, Switch, Tone } from '@/components/ui'
import { Surface, Orb, Rule } from '@/components/Surface'
import { Parallax, Pressable3D, Reveal, ScrollReveal, Stagger } from '@/components/motion'
import { Icon, type IconName } from '@/components/Icon'
import { actions, selHw, selPrefs, useSelect } from '@/engine/store'
import { SCENARIOS } from '@/engine/simulator'
import { duration } from '@/lib/format'
import { C, RADIUS, alpha } from '@/lib/colors'
import { F } from '@/lib/type'
import type { AlertChannel } from '@/engine/types'

const AScroll = Animated.createAnimatedComponent(ScrollView)
const tap = () => Haptics.selectionAsync().catch(() => {})

const ALERT_ROWS: Array<{
  id: AlertChannel; title: string; icon: IconName; accent: string
}> = [
  { id: 'oled',   title: 'Lens display',      icon: 'glasses', accent: C.klein },
  { id: 'haptic', title: 'Temple haptics',    icon: 'waves',   accent: C.klein   },
  { id: 'buzzer', title: 'Buzzer',            icon: 'bell',    accent: C.safe   },
  { id: 'push',   title: 'Phone notification', icon: 'bolt',   accent: C.threat },
]

export default function SettingsScreen() {
  const prefs  = useSelect(selPrefs)
  const hw     = useSelect(selHw)
  const insets = useSafeAreaInsets()
  const { height: VH } = useWindowDimensions()

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y })

  return (
    <Tone value="neutral">
      <View style={s.root}>
        <AScroll
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 130,
          }}
        >
          <Parallax scrollY={scrollY} speed={0.22} fade={200} style={s.titleWrap}>
            <Reveal kind="up" duration={700}>
              <Text style={s.h1}>Settings</Text>
              <Rule width={28} height={3} style={{ marginTop: 10 }} />
            </Reveal>
          </Parallax>

          <Stagger base={110} step={85}>
            {/* ── Paired device ─────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel variant="raised">
                <PanelHeader
                  title="PAIRED DEVICE"
                  hint={hw.serial}
                  action={
                    <Pill icon={hw.connected ? 'link' : 'close'} solid={hw.connected}>
                      {hw.connected ? 'Linked' : 'Offline'}
                    </Pill>
                  }
                />
                <Divider />
                <View style={s.metersRow}>
                  <Meter label="BATTERY" value={hw.batteryPct} unit="%" pct={hw.batteryPct / 100} />
                  <View style={s.vDivider} />
                  <Meter label="STORAGE" value={hw.storageUsedPct} unit="% used" pct={hw.storageUsedPct / 100} />
                </View>
                <Divider />
                <View style={s.kvGrid}>
                  <KV label="LINK"        value={`${hw.linkRssi} dBm`} />
                  <KV label="TEMPERATURE" value={`${hw.temperatureC.toFixed(1)} °C`} />
                  <KV label="FIRMWARE"    value={hw.firmware} />
                  <KV label="UPTIME"      value={duration(hw.uptimeSec * 1000)} />
                </View>
                <Divider />
                <View style={s.btnRow}>
                  <Button style={{ flex: 1 }} size="sm" variant="accent" icon="refresh" onPress={tap}>
                    Update
                  </Button>
                  <Button style={{ flex: 1 }} size="sm" icon="link" onPress={tap}>
                    Re-pair
                  </Button>
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Alerts ────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader title="ALERTS" />
                <View style={s.rows}>
                  {ALERT_ROWS.map((r, i) => (
                    <View key={r.id} style={[s.row, i < ALERT_ROWS.length - 1 && s.rowBorder]}>
                      <Orb
                        size={34}
                        radius={12}
                        color={r.accent}
                        soft={!prefs.channels[r.id]}
                      >
                        <Icon
                          name={r.icon}
                          size={16}
                          color={prefs.channels[r.id] ? '#FFFFFF' : C.ink3}
                          strokeWidth={2}
                        />
                      </Orb>
                      <Text style={s.rowTitle}>{r.title}</Text>
                      <Switch
                        checked={prefs.channels[r.id]}
                        onChange={(v) => {
                          tap()
                          actions.setPrefs({ channels: { ...prefs.channels, [r.id]: v } })
                        }}
                      />
                    </View>
                  ))}
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Sensitivity ───────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader title="SENSITIVITY" />
                <View style={s.segWrap}>
                  <Segmented
                    value={prefs.sensitivity}
                    onChange={(v) => { tap(); actions.setPrefs({ sensitivity: v as never }) }}
                    options={[
                      { value: 'low',      label: 'Low'      },
                      { value: 'balanced', label: 'Balanced' },
                      { value: 'high',     label: 'High'     },
                    ]}
                  />
                </View>
                <Divider />
                <View style={s.rows}>
                  <View style={[s.row, s.rowBorder]}>
                    <Text style={[s.rowTitle, s.rowTitleWide]}>Dark-room boost</Text>
                    <Switch
                      checked={prefs.darkBoost}
                      onChange={(v) => { tap(); actions.setPrefs({ darkBoost: v }) }}
                    />
                  </View>
                  <View style={s.row}>
                    <Text style={[s.rowTitle, s.rowTitleWide]}>Passive only</Text>
                    <Switch
                      checked={prefs.passiveOnly}
                      onChange={(v) => { tap(); actions.setPrefs({ passiveOnly: v }) }}
                    />
                  </View>
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Scenarios ─────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel>
                <PanelHeader title="DEMO SCENARIO" />
                <View style={s.rows}>
                  {SCENARIOS.map((sc, i) => {
                    const on = prefs.scenario === sc.id
                    return (
                      <Pressable3D
                        key={sc.id}
                        onPress={() => { tap(); actions.setScenario(sc.id) }}
                      >
                        <View style={[s.row, i < SCENARIOS.length - 1 && s.rowBorder]}>
                          <View style={[s.radio, on && { borderColor: C.klein }]}>
                            {on && <View style={s.radioDot} />}
                          </View>
                          <Text style={[s.rowTitle, s.rowTitleWide, on && { color: C.klein }]}>
                            {sc.name}
                          </Text>
                          {on && <Rule width={16} height={2.5} />}
                        </View>
                      </Pressable3D>
                    )
                  })}
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── About ─────────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="up" style={s.section}>
              <Panel>
                <PanelHeader title="ABOUT" />
                <View style={s.kvGrid}>
                  <KV label="APP"      value="Companion 0.1.0" />
                  <KV label="PROTOCOL" value="PG-BLE v1" />
                  <KV label="LICENCE"  value="Academic prototype" />
                </View>
              </Panel>
            </ScrollReveal>
          </Stagger>
        </AScroll>
      </View>
    </Tone>
  )
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kv}>
      <Label>{label}</Label>
      <Text style={s.kvValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function Meter({
  label, value, unit, pct,
}: {
  label: string; value: number; unit: string; pct: number
}) {
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <View style={s.meterValue}>
        <Text style={s.meterNum}>{value}</Text>
        <Text style={s.meterUnit}>{unit}</Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Bar value={pct} height={5} />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },

  titleWrap: { paddingHorizontal: 20, paddingBottom: 16 },
  h1: { fontFamily: F.semibold, fontSize: 34, lineHeight: 37, letterSpacing: -1.4, color: C.ink },

  section: { paddingHorizontal: 16, marginBottom: 14 },

  metersRow: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 16, gap: 20 },
  vDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.line },
  meterValue: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 8 },
  meterNum: { fontFamily: F.monoSemi, fontSize: 22, lineHeight: 26, color: C.ink, letterSpacing: -0.8 },
  meterUnit: { fontFamily: F.mono, fontSize: 10, color: C.ink3 },

  kvGrid: { paddingHorizontal: 18, paddingVertical: 14, gap: 11 },
  kv: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  kvValue: { fontFamily: F.monoSemi, fontSize: 12.5, color: C.ink2, flexShrink: 1 },

  btnRow: { flexDirection: 'row', gap: 10, padding: 16 },

  rows: { paddingHorizontal: 18, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
  rowTitleWide: { marginLeft: 0 },

  segWrap: { paddingHorizontal: 18, paddingBottom: 16 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.ink5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.klein },
})
