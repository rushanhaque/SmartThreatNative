import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Empty, Label, Panel, Pill, Segmented, Tone } from '@/components/ui'
import { Surface, Orb, Rule } from '@/components/Surface'
import { Parallax, Pressable3D, Reveal, ScrollReveal, Stagger } from '@/components/motion'
import { Icon, type IconName } from '@/components/Icon'
import { ProximityField, SignalBars, Sparkline } from '@/components/viz'
import { selDevices, useSelect } from '@/engine/store'
import type { Device } from '@/engine/types'
import { KIND_ICON, deviceTone } from '@/lib/device'
import { ago, rssiBars, splitMac, throughput } from '@/lib/format'
import { C, RADIUS, TONES, alpha } from '@/lib/colors'
import { F, T } from '@/lib/type'

const AScroll = Animated.createAnimatedComponent(ScrollView)
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

type Filter = 'all' | 'unknown' | 'camera' | 'tracker' | 'trusted'

const FILTERS: Array<{ id: Filter; label: string; icon?: IconName }> = [
  { id: 'all',     label: 'All'                          },
  { id: 'unknown', label: 'Unidentified'                 },
  { id: 'camera',  label: 'Cameras',  icon: 'camera'     },
  { id: 'tracker', label: 'Trackers', icon: 'tag'        },
  { id: 'trusted', label: 'Trusted',  icon: 'check'      },
]

