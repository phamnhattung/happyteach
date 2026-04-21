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
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { authApi } from '@/lib/axios'
import { tokens } from '@/theme/tokens'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      await authApi.post('/auth/forgot', data)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center px-6">
        <Animated.View entering={FadeInDown.duration(500)} className="items-center">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-6">
            <Feather name="mail" size={36} color={tokens.colors.secondary[600]} />
          </View>
          <Text className="text-stone-900 dark:text-white text-2xl mb-3 text-center" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Kiểm tra email
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm text-center mb-8 leading-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Chúng tôi đã gửi link đặt lại mật khẩu vào email của bạn. Kiểm tra cả thư mục spam nhé.
          </Text>
          <TouchableOpacity
            className="bg-amber-500 rounded-xl px-8 py-3.5"
            onPress={() => router.back()}
          >
            <Text className="text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              Quay lại đăng nhập
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="px-6 pt-4">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Feather name="arrow-left" size={24} color={tokens.colors.gray[700]} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(500)}>
            <Text className="text-stone-900 dark:text-white text-2xl mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              Quên mật khẩu?
            </Text>
            <Text className="text-stone-500 dark:text-stone-400 text-sm mb-8" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View className="mb-6">
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
                    <Text className="text-red-500 text-xs mt-1">{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            <TouchableOpacity
              className="bg-amber-500 rounded-xl py-4 items-center"
              style={tokens.shadow.md}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  Gửi link đặt lại mật khẩu
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
