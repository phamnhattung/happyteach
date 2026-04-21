import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { tokens } from '@/theme/tokens'
import { lessonApi } from '@/lib/axios'
import type { LessonPlan, TeachingPhase } from '@happyteach/types'

interface Lesson {
  id: string
  title: string
  subject: string
  grade: number
  duration: number
  content: LessonPlan
  createdAt: string
}

const PHASE_ICONS: Record<string, string> = {
  'Khởi động':            '🚀',
  'Hình thành kiến thức': '💡',
  'Luyện tập':            '✏️',
  'Vận dụng':             '🎯',
}

const PHASE_DOT: Record<string, string> = {
  'Khởi động':            '#EAB308',
  'Hình thành kiến thức': '#3B82F6',
  'Luyện tập':            '#22C55E',
  'Vận dụng':             '#EC4899',
}

function Divider() {
  return <View className="h-px bg-stone-100 dark:bg-stone-800 my-4" />
}

function PreviewPhase({ phase }: { phase: TeachingPhase }) {
  const icon = PHASE_ICONS[phase.phase] ?? '📌'
  const dot = PHASE_DOT[phase.phase] ?? '#A8A29E'

  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2 mb-3">
        <Text style={{ fontSize: 16 }}>{icon}</Text>
        <Text
          className="text-stone-800 dark:text-stone-200 text-base flex-1"
          style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
        >
          {phase.phase}
        </Text>
        <View style={{ backgroundColor: dot + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
          <Text style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, color: dot, fontSize: 11 }}>
            {phase.duration} phút
          </Text>
        </View>
      </View>

      {[
        { label: 'Hoạt động', items: phase.activities, icon: 'list' as const },
        { label: 'Giáo viên', items: phase.teacherActions, icon: 'user' as const },
        { label: 'Học sinh', items: phase.studentActions, icon: 'users' as const },
      ].map(({ label, items, icon: featherIcon }) =>
        items.length > 0 ? (
          <View key={label} className="mb-3">
            <View className="flex-row items-center gap-1.5 mb-2">
              <Feather name={featherIcon} size={12} color={dot} />
              <Text
                style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, color: dot, fontSize: 12 }}
              >
                {label}
              </Text>
            </View>
            {items.map((item, i) => (
              <View key={i} className="flex-row items-start gap-2 mb-1.5 pl-2">
                <Text style={{ color: dot, fontSize: 12, marginTop: 1 }}>—</Text>
                <Text
                  className="text-stone-700 dark:text-stone-300 text-sm flex-1 leading-5"
                  style={{ fontFamily: tokens.typography.fontFamily.sans }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        ) : null,
      )}
    </View>
  )
}

export default function LessonPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const { data: lesson, isLoading } = useQuery<Lesson>({
    queryKey: ['lesson', id],
    queryFn: () => lessonApi.get(`/lessons/${id}`).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  const handleDownloadPdf = async () => {
    if (!lesson) return
    setDownloadingPdf(true)
    try {
      const baseUrl = process.env.EXPO_PUBLIC_LESSON_URL ?? 'http://localhost:3002'
      const token = (await import('@/store/auth.store')).useAuthStore.getState().accessToken
      const localUri = FileSystem.cacheDirectory + `lesson-${id}.pdf`

      const result = await FileSystem.downloadAsync(
        `${baseUrl}/lessons/${id}/pdf`,
        localUri,
        { headers: { Authorization: `Bearer ${token ?? ''}` } },
      )

      if (result.status !== 200) throw new Error('Download failed')

      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Giáo án: ${lesson.title}`,
          UTI: 'com.adobe.pdf',
        })
      } else {
        Alert.alert('Đã tải xuống', `PDF đã được lưu tại: ${result.uri}`)
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể xuất PDF. Vui lòng thử lại.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleShare = async () => {
    if (!lesson) return
    try {
      await Share.share({
        title: `Giáo án: ${lesson.content.title}`,
        message: `Giáo án ${lesson.subject} · Lớp ${lesson.grade}\n${lesson.content.title}\n\nTạo bởi HappyTeach`,
      })
    } catch {}
  }

  if (isLoading || !lesson) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-stone-950 items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={tokens.colors.primary[500]} />
      </SafeAreaView>
    )
  }

  const plan = lesson.content
  const date = new Date(lesson.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-stone-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center border-b border-stone-100 dark:border-stone-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={tokens.colors.gray[600]} />
        </TouchableOpacity>
        <Text
          className="text-stone-900 dark:text-white text-base flex-1"
          style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
          numberOfLines={1}
        >
          Xem trước giáo án
        </Text>
        <TouchableOpacity onPress={handleShare} className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center ml-2">
          <Feather name="share-2" size={16} color={tokens.colors.gray[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 120 }}
      >
        {/* Title block */}
        <View className="mb-2">
          <Text
            className="text-stone-400 text-xs uppercase tracking-widest mb-1"
            style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
          >
            GIÁO ÁN
          </Text>
          <Text
            className="text-stone-900 dark:text-white text-2xl mb-2"
            style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
          >
            {plan.title}
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-3">
            {[
              lesson.subject,
              `Lớp ${lesson.grade}`,
              `${lesson.duration} phút`,
              `Độ khó ${plan.estimatedDifficulty}/5`,
            ].map((tag) => (
              <View key={tag} className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full">
                <Text
                  className="text-stone-600 dark:text-stone-300 text-xs"
                  style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          <Text
            className="text-stone-400 text-xs"
            style={{ fontFamily: tokens.typography.fontFamily.sans }}
          >
            Ngày tạo: {date}
          </Text>
        </View>

        <Divider />

        {/* Objectives */}
        <Text
          className="text-stone-800 dark:text-stone-200 text-base mb-3"
          style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
        >
          🎯 Mục tiêu bài học
        </Text>
        {plan.objectives.map((obj, i) => (
          <View key={i} className="flex-row items-start gap-2 mb-2">
            <View className="w-5 h-5 rounded-full bg-amber-500 items-center justify-center shrink-0 mt-0.5">
              <Text style={{ color: '#FFF', fontSize: 10, fontFamily: tokens.typography.fontFamily.sansBold }}>
                {i + 1}
              </Text>
            </View>
            <Text
              className="text-stone-700 dark:text-stone-300 text-sm flex-1 leading-6"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              {obj}
            </Text>
          </View>
        ))}

        <Divider />

        {/* Materials */}
        {plan.materials.length > 0 && (
          <>
            <Text
              className="text-stone-800 dark:text-stone-200 text-base mb-3"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              📦 Thiết bị & Tài liệu
            </Text>
            {plan.materials.map((m, i) => (
              <View key={i} className="flex-row items-center gap-2 mb-2">
                <Feather name="check-circle" size={14} color={tokens.colors.primary[500]} />
                <Text
                  className="text-stone-700 dark:text-stone-300 text-sm"
                  style={{ fontFamily: tokens.typography.fontFamily.sans }}
                >
                  {m}
                </Text>
              </View>
            ))}
            <Divider />
          </>
        )}

        {/* Teaching flow */}
        <Text
          className="text-stone-800 dark:text-stone-200 text-base mb-4"
          style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
        >
          📋 Tiến trình dạy học
        </Text>
        {plan.teachingFlow.map((phase, i) => (
          <PreviewPhase key={i} phase={phase} />
        ))}

        <Divider />

        {/* Homework */}
        {plan.homework && (
          <>
            <Text
              className="text-stone-800 dark:text-stone-200 text-base mb-2"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              📝 Bài tập về nhà
            </Text>
            <Text
              className="text-stone-700 dark:text-stone-300 text-sm leading-6 mb-4"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              {plan.homework}
            </Text>
            <Divider />
          </>
        )}

        {/* Notes */}
        {plan.notes && (
          <View className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
            <View className="flex-row items-start gap-2">
              <Feather name="info" size={14} color={tokens.colors.primary[600]} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text
                  className="text-amber-800 dark:text-amber-300 text-xs mb-1"
                  style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                >
                  Ghi chú sư phạm
                </Text>
                <Text
                  className="text-amber-800 dark:text-amber-300 text-sm leading-6"
                  style={{ fontFamily: tokens.typography.fontFamily.sans }}
                >
                  {plan.notes}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 px-5 pb-8 pt-3 flex-row gap-3"
      >
        <TouchableOpacity
          className="w-12 h-12 rounded-xl border border-stone-200 dark:border-stone-700 items-center justify-center"
          onPress={handleShare}
        >
          <Feather name="share-2" size={18} color={tokens.colors.gray[600]} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-3.5 rounded-xl bg-amber-500 flex-row items-center justify-center gap-2"
          style={tokens.shadow.md}
          onPress={handleDownloadPdf}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text
                className="text-white text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Đang xuất PDF...
              </Text>
            </>
          ) : (
            <>
              <Feather name="download" size={16} color="#FFF" />
              <Text
                className="text-white text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Xuất PDF
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
