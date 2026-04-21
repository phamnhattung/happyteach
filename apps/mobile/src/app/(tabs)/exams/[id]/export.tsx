import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { examApi } from '@/lib/axios'

interface Exam {
  id: string
  title: string
  subject: string
  grade: string
  duration: number
  status: string
  questions: { gradingMode: string }[]
  versions?: { version: string }[]
}

type VersionLabel = 'A' | 'B' | 'C'

const EXAM_URL = process.env.EXPO_PUBLIC_EXAM_URL ?? 'http://localhost:3003'

async function downloadPdf(url: string, filename: string): Promise<void> {
  const token = (await import('@/store/auth.store')).useAuthStore.getState().accessToken
  const localUri = `${FileSystem.cacheDirectory}${filename}`
  const res = await FileSystem.downloadAsync(url, localUri, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  })
  if (res.status !== 200) throw new Error('Download failed')
  await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: `Chia sẻ ${filename}` })
}

function ExportCard({
  icon,
  title,
  description,
  color,
  onPress,
  loading,
  disabled,
}: {
  icon: string
  title: string
  description: string
  color: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      className={`bg-white dark:bg-stone-800 rounded-2xl p-4 mb-3 flex-row items-center gap-4 ${disabled ? 'opacity-50' : ''}`}
      style={tokens.shadow.sm}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <View
        className="w-12 h-12 rounded-xl items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-stone-900 dark:text-white text-sm mb-0.5" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          {title}
        </Text>
        <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
          {description}
        </Text>
      </View>
      <Feather name="download" size={18} color={color} />
    </TouchableOpacity>
  )
}

export default function ExamExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [selectedVersion, setSelectedVersion] = useState<VersionLabel>('A')
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data: exam } = useQuery<Exam>({
    queryKey: ['exam', id],
    queryFn: () => examApi.get(`/exams/${id}`).then((r) => r.data),
  })

  const hasKeyedQuestions = (exam?.questions ?? []).some((q) => q.gradingMode === 'keyed')
  const hasVersions = (exam?.versions ?? []).length > 0

  const download = async (type: 'student' | 'bubble' | 'key') => {
    setDownloading(type)
    try {
      let url = `${EXAM_URL}/exams/${id}/pdf/${type}`
      let filename = `exam-${id}`

      if (type === 'student') {
        url += `?version=${selectedVersion}`
        filename += `-${selectedVersion}-student.pdf`
      } else if (type === 'bubble') {
        url += `?version=${selectedVersion}`
        filename += `-${selectedVersion}-bubble.pdf`
      } else {
        filename += `-key.pdf`
      }

      await downloadPdf(url, filename)
    } catch {
      Alert.alert('Lỗi', 'Không thể tải file. Vui lòng thử lại.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={tokens.colors.gray[700]} />
        </TouchableOpacity>
        <Text className="text-stone-800 dark:text-stone-200 text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Xuất đề thi
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        {exam && (
          <Animated.View entering={FadeInUp.duration(300)} className="mb-4 bg-white dark:bg-stone-800 rounded-2xl p-4" style={tokens.shadow.sm}>
            <Text className="text-stone-500 dark:text-stone-400 text-xs mb-1" style={{ fontFamily: tokens.typography.fontFamily.sans }}>Đề thi</Text>
            <Text className="text-stone-900 dark:text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }} numberOfLines={2}>
              {exam.title}
            </Text>
            <Text className="text-stone-500 dark:text-stone-400 text-xs mt-1" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              {exam.subject} · Lớp {exam.grade} · {exam.duration} phút
            </Text>
          </Animated.View>
        )}

        {/* Version selector */}
        <Animated.View entering={FadeInUp.delay(60).duration(300)} className="mb-4">
          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Phiên bản đề
          </Text>
          <View className="flex-row gap-2">
            {(['A', 'B', 'C'] as VersionLabel[]).map((v) => (
              <TouchableOpacity
                key={v}
                className={`flex-1 py-3 rounded-xl items-center border ${selectedVersion === v ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'}`}
                style={selectedVersion === v ? tokens.shadow.sm : undefined}
                onPress={() => setSelectedVersion(v)}
              >
                <Text
                  className={`text-base ${selectedVersion === v ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}
                  style={{ fontFamily: selectedVersion === v ? tokens.typography.fontFamily.sansBold : tokens.typography.fontFamily.sans }}
                >
                  Đề {v}
                </Text>
                {hasVersions && (
                  <Text className={`text-xs mt-0.5 ${selectedVersion === v ? 'text-violet-200' : 'text-stone-400'}`} style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                    Đã tạo
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {!hasVersions && (
            <Text className="text-stone-400 dark:text-stone-500 text-xs mt-2" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              Phiên bản B/C sẽ tự tạo khi xuất (câu hỏi trắc nghiệm được xáo trộn)
            </Text>
          )}
        </Animated.View>

        {/* Export options */}
        <Animated.View entering={FadeInUp.delay(120).duration(300)}>
          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Loại tài liệu
          </Text>

          <ExportCard
            icon="📄"
            title="Đề cho học sinh"
            description={`Câu hỏi + chỗ trống làm bài · Phiên bản ${selectedVersion}`}
            color="#6D28D9"
            loading={downloading === 'student'}
            onPress={() => download('student')}
          />

          {hasKeyedQuestions && (
            <ExportCard
              icon="🔘"
              title="Phiếu trả lời (Bubble sheet)"
              description={`Dành cho câu trắc nghiệm · Mã QR tích hợp · Phiên bản ${selectedVersion}`}
              color="#1D4ED8"
              loading={downloading === 'bubble'}
              onPress={() => download('bubble')}
            />
          )}

          <ExportCard
            icon="🔑"
            title="Đáp án (Giáo viên)"
            description="Đáp án + thang điểm rubric · Có watermark bảo mật"
            color="#B45309"
            loading={downloading === 'key'}
            onPress={() => {
              Alert.alert(
                'Tải đáp án',
                'File đáp án chỉ dành cho giáo viên. Bạn có chắc chắn muốn tải không?',
                [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Tải xuống', onPress: () => download('key') },
                ],
              )
            }}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(300)} className="mt-2 mb-6">
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex-row gap-3">
            <Feather name="info" size={16} color="#1D4ED8" style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-blue-700 dark:text-blue-400 text-xs mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                Quy trình chấm bài
              </Text>
              <Text className="text-blue-600 dark:text-blue-500 text-xs leading-5" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                1. In phiếu bubble sheet + đề cho học sinh{'\n'}
                2. Thu bài → Camera quét phiếu bubble (auto-chấm trắc nghiệm){'\n'}
                3. Camera quét bài tự luận → AI chấm{'\n'}
                4. Giáo viên duyệt điểm AI → hoàn tất
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}
