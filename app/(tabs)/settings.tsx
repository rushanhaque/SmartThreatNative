import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Divider, Label, MeterBar, Panel, PanelHeader, Segmented, Toggle, hexAlpha } from '../../components/ui'
import { C, TONE_COLORS } from '../../lib/colors'
import { useStore, actions } from '../../engine/store'
import { SCENARIOS } from '../../engine/simulator'
import { duration } from '../../lib/format'
import type { AlertChannel } from '../../engine/types'

const ALERT_ROWS: Array<{ id: AlertChannel; icon: string; title: string; body: string }> = [
  { id: 'oled',   icon: '👓', title: 'Lens display',      body: 'Colour-coded state in the corner of your vision.'       },
  { id: 'haptic', icon: '📳', title: 'Temple haptics',    body: 'One tap for caution, two long pulses for threat.'        },
  { id: 'buzzer', icon: '🔔', title: 'Buzzer',            body: 'Audible alert on threat only.'                           },
  { id: 'push',   icon: '📱', title: 'Phone notification',body: 'Full detail with device list and reasoning.'             },
]

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const prefs = useStore((s) => s.prefs)
  const hw = useStore((s) => s.hw)

  return (
    <View style={[s.screen, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Page title ───────────────────────────────────────────── */}
        <View style={s.pageHeader}>
          <Text style={s.title}>Settings</Text>
        </View>

        {/* ── Paired device ────────────────────────────────────────── */}
        <Section>
          <Panel>
            <PanelHeader
              title="PAIRED DEVICE"
              hint={hw.serial}
              right={
                <View style={[s.badge, { backgroundColor: hexAlpha(C.safe, 0.12), borderColor: hexAlpha(C.safe, 0.28) }]}>
                  <Text style={[s.badgeText, { color: C.safe }]}>{hw.connected ? 'Linked' : 'Offline'}</Text>
                </View>
              }
            />
            <Divider />
            <View style={s.metersGrid}>
              <Meter label="BATTERY" value={hw.batteryPct} unit="%" pct={hw.batteryPct / 100} />
              <Meter label="STORAGE" value={hw.storageUsedPct} unit="% used" pct={hw.storageUsedPct / 100} />
              <KV label="LINK" value={`${hw.linkRssi} dBm`} />
              <KV label="TEMPERATURE" value={`${hw.temperatureC.toFixed(1)} °C`} />
              <KV label="FIRMWARE" value={hw.firmware} />
              <KV label="UPTIME" value={duration(hw.uptimeSec * 1000)} />
            </View>
          </Panel>
        </Section>

        {/* ── Alerts ───────────────────────────────────────────────── */}
        <Section>
          <Panel>
            <PanelHeader title="ALERTS" hint="Independent channels" />
            <Divider />
            {ALERT_ROWS.map((r, i) => (
              <View key={r.id}>
                <View style={s.alertRow}>
                  <Text style={{ fontSize: 20 }}>{r.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertTitle}>{r.title}</Text>
                    <Text style={s.alertBody}>{r.body}</Text>
                  </View>
                  <Toggle
                    value={prefs.channels[r.id]}
                    onValueChange={(v) => actions.setPrefs({ channels: { ...prefs.channels, [r.id]: v } })}
                  />
                </View>
                {i < ALERT_ROWS.length - 1 && <Divider />}
              </View>
            ))}
          </Panel>
        </Section>

        {/* ── Sensitivity ──────────────────────────────────────────── */}
        <Section>
          <Panel>
            <PanelHeader title="SENSITIVITY" hint="Shifts the threshold, not the evidence" />
            <Divider />
            <View style={{ padding: 16 }}>
              <Segmented
                value={prefs.sensitivity}
                onChange={(v) => actions.setPrefs({ sensitivity: v })}
                options={[
                  { value: 'low',      label: 'Low'      },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'high',     label: 'High'     },
                ]}
              />
              <Text style={s.sensitivityNote}>
                {prefs.sensitivity === 'low'      && 'Only corroborated findings raise an alert. Fewest interruptions.'}
                {prefs.sensitivity === 'balanced' && 'Tuned default — roughly one false positive per twelve hours.'}
                {prefs.sensitivity === 'high'     && 'Single-channel hits will alert. Best for unfamiliar rooms.'}
              </Text>
            </View>
            <Divider />
            <ToggleRow
              icon="🌙"
              title="Dark-room boost"
              body="Raise RF sample rate below 15 lux."
              value={prefs.darkBoost}
              onValueChange={(v) => actions.setPrefs({ darkBoost: v })}
            />
            <Divider />
            <ToggleRow
              icon="🔇"
              title="Passive only"
              body="Never send a packet. Disables port checks."
              value={prefs.passiveOnly}
              onValueChange={(v) => actions.setPrefs({ passiveOnly: v })}
            />
          </Panel>
        </Section>

        {/* ── Demo scenario ────────────────────────────────────────── */}
        <Section>
          <Panel>
            <PanelHeader title="DEMO SCENARIO" hint="Drives simulated telemetry" />
            <Divider />
            {SCENARIOS.map((sc, i) => (
              <View key={sc.id}>
                <TouchableOpacity
                  onPress={() => actions.setScenario(sc.id)}
                  activeOpacity={0.75}
                  style={s.scenarioRow}
                >
                  <View style={[
                    s.radio,
                    prefs.scenario === sc.id && { borderColor: C.irisB },
                  ]}>
                    {prefs.scenario === sc.id && (
                      <View style={[s.radioDot, { backgroundColor: C.irisB }]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.scenarioName}>{sc.name}</Text>
                    <Text style={s.scenarioBlurb}>{sc.blurb}</Text>
                  </View>
                </TouchableOpacity>
                {i < SCENARIOS.length - 1 && <Divider />}
              </View>
            ))}
          </Panel>
        </Section>

        {/* ── About ────────────────────────────────────────────────── */}
        <Section>
          <Panel>
            <PanelHeader title="ABOUT" />
            <Divider />
            <View style={{ padding: 16, gap: 12 }}>
              <KV label="APP" value="Companion 1.0.0" />
              <KV label="PROTOCOL" value="PG-BLE v1 · 20 B MTU" />
              <KV label="LICENCE" value="Academic prototype" />
            </View>
          </Panel>
        </Section>

        <Text style={s.disclaimer}>
          PG-1 is a detection aid built as a final-year engineering project. It does not guarantee that a space is free of surveillance.
        </Text>
      </ScrollView>
    </View>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Section({ children }: { children: React.ReactNode }) {
  return <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>{children}</View>
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <Label>{label}</Label>
      <Text style={{ fontSize: 12.5, color: C.ink2, fontFamily: 'Courier' }} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function Meter({ label, value, unit, pct: p }: { label: string; value: number; unit: string; pct: number }) {
  return (
    <View>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.ink }}>{value}</Text>
        <Text style={{ fontSize: 10.5, color: C.ink4 }}>{unit}</Text>
      </View>
      <MeterBar pct={p} accent={C.irisB} />
    </View>
  )
}

function ToggleRow({
  icon, title, body, value, onValueChange,
}: { icon: string; title: string; body: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={s.alertRow}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.alertTitle}>{title}</Text>
        <Text style={s.alertBody}>{body}</Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  )
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.8,
  },
  metersGrid: {
    padding: 16,
    gap: 14,
  },
  badge: {
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  alertTitle: {
    fontSize: 13.5,
    fontWeight: '500',
    color: C.ink,
  },
  alertBody: {
    fontSize: 12,
    color: C.ink3,
    lineHeight: 17,
    marginTop: 2,
  },
  sensitivityNote: {
    fontSize: 12.5,
    color: C.ink3,
    lineHeight: 18,
    marginTop: 10,
  },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  scenarioName: {
    fontSize: 13.5,
    fontWeight: '500',
    color: C.ink,
  },
  scenarioBlurb: {
    fontSize: 12,
    color: C.ink3,
    lineHeight: 17,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 11.5,
    color: C.ink4,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 8,
  },
})
