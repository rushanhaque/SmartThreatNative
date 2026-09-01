import React, { useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Divider, Label, Panel, PanelHeader, Pill, Segmented, hexAlpha } from '../../components/ui'
import { C, TONE_COLORS } from '../../lib/colors'
import { useStore } from '../../engine/store'
import { CLASS_META } from '../../engine/fusion'
import { clockTime, dayLabel, duration } from '../../lib/format'
import type { ThreatClass } from '../../engine/types'

type Tab = 'sessions' | 'incidents'

export default function HistoryScreen() {
  const insets = useSafeAreaInsets()
  const sessions = useStore((s) => s.sessions)
  const incidents = useStore((s) => s.incidents)
  const [tab, setTab] = useState<Tab>('sessions')

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const key = dayLabel(s.startedAt)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return [...map.entries()]
  }, [sessions])

  // 24-hour ribbon data
  const ribbon = useMemo(() => {
    const now = Date.now()
    return Array.from({ length: 24 }, (_, i) => {
      const from = now - (24 - i) * 3_600_000
      const to = from + 3_600_000
      const hit = sessions.find((s) => s.startedAt >= from && s.startedAt < to)
      return hit
        ? { score: hit.peakScore, klass: hit.klass }
        : { score: 6 + ((i * 13) % 9), klass: 'safe' as ThreatClass }
    })
  }, [sessions])

  return (
    <View style={[s.screen, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── Page header ──────────────────────────────────────────── */}
        <View style={s.pageHeader}>
          <Text style={s.title}>History</Text>
          <Text style={s.subtitle}>
            {sessions.length} scans · {incidents.length} incidents · stored on this phone only
          </Text>
        </View>

        {/* ── 24 h ribbon ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Panel>
            <PanelHeader title="LAST 24 HOURS" hint="Hourly peak threat score" />
            <Divider />
            <View style={s.ribbonWrap}>
              {ribbon.map((pt, i) => {
                const h = Math.max(4, (pt.score / 100) * 40)
                const col = TONE_COLORS[pt.klass].accent
                return (
                  <View key={i} style={[s.ribbonBar, { height: h, backgroundColor: hexAlpha(col, 0.55) }]} />
                )
              })}
            </View>
            <View style={s.ribbonLabels}>
              <Text style={s.ribbonLabel}>24H AGO</Text>
              <Text style={s.ribbonLabel}>NOW</Text>
            </View>
          </Panel>
        </View>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'sessions', label: `Scans · ${sessions.length}` },
              { value: 'incidents', label: `Incidents · ${incidents.length}` },
            ]}
          />
        </View>

        {tab === 'sessions' ? (
          grouped.length === 0 ? (
            <EmptyState icon="🕐" title="No scans yet" body="Run a scan when you check into a room." />
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 20 }}>
              {grouped.map(([day, items]) => (
                <View key={day}>
                  <Label style={{ paddingHorizontal: 4, marginBottom: 8 }}>{day.toUpperCase()}</Label>
                  <View style={{ gap: 8 }}>
                    {items.map((sess) => {
                      const { accent } = TONE_COLORS[sess.klass]
                      return (
                        <Panel key={sess.id} accent={accent}>
                          <View style={s.sessionCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.sessionPlace} numberOfLines={1}>{sess.place}</Text>
                              <Text style={s.sessionMeta}>
                                {clockTime(sess.startedAt)} · {duration(sess.durationSec * 1000)} · {sess.devicesSeen} radios
                              </Text>
                              <Text style={s.sessionNote} numberOfLines={2}>{sess.verdictNote}</Text>
                              <View style={{ marginTop: 8 }}>
                                <Pill accent={accent}>{CLASS_META[sess.klass].label}</Pill>
                              </View>
                            </View>
                            <Text style={[s.sessionScore, { color: accent }]}>{sess.peakScore}</Text>
                          </View>
                        </Panel>
                      )
                    })}
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {incidents.map((inc) => {
              const { accent } = TONE_COLORS[inc.klass]
              return (
                <Panel key={inc.id} accent={accent}>
                  <View style={s.incidentCard}>
                    <View style={[s.incidentIcon, { backgroundColor: hexAlpha(accent, 0.10), borderColor: hexAlpha(accent, 0.30) }]}>
                      <Text style={{ fontSize: 18 }}>{inc.klass === 'threat' ? '⚠️' : 'ℹ️'}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.incidentPlace} numberOfLines={1}>{inc.place}</Text>
                      <Text style={s.incidentMeta}>
                        {dayLabel(inc.startedAt)} {clockTime(inc.startedAt)} · {duration((inc.endedAt ?? Date.now()) - inc.startedAt)}
                      </Text>
                    </View>
                    <Text style={[s.incidentScore, { color: accent }]}>{inc.peakScore}</Text>
                  </View>
                </Panel>
              )
            })}
          </View>
        )}

        {/* ── Privacy note ─────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Panel>
            <View style={s.privacyRow}>
              <Text style={{ fontSize: 18, marginTop: 2 }}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.privacyTitle}>Nothing here has left your phone</Text>
                <Text style={s.privacyBody}>
                  Scans are written to local storage and to the glasses' own SPIFFS partition. No account, no sync, no server.
                </Text>
              </View>
            </View>
          </Panel>
        </View>
      </ScrollView>
    </View>
  )
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 48, gap: 8 }}>
      <Text style={{ fontSize: 36, marginBottom: 4 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: C.ink2 }}>{title}</Text>
      <Text style={{ fontSize: 13, color: C.ink4, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 }}>{body}</Text>
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
  subtitle: {
    fontSize: 13,
    color: C.ink3,
    marginTop: 4,
  },
  ribbonWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 12,
    gap: 2,
    height: 64,
  },
  ribbonBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  ribbonLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  ribbonLabel: {
    fontSize: 10,
    color: C.ink4,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  sessionPlace: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    letterSpacing: -0.1,
  },
  sessionMeta: {
    fontSize: 11.5,
    color: C.ink4,
    marginTop: 3,
    fontFamily: 'Courier',
  },
  sessionNote: {
    fontSize: 12.5,
    color: C.ink3,
    lineHeight: 18,
    marginTop: 6,
  },
  sessionScore: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  incidentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  incidentIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentPlace: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
  },
  incidentMeta: {
    fontSize: 11.5,
    color: C.ink4,
    marginTop: 2,
    fontFamily: 'Courier',
  },
  incidentScore: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 4,
  },
  privacyBody: {
    fontSize: 12.5,
    color: C.ink3,
    lineHeight: 18,
  },
})
