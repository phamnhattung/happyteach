import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ScrollView } from 'react-native'
import { tokens } from '@/theme/tokens'
import { lessonApi } from '@/lib/axios'

interface LessonContent {
  title: string
  estimatedDifficulty: number
}

interface Lesson {
  id: string
  subject: string
  grade: number
  duration: number
  content: LessonContent
  createdAt: string
}

interface LessonsResponse {
  data: Lesson[]
  total: number
  page: number
  limit: number
}

const SUBJECTS = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'GDCD', 'Tin']
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

const DIFFICULTY_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444']

function DifficultyBar({ level }: { level: number }) {
  return (
    <View className="flex-row gap-0.5 items-center">
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor:
              i < level
                ? DIFFICULTY_COLORS[level - 1] ?? tokens.colors.primary[500]
                : tokens.colors.gray[200],
          }}
        />
      ))}
    </View>
  )
}

function SkeletonCard() {
  return (
    <View
      className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-3 mx-5"
      style={tokens.shadow.sm}
    >
      <View className="bg-stone-200 dark:bg-stone-700 rounded-lg h-4 w-3/4 mb-2" />
      <View className="bg-stone-200 dark:bg-stone-700 rounded-lg h-3 w-1/2 mb-3" />
      <View className="flex-row gap-2">
        <View className="bg-stone-200 dark:bg-stone-700 rounded-full h-6 w-20" />
        <View className="bg-stone-200 dark:bg-stone-700 rounded-full h-6 w-14" />
      </View>
    </View>
  )
}

function LessonCard({
  lesson,
  index: cardIndex,
  onDelete,
  onPress,
}: {
  lesson: Lesson
  index: number
  onDelete: () => void
  onPress: () => void
}) {
  const swipeRef = useRef<Swipeable>(null)

  const renderRightActions = () => (
    <TouchableOpacity
      className="bg-red-500 w-20 rounded-2xl mb-3 ml-2 items-center justify-center"
      onPress={() => {
        swipeRef.current?.close()
        Alert.alert('Xóa bài giảng', 'Bạn có chắc muốn xóa bài giảng này không?', [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: onDelete },
        ])
      }}
    >
      <Feather name="trash-2" size={18} color="#FFF" />
      <Text
        className="text-white text-xs mt-1"
        style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
      >
        Xóa
      </Text>
    </TouchableOpacity>
  )

  const date = new Date(lesson.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Animated.View entering={FadeInUp.delay(cardIndex * 60).duration(350)}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-3 mx-5 flex-row items-center"
          style={tokens.shadow.sm}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 items-center justify-center mr-3 shrink-0">
            <Text style={{ fontSize: 20 }}>📖</Text>
          </View>

          <View className="flex-1 min-w-0">
            <Text
              className="text-stone-900 dark:text-white text-sm mb-1"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              numberOfLines={2}
            >
              {lesson.content.title}
            </Text>
            <View className="flex-row items-center gap-2 mb-2 flex-wrap">
              <View className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                <Text
                  className="text-amber-700 dark:text-amber-400 text-xs"
                  style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                >
                  {lesson.subject} · Lớp {lesson.grade}
                </Text>
              </View>
              <Text
                className="text-stone-400 text-xs"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                {lesson.duration} phút
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <DifficultyBar level={lesson.content.estimatedDifficulty ?? 3} />
              <Text
                className="text-stone-400 text-xs"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                {date}
              </Text>
            </View>
          </View>

          <Feather name="chevron-right" size={16} color={tokens.colors.gray[400]} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  )
}

