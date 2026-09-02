import { Tabs } from 'expo-router'
import { TabBar } from '@/components/TabBar'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Shield'   }} />
      <Tabs.Screen name="devices"  options={{ title: 'Devices'  }} />
      <Tabs.Screen name="history"  options={{ title: 'History'  }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  )
}