export default function DevicesScreen() {
  const devices = useSelect(selDevices)
  const insets  = useSafeAreaInsets()
  const { height: VH } = useWindowDimensions()
  const [filter, setFilter] = useState<Filter>('all')
  const [view,   setView]   = useState<'list' | 'field'>('list')
  const [q,      setQ]      = useState('')

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y })

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return devices
      .filter((d) => {
        if (filter === 'unknown' && d.trust !== 'unknown') return false
        if (filter === 'trusted' && d.trust !== 'trusted') return false
        if (filter === 'camera'  && !d.signals.includes('camera-oui')) return false
        if (filter === 'tracker' && !d.signals.includes('findmy') && !d.signals.includes('tracker-proto')) return false
        if (!term) return true
        return d.mac.toLowerCase().includes(term)
          || d.vendor.toLowerCase().includes(term)
          || (d.label ?? '').toLowerCase().includes(term)
      })
      .sort((a, b) => {
        const rank = { threat: 0, caution: 1, muted: 2, safe: 3 }
        const diff = rank[deviceTone(a)] - rank[deviceTone(b)]
        return diff !== 0 ? diff : b.rssi - a.rssi
      })
  }, [devices, filter, q])

  const counts = useMemo(() => ({
    threat:  devices.filter((d) => deviceTone(d) === 'threat').length,
    caution: devices.filter((d) => deviceTone(d) === 'caution').length,
  }), [devices])

  const headTone = counts.threat > 0 ? 'threat' : counts.caution > 0 ? 'caution' : 'safe'

  return (
    <Tone value="neutral">
      <View style={s.root}>
        <AScroll
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
          contentContainerStyle={{
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 130,
          }}
        >
          {/* ── Title ─────────────────────────────────────────────── */}
          <Parallax scrollY={scrollY} speed={0.2} fade={190} style={s.titleWrap}>
            <Reveal kind="up" duration={700}>
              <View style={s.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.h1}>{devices.length} radios</Text>
                  <View style={s.titleMeta}>
                    <Rule width={18} height={3} color={TONES[headTone].accent} />
                    <Text style={[s.sub, { color: TONES[headTone].accent }]}>
                      {counts.threat > 0
                        ? `${counts.threat} threat`
                        : counts.caution > 0
                          ? `${counts.caution} watch`
                          : 'All clear'}
                    </Text>
                  </View>
                </View>
                <Segmented
                  value={view}
                  onChange={(v) => { tap(); setView(v) }}
                  options={[{ value: 'list', label: 'List' }, { value: 'field', label: 'Field' }]}
                  style={{ width: 124 }}
                />
              </View>
            </Reveal>
          </Parallax>

          {/* ── Sticky search + filters ───────────────────────────── */}
          <View style={s.stickyWrap}>
            <Reveal kind="up" delay={110} duration={700}>
              <Surface variant="card" radius={RADIUS.lg} style={s.searchGlass}>
                <View style={s.searchRow}>
                  <Icon name="search" size={17} color={C.ink4} strokeWidth={1.9} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="MAC, vendor or name"
                    placeholderTextColor={C.ink4}
                    style={s.searchInput}
                  />
                  {q.length > 0 && (
                    <Pressable onPress={() => setQ('')} hitSlop={10}>
                      <Icon name="close" size={16} color={C.ink3} strokeWidth={2} />
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRail}
                >
                  {FILTERS.map((f) => {
                    const on = filter === f.id
                    return (
                      <Pressable3D key={f.id} onPress={() => { tap(); setFilter(f.id) }}>
                        <View style={[s.chip, on && s.chipOn]}>
                          {on && (
                            <View style={StyleSheet.absoluteFill}>
                              <View style={[StyleSheet.absoluteFill, s.chipFill]} />
                            </View>
                          )}
                          {f.icon && (
                            <Icon
                              name={f.icon}
                              size={13}
                              color={on ? '#FFFFFF' : C.ink3}
                              strokeWidth={2}
                            />
                          )}
                          <Text style={[s.chipText, { color: on ? '#FFFFFF' : C.ink3 }]}>
                            {f.label}
                          </Text>
                        </View>
                      </Pressable3D>
                    )
                  })}
                </ScrollView>
              </Surface>
            </Reveal>
          </View>

          {/* ── Proximity field ───────────────────────────────────── */}
          {view === 'field' && (
            <ScrollReveal scrollY={scrollY} viewportHeight={VH} kind="scale" style={s.section}>
              <Panel variant="raised" style={{ paddingTop: 16, paddingBottom: 18 }}>
                <View style={{ paddingHorizontal: 18, paddingBottom: 6 }}>
                  <Label>PROXIMITY FIELD</Label>
                </View>
                <ProximityField
                  points={devices.map((d) => ({
                    id: d.id,
                    rssi: d.rssi,
                    tone: deviceTone(d),
                    label: deviceTone(d) === 'threat' ? d.vendor.split(' ')[0] : undefined,
                  }))}
                />
                <View style={s.legend}>
                  {(['threat', 'caution', 'safe', 'muted'] as const).map((tn) => (
                    <View key={tn} style={s.legendItem}>
                      <View
                        style={[
                          s.legendDot,
                          { backgroundColor: tn === 'muted' ? C.ink4 : TONES[tn].accent },
                        ]}
                      />
                      <Text style={T.micro}>
                        {tn === 'safe' ? 'Trusted' : tn === 'muted' ? 'Ordinary' : tn === 'caution' ? 'Watch' : 'Threat'}
                      </Text>
                    </View>
                  ))}
                </View>
              </Panel>
            </ScrollReveal>
          )}

          {/* ── List ──────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <Empty icon="search" title="Nothing matches" />
          ) : (
            <Stagger base={60} step={55}>
              <View style={s.list}>
                {filtered.map((d, i) => (
                  <ScrollReveal
                    key={d.id}
                    scrollY={scrollY}
                    viewportHeight={VH}
                    kind="blurUp"
                    distance={22}
                  >
                    <DeviceCard device={d} />
                  </ScrollReveal>
                ))}
              </View>
            </Stagger>
          )}
        </AScroll>
      </View>
    </Tone>
  )
}

/* ── Device card ─────────────────────────────────────────────────────────── */

function DeviceCard({ device: d }: { device: Device }) {
  const router = useRouter()
  const tone = deviceTone(d)
  const tk = TONES[tone]
  const [oui, rest] = splitMac(d.mac)
  const notable = tone === 'threat' || tone === 'caution'
  const hasStrip = d.signals.length > 0 || d.throughputKbps > 200

  return (
    <Tone value={tone === 'muted' ? 'neutral' : tone}>
      <Pressable3D
        onPress={() => {
          tap()
          router.push({ pathname: '/device/[id]', params: { id: d.id } })
        }}
      >
        <Surface
          variant={notable ? 'raised' : 'card'}
          radius={RADIUS.lg}
          edge={notable ? tk.accent : undefined}
        >
          <View style={s.cardTop}>
            <Orb
              size={44}
              radius={15}
              soft={!notable}
              color={notable ? tk.accent : C.ink4}
            >
              <Icon
                name={KIND_ICON[d.kind]}
                size={19}
                color={notable ? tk.on : C.ink3}
                strokeWidth={2}
              />
            </Orb>

            <View style={s.cardMeta}>
              <View style={s.cardNameRow}>
                <Text style={s.cardName} numberOfLines={1}>{d.label ?? d.vendor}</Text>
                {d.trust === 'trusted' && (
                  <Icon name="check" size={13} color={C.safe} strokeWidth={2.5} />
                )}
              </View>
              <View style={s.cardMacRow}>
                <Text style={[s.cardOui, { color: notable ? tk.accent : C.ink3 }]}>{oui}</Text>
                <Text style={s.cardRest}>{rest}</Text>
              </View>
            </View>

            <View style={s.cardSignal}>
              <View style={s.cardSignalRow}>
                <SignalBars bars={rssiBars(d.rssi)} />
                <Text style={[s.cardRssi, notable && { color: tk.accent }]}>{d.rssi}</Text>
              </View>
              <Text style={[T.micro, { marginTop: 6 }]}>{ago(d.firstSeen)} AGO</Text>
            </View>
          </View>

          {hasStrip && (
            <View style={s.cardStrip}>
              <View style={s.cardPills}>
                {d.signals.includes('camera-oui')    && <Pill icon="camera" solid={tone === 'threat'}>Camera OUI</Pill>}
                {d.signals.includes('streaming')     && <Pill>{throughput(d.throughputKbps)}</Pill>}
                {d.signals.includes('rtsp-open')     && <Pill>554 open</Pill>}
                {d.signals.includes('findmy')        && <Pill icon="tag">FindMy</Pill>}
                {d.signals.includes('travelling')    && <Pill solid>Following you</Pill>}
                {d.signals.includes('tracker-proto') && <Pill tone="muted">Tracker</Pill>}
                {d.signals.includes('hidden-ssid')   && <Pill tone="muted">Hidden SSID</Pill>}
                {d.signals.includes('new-tonight')   && <Pill tone="muted">New tonight</Pill>}
                {d.signals.includes('low-variance')  && <Pill tone="muted">Fixed distance</Pill>}
              </View>
              <Sparkline data={d.rssiTrail} width={54} height={18} strokeWidth={1.6} fill />
            </View>
          )}
        </Surface>
      </Pressable3D>
    </Tone>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },

  titleWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  h1: { fontFamily: F.semibold, fontSize: 32, lineHeight: 35, letterSpacing: -1.3, color: C.ink },
  titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  sub: { fontFamily: F.semibold, fontSize: 12.5, letterSpacing: -0.15 },

  stickyWrap: { paddingHorizontal: 16, paddingBottom: 12, zIndex: 10 },
  searchGlass: { paddingTop: 6, paddingBottom: 10 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    height: 46,
  },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 14.5, color: C.ink },
  chipRail: { paddingHorizontal: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: C.line,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  chipOn: { borderColor: 'transparent' },
  chipFill: { backgroundColor: C.klein, borderRadius: RADIUS.pill },
  chipText: { fontFamily: F.semibold, fontSize: 12.5, letterSpacing: -0.1 },

  section: { paddingHorizontal: 16, marginBottom: 14 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },

  list: { paddingHorizontal: 16, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 14 },
  cardMeta: { flex: 1, minWidth: 0 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardName: { fontFamily: F.semibold, fontSize: 14.5, color: C.ink, flexShrink: 1, letterSpacing: -0.25 },
  cardMacRow: { flexDirection: 'row', gap: 4, marginTop: 3 },
  cardOui: { fontFamily: F.monoSemi, fontSize: 11.5 },
  cardRest: { fontFamily: F.mono, fontSize: 11.5, color: C.ink4 },
  cardSignal: { alignItems: 'flex-end' },
  cardSignalRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardRssi: { fontFamily: F.monoSemi, fontSize: 12.5, color: C.ink2 },
  cardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: alpha('#FFFFFF', 0.3),
  },
  cardPills: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
})
