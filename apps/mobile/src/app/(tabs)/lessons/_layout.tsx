import { Stack } from 'expo-router'
import { tokens } from '@/theme/tokens'

export default function LessonsLayout() {
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
        options={{ title: 'Soạn bài giảng AI', presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="[id]/index" options={{ title: 'Chi tiết bài giảng' }} />
      <Stack.Screen
        name="[id]/preview"
        options={{ title: 'Xem trước', presentation: 'modal' }}
      />
    </Stack>
  )
}
