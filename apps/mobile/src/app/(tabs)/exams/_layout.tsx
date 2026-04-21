import { Stack } from 'expo-router'
import { tokens } from '@/theme/tokens'

export default function ExamsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colors.primary[600] },
        headerTintColor: '#FFF',
        headerTitleStyle: {
          fontFamily: tokens.typography.fontFamily.sansBold,
          fontSize: tokens.typography.fontSize.base,
        },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="generate"
        options={{ title: 'Tạo đề thi AI', presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết đề thi' }} />
      <Stack.Screen
        name="[id]/export"
        options={{ title: 'Xuất đề thi', presentation: 'modal' }}
      />
    </Stack>
  )
}
