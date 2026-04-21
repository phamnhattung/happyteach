import { Stack } from 'expo-router'
import { tokens } from '@/theme/tokens'

export default function GradingLayout() {
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
        name="scan/bubble"
        options={{ title: 'Quét phiếu trắc nghiệm', presentation: 'fullScreenModal', headerShown: false }}
      />
      <Stack.Screen
        name="scan/answers"
        options={{ title: 'Quét bài tự luận', presentation: 'fullScreenModal', headerShown: false }}
      />
      <Stack.Screen
        name="scan/approve"
        options={{ title: 'Duyệt kết quả AI' }}
      />
      <Stack.Screen
        name="gradebook/all"
        options={{ title: 'Bảng điểm', headerShown: false }}
      />
    </Stack>
  )
}
