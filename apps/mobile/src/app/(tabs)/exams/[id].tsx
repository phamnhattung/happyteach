import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { examApi } from '@/lib/axios'

interface RubricCriterion {
  name: string
  weight: number
  description: string
}

interface ExamQuestion {
  id: string
  type: string
  gradingMode: string
  order: number
  content: string
  points: number
  options?: string[]
  correctAnswer?: string
  rubric?: RubricCriterion[]
  sampleAnswer?: string
  maxWords?: number
}

interface Exam {
  id: string
  title: string
  subject: string
  grade: string
  duration: number
  status: string
  questions: ExamQuestion[]
  versions?: unknown[]
  createdAt: string
}

const TYPE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  mcq: { label: 'MCQ', bg: '#EFF6FF', text: '#1D4ED8' },
  true_false: { label: 'Đ/S', bg: '#F0FDF4', text: '#15803D' },
  fill_blank: { label: 'Điền', bg: '#EFF6FF', text: '#1D4ED8' },
  short: { label: 'Ngắn', bg: '#FFFBEB', text: '#B45309' },
  open: { label: 'Mở', bg: '#FFFBEB', text: '#C2410C' },
  essay: { label: 'Tự luận', bg: '#FAF5FF', text: '#6D28D9' },
}

function TypeBadge({ type }: { type: string }) {
  const badge = TYPE_BADGES[type] ?? { label: type, bg: '#F5F5F4', text: '#44403C' }
  return (
    <View style={{ backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
      <Text style={{ color: badge.text, fontSize: 10, fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
        {badge.label}
      </Text>
    </View>
  )
}

function GradingBadge({ mode }: { mode: string }) {
  if (mode === 'keyed') {
    return (
      <View className="flex-row items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
        <Feather name="key" size={9} color="#15803D" />
        <Text style={{ color: '#15803D', fontSize: 10, fontFamily: tokens.typography.fontFamily.sans }}>Chìa khoá</Text>
      </View>
    )
  }
  return (
    <View className="flex-row items-center gap-1 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
      <Feather name="cpu" size={9} color="#6D28D9" />
      <Text style={{ color: '#6D28D9', fontSize: 10, fontFamily: tokens.typography.fontFamily.sans }}>AI chấm</Text>
    </View>
  )
}

function QuestionCard({ question, index, onEdit }: { question: ExamQuestion; index: number; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(300)}>
      <TouchableOpacity
        className="bg-white dark:bg-stone-800 rounded-2xl mb-3 overflow-hidden"
        style={tokens.shadow.sm}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View className="flex-row items-start p-4 gap-3">
          <View className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-700 items-center justify-center shrink-0 mt-0.5">
            <Text className="text-stone-600 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              {index + 1}
            </Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text
              className="text-stone-900 dark:text-white text-sm mb-2"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
              numberOfLines={expanded ? undefined : 3}
            >
              {question.content}
            </Text>
            <View className="flex-row items-center gap-2 flex-wrap">
              <TypeBadge type={question.type} />
              <GradingBadge mode={question.gradingMode} />
              <Text className="text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                {question.points} điểm
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1 ml-2">
            <TouchableOpacity
              onPress={onEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-7 h-7 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-700"
            >
              <Feather name="edit-2" size={12} color={tokens.colors.gray[500]} />
            </TouchableOpacity>
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={tokens.colors.gray[400]}
              style={{ marginLeft: 4 }}
            />
          </View>
        </View>

        {expanded && (
          <View className="px-4 pb-4 border-t border-stone-100 dark:border-stone-700 pt-3">
            {question.gradingMode === 'keyed' && question.options && (
              <View className="gap-1.5 mb-3">
                {question.options.map((opt, i) => {
                  const label = question.type === 'true_false' ? opt : `${String.fromCharCode(65 + i)}. ${opt}`
                  const isCorrect = question.type === 'true_false'
                    ? opt === question.correctAnswer
                    : String.fromCharCode(65 + i) === question.correctAnswer
                  return (
                    <View key={i} className={`flex-row items-start gap-2 px-3 py-2 rounded-xl ${isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-stone-50 dark:bg-stone-700/50'}`}>
                      {isCorrect && <Feather name="check-circle" size={14} color="#16A34A" style={{ marginTop: 1 }} />}
                      <Text className={`text-sm flex-1 ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-stone-600 dark:text-stone-400'}`} style={{ fontFamily: isCorrect ? tokens.typography.fontFamily.sansSemiBold : tokens.typography.fontFamily.sans }}>
                        {label}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}

            {question.rubric && question.rubric.length > 0 && (
              <View className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 mb-2">
                <Text className="text-violet-700 dark:text-violet-400 text-xs mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                  Thang điểm Rubric
                </Text>
                {question.rubric.map((r, i) => (
                  <View key={i} className="flex-row justify-between items-start mb-1">
                    <Text className="text-violet-800 dark:text-violet-300 text-xs flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>{r.name} ({r.weight}%)</Text>
                    <Text className="text-violet-600 dark:text-violet-400 text-xs ml-2 text-right" style={{ fontFamily: tokens.typography.fontFamily.sans, maxWidth: 160 }}>{r.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {question.sampleAnswer && (
              <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                <Text className="text-amber-700 dark:text-amber-400 text-xs mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>Đáp án mẫu</Text>
                <Text className="text-amber-800 dark:text-amber-300 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>{question.sampleAnswer}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const { data: exam, isLoading } = useQuery<Exam>({
    queryKey: ['exam', id],
    queryFn: () => examApi.get(`/exams/${id}`).then((r) => r.data),
  })

  const publishMutation = useMutation({
    mutationFn: () => examApi.post(`/exams/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam', id] })
      queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })

  const versionsMutation = useMutation({
    mutationFn: () => examApi.post(`/exams/${id}/versions`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam', id] })
      Alert.alert('Thành công', 'Đã tạo 3 phiên bản đề A, B, C')
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => examApi.post(`/exams/${id}/duplicate`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      router.replace(`/exams/${res.data.id}`)
    },
  })

  if (isLoading || !exam) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>Đang tải...</Text>
      </SafeAreaView>
    )
  }

  const keyedCount = exam.questions.filter((q) => q.gradingMode === 'keyed').length
  const aiCount = exam.questions.filter((q) => q.gradingMode !== 'keyed').length
  const isDraft = exam.status === 'DRAFT'

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={tokens.colors.gray[700]} />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push(`/exams/${id}/export`)}
            className="flex-row items-center gap-1.5 bg-violet-100 dark:bg-violet-900/30 px-3 py-2 rounded-xl"
          >
            <Feather name="download" size={14} color={tokens.colors.secondary[600]} />
            <Text className="text-violet-700 dark:text-violet-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
              Xuất
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMoreMenu(true)}
            className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-xl items-center justify-center"
          >
            <Feather name="more-vertical" size={18} color={tokens.colors.gray[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Exam info card */}
        <View className="mx-5 mb-4 bg-white dark:bg-stone-800 rounded-2xl p-4" style={tokens.shadow.sm}>
          <View className="flex-row items-start justify-between mb-3">
            <Text
              className="text-stone-900 dark:text-white text-lg flex-1 mr-2"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              {exam.title}
            </Text>
            <View className={`px-2.5 py-1 rounded-full ${isDraft ? 'bg-amber-100' : 'bg-green-100'}`}>
              <Text className={`text-xs ${isDraft ? 'text-amber-700' : 'text-green-700'}`} style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                {isDraft ? 'Bản nháp' : 'Đã xuất bản'}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3 flex-wrap mb-3">
            <View className="flex-row items-center gap-1">
              <Feather name="book" size={13} color={tokens.colors.gray[400]} />
              <Text className="text-stone-500 dark:text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                {exam.subject} · Lớp {exam.grade}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Feather name="clock" size={13} color={tokens.colors.gray[400]} />
              <Text className="text-stone-500 dark:text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                {exam.duration} phút
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 items-center">
              <Text className="text-green-700 dark:text-green-400 text-lg" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>{keyedCount}</Text>
              <Text className="text-green-600 dark:text-green-500 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>Trắc nghiệm</Text>
            </View>
            <View className="flex-1 bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 items-center">
              <Text className="text-violet-700 dark:text-violet-400 text-lg" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>{aiCount}</Text>
              <Text className="text-violet-600 dark:text-violet-500 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>AI chấm</Text>
            </View>
            <View className="flex-1 bg-stone-50 dark:bg-stone-700 rounded-xl p-3 items-center">
              <Text className="text-stone-700 dark:text-stone-300 text-lg" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>{exam.questions.length}</Text>
              <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>Tổng</Text>
            </View>
          </View>
        </View>

        {/* Questions */}
        <View className="px-5">
          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Danh sách câu hỏi
          </Text>
          {exam.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              onEdit={() => Alert.alert('Sắp có', 'Chức năng chỉnh sửa câu hỏi đang được phát triển')}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom publish bar (only for drafts) */}
      {isDraft && (
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-stone-50 dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800">
          <TouchableOpacity
            className="bg-violet-600 py-4 rounded-2xl items-center flex-row justify-center gap-2"
            style={tokens.shadow.md}
            onPress={() => {
              Alert.alert('Xuất bản đề thi', 'Sau khi xuất bản, đề thi không thể chỉnh sửa. Tiếp tục?', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xuất bản', onPress: () => publishMutation.mutate() },
              ])
            }}
          >
            <Feather name="globe" size={18} color="#FFF" />
            <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              Xuất bản đề thi
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* More menu modal */}
      <Modal visible={showMoreMenu} transparent animationType="fade" onRequestClose={() => setShowMoreMenu(false)}>
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setShowMoreMenu(false)}>
          <View className="absolute top-24 right-5 bg-white dark:bg-stone-800 rounded-2xl overflow-hidden" style={{ ...tokens.shadow.lg, minWidth: 200 }}>
            {[
              { icon: 'copy' as const, label: 'Nhân bản', onPress: () => { setShowMoreMenu(false); duplicateMutation.mutate() } },
              keyedCount > 0 && { icon: 'layers' as const, label: 'Tạo đề A/B/C', onPress: () => { setShowMoreMenu(false); versionsMutation.mutate() } },
            ].filter(Boolean).map((item, i) => {
              if (!item) return null
              return (
                <TouchableOpacity
                  key={i}
                  className="flex-row items-center gap-3 px-4 py-3.5 border-b border-stone-100 dark:border-stone-700 last:border-0"
                  onPress={item.onPress}
                >
                  <Feather name={item.icon} size={16} color={tokens.colors.gray[600]} />
                  <Text className="text-stone-700 dark:text-stone-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}
