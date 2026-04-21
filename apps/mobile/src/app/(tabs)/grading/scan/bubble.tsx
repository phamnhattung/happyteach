import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { gradingApi } from '@/lib/axios'

interface KeyedResult {
  questionId: string
  detected: string | null
  correct: string
  isCorrect: boolean
  points: number
  confidence: number
}

interface ScanResult {
  keyedScore: number
  keyedTotal: number
  pendingAiCount: number
  results: KeyedResult[]
}

function CornerIndicator({ style }: { style: object }) {
  return (
    <View style={[{ position: 'absolute', width: 24, height: 24, borderColor: '#22C55E', borderWidth: 3 }, style]} />
  )
}

export default function BubbleScanScreen() {
  const { submissionId, examId } = useLocalSearchParams<{ submissionId: string; examId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const [phase, setPhase] = useState<'camera' | 'preview' | 'result'>('camera')
  const [isStable, setIsStable] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [manualCorrections, setManualCorrections] = useState<Record<string, string>>({})

  const borderPulse = useSharedValue(0.5)
  const borderStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + borderPulse.value * 0.5,
  }))

  const scanMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData()
      formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'bubble.jpg' } as unknown as Blob)
      const response = await gradingApi.post(`/grading/submissions/${submissionId}/scan/bubble`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })
      return response.data as ScanResult
    },
    onSuccess: (result) => {
      setScanResult(result)
      setPhase('result')
      setProcessing(false)
    },
    onError: () => {
      setProcessing(false)
      Alert.alert('Lỗi quét', 'Không thể đọc phiếu trả lời. Hãy chụp lại hoặc nhập thủ công.')
    },
  })

  const captureAndScan = useCallback(async () => {
    if (!cameraRef.current || processing) return
    setProcessing(true)

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (!photo) throw new Error('No photo captured')

      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      )
      setCapturedUri(compressed.uri)
      setPhase('preview')
      scanMutation.mutate(compressed.uri)
    } catch {
      setProcessing(false)
      Alert.alert('Lỗi', 'Không thể chụp ảnh')
    }
  }, [processing, scanMutation])

  const handleConfirm = () => {
    queryClient.invalidateQueries({ queryKey: ['submissions'] })
    if (scanResult && scanResult.pendingAiCount > 0) {
      router.replace({ pathname: '/grading/scan/answers', params: { submissionId } })
    } else {
      router.back()
    }
  }

  if (!permission) return <View className="flex-1 bg-black" />

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-stone-950 items-center justify-center px-8">
        <Feather name="camera-off" size={48} color={tokens.colors.gray[400]} />
        <Text className="text-white text-lg mt-4 mb-2 text-center" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Cần quyền truy cập camera
        </Text>
        <TouchableOpacity className="bg-amber-500 px-6 py-3 rounded-xl mt-4" onPress={requestPermission}>
          <Text className="text-white" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>Cấp quyền camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  if (phase === 'result' && scanResult) {
    const flagged = scanResult.results.filter((r) => r.confidence < 0.55)

    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
        <View className="flex-row items-center gap-3 px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <TouchableOpacity onPress={() => setPhase('camera')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={tokens.colors.gray[700]} />
          </TouchableOpacity>
          <Text className="text-stone-900 dark:text-white text-base flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Kết quả quét
          </Text>
          <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
            <Text className="text-green-700 dark:text-green-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              {scanResult.keyedScore}/{scanResult.keyedTotal} điểm
            </Text>
          </View>
        </View>

        {flagged.length > 0 && (
          <View className="mx-5 mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-2xl p-3 flex-row gap-2">
            <Feather name="alert-triangle" size={16} color="#B45309" style={{ marginTop: 1 }} />
            <Text className="text-amber-800 dark:text-amber-300 text-sm flex-1" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              {flagged.length} câu có độ chắc chắn thấp — kiểm tra lại
            </Text>
          </View>
        )}

        <ScrollView className="flex-1 px-5 mt-4" showsVerticalScrollIndicator={false}>
          {scanResult.results.map((r, i) => (
            <Animated.View key={r.questionId} entering={FadeInUp.delay(i * 30).duration(200)}>
              <View
                className={`mb-2 rounded-xl p-3 flex-row items-center ${r.confidence < 0.55 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200' : r.isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}
              >
                <View className="w-7 h-7 rounded-full bg-white dark:bg-stone-800 items-center justify-center mr-3">
                  <Text className="text-stone-600 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                    {i + 1}
                  </Text>
                </View>
                <Text className="flex-1 text-stone-700 dark:text-stone-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                  Đáp án: {r.detected ?? '?'}
                  {r.correct && ` / Đúng: ${r.correct}`}
                </Text>
                <View className="flex-row items-center gap-1">
                  {r.confidence < 0.55 && <Feather name="alert-circle" size={12} color="#B45309" />}
                  {r.isCorrect ? (
                    <Feather name="check-circle" size={16} color="#16A34A" />
                  ) : (
                    <Feather name="x-circle" size={16} color="#DC2626" />
                  )}
                </View>
              </View>
            </Animated.View>
          ))}
          <View className="h-24" />
        </ScrollView>

        <View className="px-5 pb-6 pt-3 border-t border-stone-100 dark:border-stone-800">
          <TouchableOpacity
            className="bg-amber-500 py-4 rounded-2xl items-center flex-row justify-center gap-2"
            style={tokens.shadow.md}
            onPress={handleConfirm}
          >
            <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              {scanResult.pendingAiCount > 0 ? 'Tiếp theo: Quét tự luận →' : 'Xác nhận & Hoàn tất'}
            </Text>
          </TouchableOpacity>
        </View>
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
          borderPulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true)
          setTimeout(() => setIsStable(true), 2000)
        }}
      >
        {/* Dark overlay with hole */}
        <View className="flex-1 items-center justify-center">
          <Animated.View
            style={[
              {
                width: 280,
                height: 380,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: isStable ? '#22C55E' : '#FBBF24',
              },
              borderStyle,
            ]}
          >
            <CornerIndicator style={{ top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 }} />
            <CornerIndicator style={{ top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 }} />
            <CornerIndicator style={{ bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 }} />
            <CornerIndicator style={{ bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 }} />
          </Animated.View>

          <Text
            className="text-white text-sm mt-4 text-center"
            style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}
          >
            {isStable ? '✓ Căn chỉnh xong — nhấn để chụp' : 'Đặt phiếu trả lời vào khung'}
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
              Quét Phiếu Trắc Nghiệm
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        {/* Bottom capture */}
        <View className="absolute bottom-0 left-0 right-0 items-center pb-12">
          <TouchableOpacity
            onPress={captureAndScan}
            disabled={processing}
            className="w-20 h-20 rounded-full bg-white items-center justify-center"
            style={{ opacity: processing ? 0.6 : 1 }}
          >
            {processing ? (
              <ActivityIndicator size="large" color={tokens.colors.primary[600]} />
            ) : (
              <View className="w-16 h-16 rounded-full bg-amber-500" />
            )}
          </TouchableOpacity>
          <Text className="text-white/70 text-xs mt-2" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            {processing ? 'Đang xử lý...' : 'Nhấn để chụp'}
          </Text>
        </View>
      </CameraView>
    </View>
  )
}
