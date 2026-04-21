import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { gradingApi } from '@/lib/axios'

export default function AnswersScanScreen() {
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const [capturedPages, setCapturedPages] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const borderOpacity = useSharedValue(0.6)
  const borderStyle = useAnimatedStyle(() => ({ opacity: borderOpacity.value }))

  const scanMutation = useMutation({
    mutationFn: async (uris: string[]) => {
      setUploading(true)
      const formData = new FormData()
      uris.forEach((uri, i) => {
        formData.append('images', { uri, type: 'image/jpeg', name: `page_${i}.jpg` } as unknown as Blob)
      })
      const response = await gradingApi.post(
        `/grading/submissions/${submissionId}/scan/answers`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 },
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      router.replace({ pathname: '/grading/scan/approve', params: { submissionId } })
    },
    onError: () => {
      setUploading(false)
      Alert.alert('Lỗi', 'Không thể xử lý ảnh. Vui lòng thử lại.')
    },
  })

  const capturePage = useCallback(async () => {
    if (!cameraRef.current || processing) return
    setProcessing(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (!photo) throw new Error('No photo')
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      )
      setCapturedPages((prev) => [...prev, compressed.uri])
    } catch {
      Alert.alert('Lỗi', 'Không thể chụp ảnh')
    } finally {
      setProcessing(false)
    }
  }, [processing])

  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-stone-950 items-center justify-center px-8">
        <Feather name="camera-off" size={48} color={tokens.colors.gray[400]} />
        <Text className="text-white text-lg mt-4 mb-2 text-center" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Cần quyền truy cập camera
        </Text>
        <TouchableOpacity className="bg-amber-500 px-6 py-3 rounded-xl mt-4" onPress={requestPermission}>
          <Text className="text-white" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>Cấp quyền</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  if (uploading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-950 items-center justify-center px-8">
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <View className="w-20 h-20 rounded-full bg-violet-900/50 items-center justify-center mb-6">
            <ActivityIndicator size="large" color={tokens.colors.secondary[400]} />
          </View>
          <Text className="text-white text-xl mb-2 text-center" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            AI đang đọc và chấm bài...
          </Text>
          <Text className="text-stone-400 text-sm text-center" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Claude Vision đang phân tích {capturedPages.length} trang
          </Text>
        </Animated.View>
      </SafeAreaView>
    )
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        onCameraReady={() => {
          borderOpacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true)
        }}
      >
        {/* Guide overlay */}
        <View className="flex-1 items-center justify-center">
          <Animated.View
            style={[{ width: 300, height: 400, borderRadius: 12, borderWidth: 2, borderColor: '#A78BFA' }, borderStyle]}
          />
          <Text
            className="text-white text-sm mt-4 text-center"
            style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}
          >
            Chụp trang trả lời tự luận
          </Text>
        </View>

        {/* Header */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
          <View className="flex-row items-center justify-between px-5 py-3">
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              Quét Tự Luận
            </Text>
            <View className="bg-violet-600/80 px-3 py-1 rounded-full">
              <Text className="text-white text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                {capturedPages.length} trang
              </Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Bottom controls */}
        <View className="absolute bottom-0 left-0 right-0 pb-12">
          <View className="flex-row items-center justify-center gap-8">
            {capturedPages.length > 0 && (
              <TouchableOpacity
                className="w-14 h-14 rounded-full bg-stone-800/80 items-center justify-center"
                onPress={() => setCapturedPages((prev) => prev.slice(0, -1))}
              >
                <Feather name="trash-2" size={18} color="#FFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={capturePage}
              disabled={processing}
              className="w-20 h-20 rounded-full bg-white items-center justify-center"
              style={{ opacity: processing ? 0.6 : 1 }}
            >
              {processing ? (
                <ActivityIndicator size="large" color={tokens.colors.secondary[600]} />
              ) : (
                <View className="w-16 h-16 rounded-full bg-violet-600" />
              )}
            </TouchableOpacity>

            {capturedPages.length > 0 && (
              <TouchableOpacity
                className="w-14 h-14 rounded-full bg-violet-600/90 items-center justify-center"
                onPress={() => scanMutation.mutate(capturedPages)}
              >
                <Feather name="send" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-white/70 text-xs mt-3 text-center" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            {capturedPages.length === 0 ? 'Chụp lần lượt từng trang' : `${capturedPages.length} trang • Nhấn ▶ để gửi AI chấm`}
          </Text>
        </View>
      </CameraView>
    </View>
  )
}
