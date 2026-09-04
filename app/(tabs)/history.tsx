import { useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Empty, Label, Panel, PanelHeader, Pill, Segmented, Tone } from '@/components/ui'
import { Surface, Orb, Rule } from '@/components/Surface'
import { Parallax, Pressable3D, Reveal, ScrollReveal, Stagger } from '@/components/motion'
import { Icon } from '@/components/Icon'
import { ThreatRibbon } from '@/components/viz'
import { selIncidents, selSessions, useSelect } from '@/engine/store'
import { CLASS_META } from '@/engine/fusion'
import { clockTime, dayLabel, duration } from '@/lib/format'
import { C, RADIUS, TONES, alpha } from '@/lib/colors'
import { F, T } from '@/lib/type'
import type { ThreatClass } from '@/engine/types'

const AScroll = Animated.createAnimatedComponent(ScrollView)
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

type Tab = 'sessions' | 'incidents'

export default function HistoryScreen() {
  const sessions  = useSelect(selSessions)
  const incidents = useSelect(selIncidents)
  const insets    = useSafeAreaInsets()
  const { height: VH } = useWindowDimensions()
  const [tab, setTab] = useState<Tab>('sessions')

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y })

  const ribbon = useMemo(() => {
    const now = Date.now()
    return Array.from({ length: 24 }, (_, i) => {
      const from = now - (24 - i) * 3_600_000
      const to   = from + 3_600_000
      const hit  = sessions.find((x) => x.startedAt >= from && x.startedAt < to)
      return hit
        ? { score: hit.peakScore, klass: hit.klass }
        : { score: 6 + ((i * 13) % 9), klass: 'safe' as ThreatClass }
    })
  }, [sessions])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sessions>()
    for (const x of sessions) {
      const key = dayLabel(x.startedAt)
      map.set(key, [...(map.get(key) ?? []), x])
    }
    return [...map.entries()]
  }, [sessions])

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
          {/* ── Title ─────────────────────────────────────────────── */}
          <Parallax scrollY={scrollY} speed={0.22} fade={200} style={s.titleWrap}>
            <Reveal kind="up" duration={700}>
              <Text style={s.h1}>History</Text>
              <View style={s.titleMeta}>
                <Rule width={20} height={2.5} />
                <Text style={s.sub}>
                  {sessions.length} scans · {incidents.length} incidents
                </Text>
              </View>
            </Reveal>
          </Parallax>

          <Stagger base={110} step={80}>
            {/* ── 24h ribbon ──────────────────────────────────────── */}
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="blurUp" style={s.section}>
              <Panel variant="raised">
                <PanelHeader title="LAST 24 HOURS" />
                <ThreatRibbon points={ribbon} />
                <View style={s.ribbonLabels}>
                  <Text style={T.micro}>24H AGO</Text>
                  <Text style={T.micro}>NOW</Text>
                </View>
              </Panel>
            </ScrollReveal>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <Reveal kind="up" index={1} style={s.tabsWrap}>
              <Segmented
                value={tab}
                onChange={(v) => { tap(); setTab(v) }}
                options={[
                  { value: 'sessions',  label: `Scans · ${sessions.length}` },
                  { value: 'incidents', label: `Incidents · ${incidents.length}` },
                ]}
              />
            </Reveal>

            {tab === 'sessions' ? (
              grouped.length === 0 ? (
                <Empty icon="clock" title="No scans yet" />
              ) : (
                <View style={s.groupList}>
                  {grouped.map(([day, items]) => (
                    <View key={day}>
                      <View style={s.groupLabel}>
                        <Rule width={12} height={2} />
                        <Label>{day.toUpperCase()}</Label>
                      </View>
                      <View style={s.groupCards}>
                        {items.map((sess) => {
                          const tk = TONES[sess.klass]
                          return (
                            <ScrollReveal
                              key={sess.id}
                              scrollY={scrollY}
                              viewportHeight={VH}
                              kind="blurUp"
                              distance={22}
                            >
                              <Tone value={sess.klass}>
                                <Pressable3D onPress={tap}>
                                  <Surface variant="card" radius={RADIUS.lg} edge={tk.accent}>
                                    <View style={s.sessionInner}>
                                      <View style={s.sessionHead}>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                          <Text style={s.sessionPlace} numberOfLines={1}>
                                            {sess.place}
                                          </Text>
                                          <Text style={s.sessionMeta}>
                                            {clockTime(sess.startedAt)} · {duration(sess.durationSec * 1000)} · {sess.devicesSeen} radios
                                          </Text>
                                        </View>
                                        <View style={s.scoreBox}>
                                          <Text style={[s.sessionScore, { color: tk.accent }]}>
                                            {sess.peakScore}
                                          </Text>
                                          <Rule width={22} height={2.5} color={tk.accent} />
                                        </View>
                                      </View>
                                      <View style={s.sessionPills}>
                                        <Pill solid={sess.klass !== 'safe'}>
                                          {CLASS_META[sess.klass].label}
                                        </Pill>
                                      </View>
                                    </View>
                                  </Surface>
                                </Pressable3D>
                              </Tone>
                            </ScrollReveal>
                          )
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )
            ) : (
              <View style={s.incidentList}>
                {incidents.map((inc) => {
                  const tk = TONES[inc.klass]
                  return (
                    <ScrollReveal
                      key={inc.id}
                      scrollY={scrollY}
                      viewportHeight={VH}
                      kind="blurUp"
                      distance={22}
                    >
                      <Tone value={inc.klass}>
                        <Pressable3D onPress={tap}>
                          <Surface variant="card" radius={RADIUS.lg} edge={tk.accent}>
                            <View style={s.incidentInner}>
                              <Orb size={44} radius={15} color={tk.accent}>
                                <Icon
                                  name={inc.klass === 'threat' ? 'alert' : 'info'}
                                  size={19}
                                  color="#FFFFFF"
                                  strokeWidth={2}
                                />
                              </Orb>
                              <View style={s.incidentMeta}>
                                <Text style={s.incidentPlace} numberOfLines={1}>{inc.place}</Text>
                                <Text style={s.incidentTime}>
                                  {dayLabel(inc.startedAt)} {clockTime(inc.startedAt)} · {duration((inc.endedAt ?? Date.now()) - inc.startedAt)}
                                </Text>
                              </View>
                              <Text style={[s.incidentScore, { color: tk.accent }]}>
                                {inc.peakScore}
                              </Text>
                            </View>
                          </Surface>
                        </Pressable3D>
                      </Tone>
                    </ScrollReveal>
                  )
                })}
              </View>
            )}

            {/* ── Privacy ─────────────────────────────────────────── */}
            <ScrollReveal
              scrollY={scrollY}
              viewportHeight={VH}
              kind="up"
              style={[s.section, { marginTop: 26 }]}
            >
              <Panel>
                <View style={s.privacyRow}>
                  <Orb size={38} radius={13} color={C.indigo} soft>
                    <Icon name="lock" size={17} color={C.indigo} strokeWidth={2} />
                  </Orb>
                  <Text style={s.privacyTitle}>Nothing here has left your phone</Text>
                </View>
              </Panel>
            </ScrollReveal>
          </Stagger>
        </AScroll>
      </View>
    </Tone>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },

  titleWrap: { paddingHorizontal: 20, paddingBottom: 16 },
  h1: { fontFamily: F.semibold, fontSize: 34, lineHeight: 37, letterSpacing: -1.4, color: C.ink },
  titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  sub: { fontFamily: F.medium, fontSize: 12.5, color: C.ink3, letterSpacing: -0.1 },

  section: { paddingHorizontal: 16, marginBottom: 4 },
  ribbonLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 10,
    paddingBottom: 14,
  },

  tabsWrap: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },

  groupList: { paddingHorizontal: 16, gap: 22 },
  groupLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 10 },
  groupCards: { gap: 10 },

  sessionInner: { padding: 17 },
  sessionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  sessionPlace: { fontFamily: F.semibold, fontSize: 15, color: C.ink, letterSpacing: -0.3 },
  sessionMeta: { fontFamily: F.mono, fontSize: 11.5, color: C.ink3, marginTop: 5 },
  scoreBox: { alignItems: 'flex-end', gap: 6 },
  sessionScore: { fontFamily: F.monoSemi, fontSize: 24, lineHeight: 26, letterSpacing: -1 },
  sessionPills: { flexDirection: 'row', gap: 8, marginTop: 14 },

  incidentList: { paddingHorizontal: 16, gap: 10 },
  incidentInner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  incidentMeta: { flex: 1, minWidth: 0 },
  incidentPlace: { fontFamily: F.semibold, fontSize: 14.5, color: C.ink, letterSpacing: -0.25 },
  incidentTime: { fontFamily: F.mono, fontSize: 11.5, color: C.ink3, marginTop: 3 },
  incidentScore: { fontFamily: F.monoSemi, fontSize: 20, lineHeight: 24, letterSpacing: -0.8 },

  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16 },
  privacyTitle: { flex: 1, fontFamily: F.semibold, fontSize: 13.5, color: C.ink, letterSpacing: -0.2 },
})
