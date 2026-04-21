import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useAuthStore } from '@/store/auth.store'
import { tokens } from '@/theme/tokens'

type FeatherIconName = React.ComponentProps<typeof Feather>['name']

function TabIcon(name: FeatherIconName) {
  return ({ color }: { color: string }) => (
    <Feather name={name} size={22} color={color} />
  )
}

export default function TabLayout() {
  const { user } = useAuthStore()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const screenOptions = {
    tabBarActiveTintColor: tokens.colors.primary[600],
    tabBarInactiveTintColor: isDark ? tokens.colors.gray[500] : tokens.colors.gray[400],
    tabBarStyle: {
      backgroundColor: isDark ? tokens.colors.gray[900] : '#FFFFFF',
      borderTopColor: isDark ? tokens.colors.gray[800] : tokens.colors.gray[200],
      borderTopWidth: 1,
      height: 64,
      paddingBottom: 10,
      paddingTop: 6,
    },
    tabBarLabelStyle: {
      fontFamily: tokens.typography.fontFamily.sansSemiBold,
      fontSize: 11,
    },
    headerShown: false,
  }

  if (user?.role === 'student') {
    return (
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="student-home"
          options={{ title: 'Kết quả', tabBarIcon: TabIcon('award') }}
        />
        <Tabs.Screen
          name="grade-sheets"
          options={{ title: 'Bảng điểm', tabBarIcon: TabIcon('bar-chart-2') }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Hồ sơ', tabBarIcon: TabIcon('user') }}
        />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="lessons" options={{ href: null }} />
        <Tabs.Screen name="exams" options={{ href: null }} />
        <Tabs.Screen name="grading" options={{ href: null }} />
      </Tabs>
    )
  }

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Trang chủ', tabBarIcon: TabIcon('home') }}
      />
      <Tabs.Screen
        name="lessons"
        options={{ title: 'Bài giảng', tabBarIcon: TabIcon('book-open') }}
      />
      <Tabs.Screen
        name="exams"
        options={{ title: 'Đề thi', tabBarIcon: TabIcon('edit-3') }}
      />
      <Tabs.Screen
        name="grading"
        options={{ title: 'Chấm bài', tabBarIcon: TabIcon('check-circle') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Hồ sơ', tabBarIcon: TabIcon('user') }}
      />
      <Tabs.Screen name="student-home" options={{ href: null }} />
      <Tabs.Screen name="grade-sheets" options={{ href: null }} />
    </Tabs>
  )
}