export default function LessonsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery<LessonsResponse>({
    queryKey: ['lessons', selectedSubject, selectedGrade],
    queryFn: () =>
      lessonApi
        .get('/lessons', {
          params: {
            page: 1,
            limit: 50,
            ...(selectedSubject ? { subject: selectedSubject } : {}),
            ...(selectedGrade ? { grade: String(selectedGrade) } : {}),
          },
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lessonApi.delete(`/lessons/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['lessons'] })
      const key = ['lessons', selectedSubject, selectedGrade]
      const previous = queryClient.getQueryData<LessonsResponse>(key)
      queryClient.setQueryData<LessonsResponse>(key, (old) =>
        old ? { ...old, data: old.data.filter((l) => l.id !== id), total: old.total - 1 } : old,
      )
      return { previous, key }
    },
    onError: (_err, _id, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const lessons = data?.data ?? []
  const filtered = search.trim()
    ? lessons.filter(
        (l) =>
          l.content.title.toLowerCase().includes(search.toLowerCase()) ||
          l.subject.toLowerCase().includes(search.toLowerCase()),
      )
    : lessons

  const hasFilters = !!(search.trim() || selectedSubject || selectedGrade)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <Text
            className="text-stone-900 dark:text-white text-2xl"
            style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
          >
            Bài giảng
          </Text>
          <TouchableOpacity
            className="bg-amber-500 px-4 py-2.5 rounded-xl flex-row items-center gap-1.5"
            style={tokens.shadow.sm}
            onPress={() => router.push('/lessons/generate')}
          >
            <Feather name="zap" size={14} color="#FFF" />
            <Text
              className="text-white text-sm"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              AI tạo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          className="mx-5 mb-3 flex-row items-center bg-white dark:bg-stone-800 rounded-xl px-3 py-2.5"
          style={tokens.shadow.sm}
        >
          <Feather name="search" size={16} color={tokens.colors.gray[400]} />
          <TextInput
            className="flex-1 ml-2 text-stone-900 dark:text-white text-sm"
            style={{ fontFamily: tokens.typography.fontFamily.sans }}
            placeholder="Tìm tên bài giảng, môn học..."
            placeholderTextColor={tokens.colors.gray[400]}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={16} color={tokens.colors.gray[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Subject filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-9 mb-2"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center' }}
        >
          <TouchableOpacity
            className={`px-3 py-1.5 rounded-full border ${
              !selectedSubject
                ? 'bg-amber-500 border-amber-500'
                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
            }`}
            onPress={() => setSelectedSubject(null)}
          >
            <Text
              className={`text-xs ${!selectedSubject ? 'text-white' : 'text-stone-600 dark:text-stone-300'}`}
              style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {SUBJECTS.map((s) => (
            <TouchableOpacity
              key={s}
              className={`px-3 py-1.5 rounded-full border ${
                selectedSubject === s
                  ? 'bg-amber-500 border-amber-500'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
              }`}
              onPress={() => setSelectedSubject(selectedSubject === s ? null : s)}
            >
              <Text
                className={`text-xs ${selectedSubject === s ? 'text-white' : 'text-stone-600 dark:text-stone-300'}`}
                style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grade filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-9 mb-3"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center' }}
        >
          {GRADES.map((g) => (
            <TouchableOpacity
              key={g}
              className={`w-8 h-8 rounded-full border items-center justify-center ${
                selectedGrade === g
                  ? 'bg-amber-500 border-amber-500'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
              }`}
              onPress={() => setSelectedGrade(selectedGrade === g ? null : g)}
            >
              <Text
                className={`text-xs ${selectedGrade === g ? 'text-white' : 'text-stone-600 dark:text-stone-300'}`}
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 pt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 pb-20">
            <View className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-4">
              <Feather name="book-open" size={28} color={tokens.colors.primary[600]} />
            </View>
            <Text
              className="text-stone-800 dark:text-stone-200 text-lg mb-2 text-center"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              {hasFilters ? 'Không tìm thấy bài giảng' : 'Chưa có bài giảng nào'}
            </Text>
            <Text
              className="text-stone-500 dark:text-stone-400 text-sm text-center mb-6"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              {hasFilters
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : 'AI sẽ soạn bài giảng theo đúng chương trình và phong cách giảng dạy của bạn'}
            </Text>
            {!hasFilters && (
              <TouchableOpacity
                className="bg-amber-500 px-6 py-3 rounded-xl flex-row items-center gap-2"
                style={tokens.shadow.md}
                onPress={() => router.push('/lessons/generate')}
              >
                <Feather name="zap" size={16} color="#FFF" />
                <Text
                  className="text-white"
                  style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                >
                  Tạo bài giảng đầu tiên
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <LessonCard
                lesson={item}
                index={index}
                onDelete={() => deleteMutation.mutate(item.id)}
                onPress={() => router.push(`/lessons/${item.id}`)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={tokens.colors.primary[500]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 bg-amber-500 rounded-full items-center justify-center"
          style={tokens.shadow.lg}
          onPress={() => router.push('/lessons/generate')}
        >
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}
