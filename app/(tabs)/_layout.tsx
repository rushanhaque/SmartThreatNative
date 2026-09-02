import { Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { C } from '@/lib/colors'
import { TabBar } from '@/components/TabBar'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Must be opaque. React Navigation hides inactive tab scenes on web by
        // pushing them to zIndex -1 rather than display:none, which only works
        // if the active scene paints over them. A transparent scene lets every
        // buried screen show straight through.
        sceneStyle: { backgroundColor: C.bg },
        // All four tabs stay mounted, so without this every screen re-renders
        // on each telemetry tick even while off-screen. Freezing blurred tabs
        // cuts steady-state render work to just the visible one.
        //
        // Native only: freezing is backed by react-native-screens, which does
        // not manage screen visibility on web — there a frozen screen stays
        // painted and the scenes stack on top of one another.
        freezeOnBlur: Platform.OS !== 'web',
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Shield'   }} />
      <Tabs.Screen name="devices"  options={{ title: 'Devices'  }} />
      <Tabs.Screen name="history"  options={{ title: 'History'  }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  )
}
