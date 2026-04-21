import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/axios'
import { tokens } from '@/theme/tokens'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
})

type FormData = z.infer<typeof schema>

export default function LoginScreen() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      setError(null)
      const res = await authApi.post('/auth/login', data)
      login(res.data.user, res.data.accessToken)
      router.replace('/(tabs)')
    } catch {
      setError('Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-amber-500" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(0).duration(600)}
            className="px-6 pt-10 pb-8 items-center"
          >
            <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mb-4">
              <Text className="text-3xl">📚</Text>
            </View>
            <Text
              className="text-white text-3xl"
              style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
            >
              HappyTeach
            </Text>
            <Text
              className="text-amber-100 text-sm mt-1"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              Trợ lý AI cho giáo viên Việt Nam
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            className="flex-1 bg-stone-50 dark:bg-stone-950 rounded-t-3xl px-6 pt-8"
          >
            <Text
              className="text-stone-900 dark:text-white text-2xl mb-6"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Đăng nhập
            </Text>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  {error}
                </Text>
              </View>
            )}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View className="mb-4">
                  <Text className="text-stone-700 dark:text-stone-300 text-sm mb-1.5" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    Email
                  </Text>
                  <TextInput
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white"
                    style={{ fontFamily: tokens.typography.fontFamily.sans }}
                    placeholder="giaovien@truong.edu.vn"
                    placeholderTextColor={tokens.colors.gray[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.email && (
                    <Text className="text-red-500 text-xs mt-1" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                      {errors.email.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View className="mb-6">
                  <Text className="text-stone-700 dark:text-stone-300 text-sm mb-1.5" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    Mật khẩu
                  </Text>
                  <TextInput
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white"
                    style={{ fontFamily: tokens.typography.fontFamily.sans }}
                    placeholder="••••••••"
                    placeholderTextColor={tokens.colors.gray[400]}
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.password && (
                    <Text className="text-red-500 text-xs mt-1" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <TouchableOpacity
              className="bg-amber-500 rounded-xl py-4 items-center mb-4"
              style={tokens.shadow.md}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Đăng nhập
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center mb-6"
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text className="text-amber-600 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                Quên mật khẩu?
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
              <Text className="mx-4 text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>hoặc</Text>
              <View className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
            </View>

            <TouchableOpacity
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3.5 items-center flex-row justify-center gap-3 mb-3"
              style={tokens.shadow.sm}
            >
              <Text className="text-lg">G</Text>
              <Text className="text-stone-700 dark:text-stone-200 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                Tiếp tục với Google
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6 mb-4">
              <Text className="text-stone-500 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                Chưa có tài khoản?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text className="text-amber-600 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Đăng ký
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
