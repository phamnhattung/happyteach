import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { authApi } from '@/lib/axios'
import { tokens } from '@/theme/tokens'

const schema = z
  .object({
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Mật khẩu không khớp',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token: string }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!token) { setError('Link không hợp lệ'); return }
    try {
      setLoading(true)
      setError(null)
      await authApi.post('/auth/reset', { token, password: data.password })
      setDone(true)
    } catch {
      setError('Link đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center px-6">
        <Animated.View entering={FadeInDown.duration(500)} className="items-center">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-6">
            <Feather name="check" size={36} color={tokens.colors.secondary[600]} />
          </View>
          <Text className="text-stone-900 dark:text-white text-2xl mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Đặt lại thành công!
          </Text>
          <Text className="text-stone-500 text-sm text-center mb-8" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Mật khẩu đã được cập nhật. Đăng nhập bằng mật khẩu mới.
          </Text>
          <TouchableOpacity className="bg-amber-500 rounded-xl px-8 py-3.5" onPress={() => router.replace('/(auth)/login')}>
            <Text className="text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="px-6 pt-4">
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text className="text-stone-900 dark:text-white text-2xl mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              Mật khẩu mới
            </Text>
            <Text className="text-stone-500 text-sm mb-8" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              Nhập mật khẩu mới cho tài khoản của bạn
            </Text>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View className="mb-4">
                  <Text className="text-stone-700 dark:text-stone-300 text-sm mb-1.5" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    Mật khẩu mới
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
                  {errors.password && <Text className="text-red-500 text-xs mt-1">{errors.password.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirm"
              render={({ field: { onChange, value } }) => (
                <View className="mb-6">
                  <Text className="text-stone-700 dark:text-stone-300 text-sm mb-1.5" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    Xác nhận mật khẩu
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
                  {errors.confirm && <Text className="text-red-500 text-xs mt-1">{errors.confirm.message}</Text>}
                </View>
              )}
            />

            <TouchableOpacity
              className="bg-amber-500 rounded-xl py-4 items-center"
              style={tokens.shadow.md}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Cập nhật mật khẩu
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
