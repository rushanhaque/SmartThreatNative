import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { C, TONE_COLORS } from '../lib/colors'
import { hexAlpha } from './ui'
import { ago, rssiBars, splitMac, throughput } from '../lib/format'
import type { Device } from '../engine/types'

export function deviceTone(d: Device): 'safe' | 'caution' | 'threat' | 'muted' {
  if (d.trust === 'trusted') return 'safe'
  if (d.signals.includes('camera-oui') && d.signals.includes('streaming')) return 'threat'
  if (d.signals.includes('travelling')) return 'threat'
  if (d.signals.includes('camera-oui') || d.signals.includes('findmy')) return 'caution'
  if (d.signals.includes('tracker-proto') || d.signals.includes('hidden-ssid')) return 'caution'
  return 'muted'
}

export function DeviceCard({ device: d, onPress }: { device: Device; onPress?: () => void }) {
  const tone = deviceTone(d)
  const colors = TONE_COLORS[tone]
  const notable = tone === 'threat' || tone === 'caution'
  const [oui, rest] = splitMac(d.mac)
  const bars = rssiBars(d.rssi)

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        s.card,
        notable && { borderColor: hexAlpha(colors.accent, 0.28) },
      ]}
    >
      <View style={s.main}>
        {/* Icon */}
        <View
          style={[
            s.iconBox,
            notable
              ? { backgroundColor: hexAlpha(colors.accent, 0.10), borderColor: hexAlpha(colors.accent, 0.30) }
              : { backgroundColor: C.bg2, borderColor: C.line },
          ]}
        >
          <Text style={{ fontSize: 16 }}>{kindEmoji(d.kind)}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name} numberOfLines={1}>{d.label ?? d.vendor}</Text>
          <Text style={s.mac} numberOfLines={1}>
            <Text style={notable ? { color: colors.accent } : { color: C.ink4 }}>{oui}</Text>
            <Text style={{ color: C.ink4 }}>{rest}</Text>
          </Text>
        </View>

        {/* Signal + time */}
        <View style={s.right}>
          <SignalBars bars={bars} />
          <Text style={s.rssi}>{d.rssi} dBm</Text>
          <Text style={s.age}>{ago(d.firstSeen)}</Text>
        </View>
      </View>

      {/* Evidence strip */}
      {d.signals.length > 0 && (
        <View style={s.strip}>
          {d.signals.slice(0, 3).map((sig) => (
            <View key={sig} style={[s.sigPill, { backgroundColor: hexAlpha(colors.accent, 0.10), borderColor: hexAlpha(colors.accent, 0.25) }]}>
              <Text style={[s.sigText, { color: notable ? colors.accent : C.ink3 }]}>{SIGNAL_LABELS[sig] ?? sig}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

function SignalBars({ bars }: { bars: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: i * 3 + 2,
            borderRadius: 1,
            backgroundColor: bars >= i ? C.ink2 : C.line2,
          }}
        />
      ))}
    </View>
  )
}

function kindEmoji(kind: Device['kind']) {
  const map: Record<string, string> = {
    'wifi-ap': '📡',
    'wifi-sta': '📶',
    'ble-tag': '🏷️',
    'ble-peripheral': '🔵',
    'rf-emitter': '📻',
  }
  return map[kind] ?? '📶'
}

const SIGNAL_LABELS: Record<string, string> = {
  'camera-oui': 'Camera OUI',
  'streaming': 'Streaming',
  'rtsp-open': 'RTSP:554',
  'findmy': 'FindMy',
  'travelling': 'Following',
  'tracker-proto': 'Tracker',
  'hidden-ssid': 'Hidden SSID',
  'new-tonight': 'New tonight',
  'low-variance': 'Fixed dist.',
  'mdns-camera': 'mDNS cam',
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
    letterSpacing: -0.1,
  },
  mac: {
    fontSize: 11,
    fontFamily: 'Courier',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rssi: {
    fontSize: 11,
    color: C.ink3,
    fontFamily: 'Courier',
  },
  age: {
    fontSize: 10,
    color: C.ink4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(27,25,21,0.08)',
    paddingTop: 8,
  },
  sigPill: {
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sigText: {
    fontSize: 11,
    fontWeight: '500',
  },
})
