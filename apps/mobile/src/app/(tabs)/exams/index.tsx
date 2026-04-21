import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { tokens } from '@/theme/tokens'
import { examApi } from '@/lib/axios'

type ExamStatus = 'draft' | 'published' | 'archived'

interface ExamQuestion {
  type: string
  gradingMode: string
}

interface Exam {
  id: string
  title: string
  subject: string
  grade: string
  duration: number
  status: string
  questions: ExamQuestion[]
  createdAt: string
}

interface ExamsResponse {
  data: Exam[]
  total: number
  page: number
  limit: number
}

const STATUS_TABS: { key: ExamStatus; label: string }[] = [
  { key: 'draft', label: 'Bản nháp' },
  { key: 'published', label: 'Đã xuất bản' },
  { key: 'archived', label: 'Lưu trữ' },
]

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  mcq: { bg: '#EFF6FF', text: '#1D4ED8', label: 'MCQ' },
  true_false: { bg: '#F0FDF4', text: '#15803D', label: 'Đ/S' },
  fill_blank: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Điền' },
  short: { bg: '#FFFBEB', text: '#B45309', label: 'Ngắn' },
  open: { bg: '#FFFBEB', text: '#B45309', label: 'Mở' },
  essay: { bg: '#FAF5FF', text: '#6D28D9', label: 'Tự luận' },
}

function getQuestionSummary(questions: ExamQuestion[]): string {
  const counts: Record<string, number> = {}
  for (const q of questions) {
    counts[q.type] = (counts[q.type] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${TYPE_COLORS[type]?.label ?? type}`)
    .join(' · ')
}

function SkeletonCard() {
  return (
    <View className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-3 mx-5" style={tokens.shadow.sm}>
      <View className="bg-stone-200 dark:bg-stone-700 rounded-lg h-4 w-3/4 mb-2" />
      <View className="bg-stone-200 dark:bg-stone-700 rounded-lg h-3 w-1/2 mb-3" />
      <View className="flex-row gap-2">
        <View className="bg-stone-200 dark:bg-stone-700 rounded-full h-5 w-16" />
        <View className="bg-stone-200 dark:bg-stone-700 rounded-full h-5 w-20" />
      </View>
    </View>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'PUBLISHED') {
    return (
      <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full flex-row items-center gap-1">
        <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <Text className="text-green-700 dark:text-green-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>Đã xuất bản</Text>
      </View>
    )
  }
  if (status === 'ARCHIVED') {
    return (
      <View className="bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full">
        <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>Lưu trữ</Text>
      </View>
    )
  }
  return (
    <View className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
      <Text className="text-amber-700 dark:text-amber-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>Bản nháp</Text>
    </View>
  )
}

function ExamCard({ exam, index: cardIndex, onDelete, onPress }: {
  exam: Exam
  index: number
  onDelete: () => void
  onPress: () => void
}) {
  const date = new Date(exam.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const summary = getQuestionSummary(exam.questions)

  return (
    <Animated.View entering={FadeInUp.delay(cardIndex * 60).duration(350)}>
      <TouchableOpacity
        className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-3 mx-5"
        style={tokens.shadow.sm}
        onPress={onPress}
        onLongPress={() => {
          Alert.alert('Xóa đề thi', 'Bạn có chắc muốn xóa đề thi này không?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xóa', style: 'destructive', onPress: onDelete },
          ])
        }}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start justify-between mb-2">
          <Text
            className="text-stone-900 dark:text-white text-sm flex-1 mr-2"
            style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            numberOfLines={2}
          >
            {exam.title}
          </Text>
          <StatusBadge status={exam.status} />
        </View>

        <View className="flex-row items-center gap-2 mb-3 flex-wrap">
          <View className="bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
            <Text className="text-violet-700 dark:text-violet-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
              {exam.subject} · Lớp {exam.grade}
            </Text>
          </View>
          <Text className="text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            {exam.duration} phút
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            {summary || `${exam.questions.length} câu hỏi`}
          </Text>
          <Text className="text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            {date}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function ExamsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ExamStatus>('draft')
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery<ExamsResponse>({
    queryKey: ['exams', activeTab],
    queryFn: () => examApi.get('/exams', { params: { page: 1, limit: 50, status: activeTab } }).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examApi.delete(`/exams/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['exams'] })
      const key = ['exams', activeTab]
      const previous = queryClient.getQueryData<ExamsResponse>(key)
      queryClient.setQueryData<ExamsResponse>(key, (old) =>
        old ? { ...old, data: old.data.filter((e) => e.id !== id), total: old.total - 1 } : old,
      )
      return { previous, key }
    },
    onError: (_err, _id, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['exams'] }),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const exams = data?.data ?? []

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <Text className="text-stone-900 dark:text-white text-2xl" style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}>
            Đề thi
          </Text>
          <TouchableOpacity
            className="bg-violet-600 px-4 py-2.5 rounded-xl flex-row items-center gap-1.5"
            style={tokens.shadow.sm}
            onPress={() => router.push('/exams/generate')}
          >
            <Feather name="zap" size={14} color="#FFF" />
            <Text className="text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              AI tạo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status tabs */}
        <View className="flex-row mx-5 mb-4 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab.key ? 'bg-white dark:bg-stone-700' : ''}`}
              style={activeTab === tab.key ? tokens.shadow.sm : undefined}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                className={`text-xs ${activeTab === tab.key ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-400'}`}
                style={{ fontFamily: activeTab === tab.key ? tokens.typography.fontFamily.sansBold : tokens.typography.fontFamily.sans }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 pt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : exams.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 pb-20">
            <View className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 items-center justify-center mb-4">
              <Feather name="file-text" size={28} color={tokens.colors.secondary[600]} />
            </View>
            <Text className="text-stone-800 dark:text-stone-200 text-lg mb-2 text-center" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              Chưa có đề thi nào
            </Text>
            <Text className="text-stone-500 dark:text-stone-400 text-sm text-center mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              AI sẽ tạo đề thi hoàn chỉnh với nhiều dạng câu hỏi, xuất PDF sẵn sàng in
            </Text>
            <TouchableOpacity
              className="bg-violet-600 px-6 py-3 rounded-xl flex-row items-center gap-2"
              style={tokens.shadow.md}
              onPress={() => router.push('/exams/generate')}
            >
              <Feather name="zap" size={16} color="#FFF" />
              <Text className="text-white" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                Tạo đề thi đầu tiên
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={exams}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ExamCard
                exam={item}
                index={index}
                onDelete={() => deleteMutation.mutate(item.id)}
                onPress={() => router.push(`/exams/${item.id}`)}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colors.secondary[500]} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 bg-violet-600 rounded-full items-center justify-center"
          style={tokens.shadow.lg}
          onPress={() => router.push('/exams/generate')}
        >
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}
