import React, { useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DeviceCard, deviceTone } from '../../components/DeviceCard'
import { Label } from '../../components/ui'
import { C } from '../../lib/colors'
import { useStore } from '../../engine/store'
import type { Device } from '../../engine/types'

type Filter = 'all' | 'unknown' | 'camera' | 'tracker' | 'trusted'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all',     label: 'All'         },
  { id: 'unknown', label: 'Unidentified'},
  { id: 'camera',  label: 'Camera-like' },
  { id: 'tracker', label: 'Trackers'    },
  { id: 'trusted', label: 'Trusted'     },
]

export default function DevicesScreen() {
  const insets = useSafeAreaInsets()
  const devices = useStore((s) => s.devices)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const counts = useMemo(() => ({
    threat: devices.filter((d) => deviceTone(d) === 'threat').length,
    caution: devices.filter((d) => deviceTone(d) === 'caution').length,
  }), [devices])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return devices
      .filter((d) => {
        if (filter === 'unknown' && d.trust !== 'unknown') return false
        if (filter === 'trusted' && d.trust !== 'trusted') return false
        if (filter === 'camera' && !d.signals.includes('camera-oui')) return false
        if (filter === 'tracker' && !d.signals.includes('findmy') && !d.signals.includes('tracker-proto')) return false
        if (!term) return true
        return (
          d.mac.toLowerCase().includes(term) ||
          d.vendor.toLowerCase().includes(term) ||
          (d.label ?? '').toLowerCase().includes(term)
        )
      })
      .sort((a, b) => {
        const rank = { threat: 0, caution: 1, muted: 2, safe: 3 }
        const diff = rank[deviceTone(a)] - rank[deviceTone(b)]
        return diff !== 0 ? diff : b.rssi - a.rssi
      })
  }, [devices, filter, q])

  return (
    <View style={[s.screen, { paddingTop: insets.top + 16 }]}>
      {/* ── Page header ────────────────────────────────────────────── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.title}>{devices.length} radios</Text>
          <Text style={s.subtitle}>
            {counts.threat > 0
              ? `${counts.threat} behaving like surveillance`
              : counts.caution > 0
                ? `${counts.caution} worth a second look`
                : 'Nothing matches a known threat pattern'}
          </Text>
        </View>
      </View>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <View style={s.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="MAC, vendor or name"
          placeholderTextColor={C.ink4}
          style={s.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ('')} style={s.clearBtn}>
            <Text style={{ color: C.ink4, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[s.filterChip, filter === f.id && s.filterChipActive]}
            activeOpacity={0.75}
          >
            <Text style={[s.filterLabel, filter === f.id && s.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ───────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <DeviceCard device={item} />
          </View>
        )}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔍</Text>
            <Text style={s.emptyTitle}>Nothing matches</Text>
            <Text style={s.emptyBody}>Try widening the filter or run a fresh scan.</Text>
          </View>
        }
      />
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line2,
    backgroundColor: C.bg2,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: C.ink,
  },
  clearBtn: {
    padding: 6,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 7,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: C.line3,
    backgroundColor: C.surface2,
  },
  filterLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: C.ink3,
  },
  filterLabelActive: {
    color: C.ink,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink2,
  },
  emptyBody: {
    fontSize: 13,
    color: C.ink4,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 19,
  },
})
