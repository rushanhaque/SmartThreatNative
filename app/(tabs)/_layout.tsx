import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../../lib/colors'
import { useStore } from '../../engine/store'

type TabName = 'index' | 'devices' | 'history' | 'settings'

const TAB_META: Record<TabName, { label: string; icon: string; activeIcon: string }> = {
  index:    { label: 'Shield',   icon: '⬡',  activeIcon: '⬡'  },
  devices:  { label: 'Devices',  icon: '◈',  activeIcon: '◈'  },
  history:  { label: 'History',  icon: '◷',  activeIcon: '◷'  },
  settings: { label: 'Settings', icon: '⊞',  activeIcon: '⊞'  },
}

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const verdict = useStore((s) => s.verdict)
  const accent =
    verdict.klass === 'threat' ? C.threat
    : verdict.klass === 'caution' ? C.caution
    : C.safe

  const meta = TAB_META[name]
  return (
    <View style={s.iconWrap}>
      {focused && <View style={[s.indicator, { backgroundColor: accent }]} />}
      <Text style={[s.iconText, { color: focused ? C.ink : C.ink4 }]}>
        {focused ? meta.activeIcon : meta.icon}
      </Text>
      <Text style={[s.iconLabel, { color: focused ? C.ink : C.ink4, fontWeight: focused ? '600' : '400' }]}>
        {meta.label}
      </Text>
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: 'rgba(244,241,233,0.96)',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.line,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shield',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ focused }) => <TabIcon name="devices" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const s = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flex: 1,
    paddingTop: 6,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  iconText: {
    fontSize: 20,
    lineHeight: 24,
  },
  iconLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
})
