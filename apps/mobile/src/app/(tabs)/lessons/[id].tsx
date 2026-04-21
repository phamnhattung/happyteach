import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInDown } from 'react-native-reanimated'
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
  updatedAt: string
}

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'Khởi động':            { bg: '#FEF9C3', border: '#FDE047', text: '#713F12', dot: '#EAB308' },
  'Hình thành kiến thức': { bg: '#DBEAFE', border: '#93C5FD', text: '#1E3A5F', dot: '#3B82F6' },
  'Luyện tập':            { bg: '#DCFCE7', border: '#86EFAC', text: '#14532D', dot: '#22C55E' },
  'Vận dụng':             { bg: '#FCE7F3', border: '#F9A8D4', text: '#831843', dot: '#EC4899' },
}

const DEFAULT_PHASE = { bg: '#F5F5F4', border: '#D6D3D1', text: '#44403C', dot: '#A8A29E' }

function SkeletonBlock({ w = 'full', h = 4 }: { w?: string; h?: number }) {
  return (
    <View
      className={`bg-stone-200 dark:bg-stone-700 rounded-lg w-${w} mb-2`}
      style={{ height: h * 4 }}
    />
  )
}

function PhaseCard({ phase, index }: { phase: TeachingPhase; index: number }) {
  const colors = PHASE_COLORS[phase.phase] ?? DEFAULT_PHASE
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(350)}
      style={{
        backgroundColor: colors.bg,
        borderLeftWidth: 4,
        borderLeftColor: colors.dot,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.dot }} />
          <Text style={{ fontFamily: tokens.typography.fontFamily.sansBold, color: colors.text, fontSize: 14 }}>
            {phase.phase}
          </Text>
        </View>
        <View style={{ backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
          <Text style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, color: colors.text, fontSize: 11 }}>
            {phase.duration} phút
          </Text>
        </View>
      </View>

      {phase.activities.length > 0 && (
        <View className="mb-2">
          <Text style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, color: colors.text, fontSize: 12, marginBottom: 4 }}>
            Hoạt động
          </Text>
          {phase.activities.map((a, i) => (
            <View key={i} className="flex-row items-start gap-1.5 mb-1">
              <Text style={{ color: colors.dot, fontSize: 12, marginTop: 1 }}>•</Text>
              <Text style={{ fontFamily: tokens.typography.fontFamily.sans, color: colors.text, fontSize: 12, flex: 1 }}>
                {a}
              </Text>
            </View>
          ))}
        </View>
      )}

      {phase.teacherActions.length > 0 && (
        <View className="mb-2">
          <Text style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, color: colors.text, fontSize: 12, marginBottom: 4 }}>
            Giáo viên
          </Text>
          {phase.teacherActions.map((a, i) => (
            <View key={i} className="flex-row items-start gap-1.5 mb-1">
              <Feather name="user" size={10} color={colors.dot} style={{ marginTop: 2 }} />
              <Text style={{ fontFamily: tokens.typography.fontFamily.sans, color: colors.text, fontSize: 12, flex: 1 }}>
                {a}
              </Text>
            </View>
          ))}
        </View>
      )}

      {phase.studentActions.length > 0 && (
        <View>
          <Text style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold, color: colors.text, fontSize: 12, marginBottom: 4 }}>
            Học sinh
          </Text>
          {phase.studentActions.map((a, i) => (
            <View key={i} className="flex-row items-start gap-1.5 mb-1">
              <Feather name="users" size={10} color={colors.dot} style={{ marginTop: 2 }} />
              <Text style={{ fontFamily: tokens.typography.fontFamily.sans, color: colors.text, fontSize: 12, flex: 1 }}>
                {a}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-widest mb-3 mt-5"
      style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
    >
      {title}
    </Text>
  )
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: lesson, isLoading } = useQuery<Lesson>({
    queryKey: ['lesson', id],
    queryFn: () => lessonApi.get(`/lessons/${id}`).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  const deleteMutation = useMutation({
    mutationFn: () => lessonApi.delete(`/lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      router.back()
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => lessonApi.post(`/lessons/${id}/duplicate`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      router.replace(`/lessons/${res.data.id}`)
    },
  })

  const handleDelete = () => {
    Alert.alert(
      'Xóa bài giảng',
      'Bạn có chắc muốn xóa bài giảng này? Thao tác không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
        <View className="px-5 pt-4 pb-3 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center">
            <Feather name="arrow-left" size={18} color={tokens.colors.gray[600]} />
          </TouchableOpacity>
          <View className="flex-1">
            <SkeletonBlock w="3/4" h={5} />
            <SkeletonBlock w="1/2" h={3} />
          </View>
        </View>
        <ScrollView className="px-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-3">
              <SkeletonBlock w="1/3" h={4} />
              <SkeletonBlock w="full" h={3} />
              <SkeletonBlock w="4/5" h={3} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!lesson) return null

  const plan = lesson.content

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center mr-1"
        >
          <Feather name="arrow-left" size={18} color={tokens.colors.gray[600]} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text
            className="text-stone-900 dark:text-white text-base"
            style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            numberOfLines={1}
          >
            {plan.title}
          </Text>
          <Text
            className="text-stone-400 text-xs"
            style={{ fontFamily: tokens.typography.fontFamily.sans }}
          >
            {lesson.subject} · Lớp {lesson.grade} · {lesson.duration} phút
          </Text>
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center"
          onPress={() => router.push(`/lessons/${id}/preview`)}
        >
          <Feather name="eye" size={16} color={tokens.colors.gray[600]} />
        </TouchableOpacity>

        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center"
          onPress={() => {
            Alert.alert('Tùy chọn', '', [
              { text: 'Nhân bản', onPress: () => duplicateMutation.mutate() },
              { text: 'Xem & xuất PDF', onPress: () => router.push(`/lessons/${id}/preview`) },
              { text: 'Xóa', style: 'destructive', onPress: handleDelete },
              { text: 'Hủy', style: 'cancel' },
            ])
          }}
        >
          {duplicateMutation.isPending ? (
            <ActivityIndicator size="small" color={tokens.colors.primary[500]} />
          ) : (
            <Feather name="more-vertical" size={16} color={tokens.colors.gray[600]} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {/* Meta card */}
        <Animated.View
          entering={FadeInDown.duration(350)}
          className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-2"
          style={tokens.shadow.sm}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
                <Text style={{ fontSize: 20 }}>📖</Text>
              </View>
              <View>
                <View className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full self-start">
                  <Text
                    className="text-amber-700 dark:text-amber-400 text-xs"
                    style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                  >
                    {lesson.subject} · Lớp {lesson.grade}
                  </Text>
                </View>
                <Text
                  className="text-stone-400 text-xs mt-1"
                  style={{ fontFamily: tokens.typography.fontFamily.sans }}
                >
                  {lesson.duration} phút · Độ khó: {plan.estimatedDifficulty}/5
                </Text>
              </View>
            </View>
          </View>

          {/* Objectives */}
          <SectionHeader title="Mục tiêu bài học" />
          {plan.objectives.map((obj, i) => (
            <View key={i} className="flex-row items-start gap-2 mb-2">
              <View
                className="w-5 h-5 rounded-full bg-amber-500 items-center justify-center shrink-0 mt-0.5"
              >
                <Text style={{ color: '#FFF', fontSize: 10, fontFamily: tokens.typography.fontFamily.sansBold }}>
                  {i + 1}
                </Text>
              </View>
              <Text
                className="text-stone-700 dark:text-stone-300 text-sm flex-1"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                {obj}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Teaching flow */}
        <SectionHeader title="Tiến trình dạy học" />
        {plan.teachingFlow.map((phase, i) => (
          <PhaseCard key={i} phase={phase} index={i} />
        ))}

        {/* Materials */}
        {plan.materials.length > 0 && (
          <>
            <SectionHeader title="Thiết bị & Tài liệu" />
            <Animated.View
              entering={FadeInDown.delay(400).duration(350)}
              className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-2"
              style={tokens.shadow.sm}
            >
              {plan.materials.map((m, i) => (
                <View key={i} className="flex-row items-center gap-2 mb-2">
                  <Feather name="package" size={13} color={tokens.colors.primary[500]} />
                  <Text
                    className="text-stone-700 dark:text-stone-300 text-sm"
                    style={{ fontFamily: tokens.typography.fontFamily.sans }}
                  >
                    {m}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </>
        )}

        {/* Homework */}
        {plan.homework && (
          <>
            <SectionHeader title="Bài tập về nhà" />
            <Animated.View
              entering={FadeInDown.delay(480).duration(350)}
              className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-2"
              style={tokens.shadow.sm}
            >
              <Text
                className="text-stone-700 dark:text-stone-300 text-sm leading-6"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                {plan.homework}
              </Text>
            </Animated.View>
          </>
        )}

        {/* Notes */}
        {plan.notes && (
          <>
            <SectionHeader title="Ghi chú sư phạm" />
            <Animated.View
              entering={FadeInDown.delay(540).duration(350)}
              className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-2 border border-amber-200 dark:border-amber-800"
            >
              <View className="flex-row items-start gap-2">
                <Feather name="info" size={14} color={tokens.colors.primary[600]} style={{ marginTop: 2 }} />
                <Text
                  className="text-amber-800 dark:text-amber-300 text-sm flex-1 leading-6"
                  style={{ fontFamily: tokens.typography.fontFamily.sans }}
                >
                  {plan.notes}
                </Text>
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 px-5 pb-6 pt-3 flex-row gap-3"
      >
        <TouchableOpacity
          className="flex-1 py-3.5 rounded-xl border border-stone-200 dark:border-stone-700 flex-row items-center justify-center gap-2"
          onPress={() => router.push(`/lessons/${id}/preview`)}
        >
          <Feather name="file-text" size={16} color={tokens.colors.gray[600]} />
          <Text
            className="text-stone-700 dark:text-stone-300 text-sm"
            style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
          >
            Xem & PDF
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-3.5 rounded-xl bg-amber-500 flex-row items-center justify-center gap-2"
          style={tokens.shadow.md}
          onPress={() => duplicateMutation.mutate()}
          disabled={duplicateMutation.isPending}
        >
          {duplicateMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Feather name="copy" size={16} color="#FFF" />
              <Text
                className="text-white text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Nhân bản
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
