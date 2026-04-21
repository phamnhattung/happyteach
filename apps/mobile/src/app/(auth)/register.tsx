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
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/axios'
import { tokens } from '@/theme/tokens'

const schema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100),
  schoolName: z.string().max(200).optional(),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72),
})

type FormData = z.infer<typeof schema>

const STEPS = ['Tên', 'Trường', 'Email', 'Mật khẩu'] as const

export default function RegisterScreen() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  })

  const stepFields: (keyof FormData)[][] = [['name'], ['schoolName'], ['email'], ['password']]

  const nextStep = async () => {
    const valid = await trigger(stepFields[step] as (keyof FormData)[])
    if (valid) setStep((s) => s + 1)
  }

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      setError(null)
      const res = await authApi.post('/auth/register', data)
      login(res.data.user, res.data.accessToken)
      router.replace('/(tabs)')
    } catch {
      setError('Email này đã được sử dụng')
      setStep(2)
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
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="px-6 pt-6 pb-6">
            <TouchableOpacity
              onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
              className="mb-4"
            >
              <Feather name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-amber-100 text-sm mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansMedium }}>
              Bước {step + 1} / {STEPS.length}
            </Text>
            <Text className="text-white text-2xl" style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}>
              Tạo tài khoản
            </Text>

            {/* Progress */}
            <View className="flex-row gap-1.5 mt-4">
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-amber-300/50'}`}
                />
              ))}
            </View>
          </View>

          {/* Form card */}
          <View className="flex-1 bg-stone-50 dark:bg-stone-950 rounded-t-3xl px-6 pt-8">
            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            )}

            {step === 0 && (
              <Animated.View entering={FadeInRight.duration(300)}>
                <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Bạn tên gì?
                </Text>
                <Text className="text-stone-500 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  Tên sẽ hiển thị cho học sinh và phụ huynh
                </Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value } }) => (
                    <View>
                      <TextInput
                        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white text-lg"
                        style={{ fontFamily: tokens.typography.fontFamily.sans }}
                        placeholder="Nguyễn Thị An"
                        placeholderTextColor={tokens.colors.gray[400]}
                        autoFocus
                        value={value}
                        onChangeText={onChange}
                      />
                      {errors.name && <Text className="text-red-500 text-xs mt-1">{errors.name.message}</Text>}
                    </View>
                  )}
                />
              </Animated.View>
            )}

            {step === 1 && (
              <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
                <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Bạn dạy ở đâu?
                </Text>
                <Text className="text-stone-500 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  Tùy chọn — giúp AI cá nhân hóa tốt hơn
                </Text>
                <Controller
                  control={control}
                  name="schoolName"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white text-lg"
                      style={{ fontFamily: tokens.typography.fontFamily.sans }}
                      placeholder="THPT Nguyễn Du"
                      placeholderTextColor={tokens.colors.gray[400]}
                      autoFocus
                      value={value ?? ''}
                      onChangeText={onChange}
                    />
                  )}
                />
              </Animated.View>
            )}

            {step === 2 && (
              <Animated.View entering={FadeInRight.duration(300)}>
                <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Email của bạn?
                </Text>
                <Text className="text-stone-500 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  Dùng để đăng nhập và nhận thông báo
                </Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <View>
                      <TextInput
                        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white text-lg"
                        style={{ fontFamily: tokens.typography.fontFamily.sans }}
                        placeholder="giaovien@truong.edu.vn"
                        placeholderTextColor={tokens.colors.gray[400]}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                        value={value}
                        onChangeText={onChange}
                      />
                      {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email.message}</Text>}
                    </View>
                  )}
                />
              </Animated.View>
            )}

            {step === 3 && (
              <Animated.View entering={FadeInRight.duration(300)}>
                <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Tạo mật khẩu
                </Text>
                <Text className="text-stone-500 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  Tối thiểu 8 ký tự
                </Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <View>
                      <TextInput
                        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white text-lg"
                        style={{ fontFamily: tokens.typography.fontFamily.sans }}
                        placeholder="••••••••"
                        placeholderTextColor={tokens.colors.gray[400]}
                        secureTextEntry
                        autoFocus
                        value={value}
                        onChangeText={onChange}
                      />
                      {errors.password && <Text className="text-red-500 text-xs mt-1">{errors.password.message}</Text>}
                    </View>
                  )}
                />
              </Animated.View>
            )}

            <TouchableOpacity
              className="bg-amber-500 rounded-xl py-4 items-center mt-8"
              style={tokens.shadow.md}
              onPress={step < 3 ? nextStep : handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  {step < 3 ? 'Tiếp theo' : 'Tạo tài khoản'}
                </Text>
              )}
            </TouchableOpacity>

            {step === 0 && (
              <View className="flex-row justify-center mt-6">
                <Text className="text-stone-500 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  Đã có tài khoản?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text className="text-amber-600 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                    Đăng nhập
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
