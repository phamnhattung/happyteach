import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'
import { tokens } from '@/theme/tokens'

interface MenuItem {
  icon: string
  label: string
  route?: string
  onPress?: () => void
  danger?: boolean
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const menuItems: MenuItem[] = [
    { icon: 'user', label: 'Thông tin cá nhân', route: '/profile/edit' },
    { icon: 'upload', label: 'Tài liệu cá nhân hóa', route: '/profile/documents' },
    { icon: 'bell', label: 'Thông báo', route: '/profile/notifications' },
    { icon: 'lock', label: 'Bảo mật', route: '/profile/security' },
    { icon: 'help-circle', label: 'Trợ giúp', route: '/profile/help' },
    { icon: 'log-out', label: 'Đăng xuất', onPress: logout, danger: true },
  ]

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase() ?? 'HT'

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View className="items-center pt-8 pb-6 px-5">
          <View
            className="w-20 h-20 rounded-full bg-amber-500 items-center justify-center mb-3"
            style={tokens.shadow.md}
          >
            <Text
              className="text-white text-2xl"
              style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
            >
              {initials}
            </Text>
          </View>
          <Text
            className="text-stone-900 dark:text-white text-xl"
            style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
          >
            {user?.name ?? 'Người dùng'}
          </Text>
          <Text
            className="text-stone-500 dark:text-stone-400 text-sm mt-1"
            style={{ fontFamily: tokens.typography.fontFamily.sans }}
          >
            {user?.email ?? ''}
          </Text>
          <View className="mt-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Text
              className="text-amber-700 dark:text-amber-400 text-xs"
              style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
            >
              {user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
            </Text>
          </View>
        </View>

        {/* Menu */}
        <View className="px-5">
          <View className="bg-white dark:bg-stone-900 rounded-2xl overflow-hidden" style={tokens.shadow.sm}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                className={`flex-row items-center px-4 py-4 ${
                  index < menuItems.length - 1
                    ? 'border-b border-stone-100 dark:border-stone-800'
                    : ''
                }`}
                onPress={item.onPress ?? (() => item.route && router.push(item.route as any))}
              >
                <View
                  className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                    item.danger
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-stone-100 dark:bg-stone-800'
                  }`}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={item.danger ? tokens.colors.danger : tokens.colors.gray[600]}
                  />
                </View>
                <Text
                  className={`flex-1 text-sm ${
                    item.danger
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-stone-800 dark:text-stone-200'
                  }`}
                  style={{ fontFamily: tokens.typography.fontFamily.sansMedium }}
                >
                  {item.label}
                </Text>
                {!item.danger && (
                  <Feather name="chevron-right" size={16} color={tokens.colors.gray[400]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
