import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { startTelemetry } from '../engine/store'

export default function RootLayout() {
  useEffect(() => {
    const stop = startTelemetry()
    return stop
  }, [])

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4F1E9' } }} />
    </SafeAreaProvider>
  )
}
