import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { lessonApi } from '@/lib/axios'

interface StyleProfile {
  avgDifficulty: number
  lessonCount: number
  examCount: number
  subjectCounts: Record<string, number>
  examMcqRatio: number
  curriculumContext: string
  style: string
}

interface MemorySummary {
  hasMemory: boolean
  profile: StyleProfile
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View className="flex-1 bg-white dark:bg-stone-800 rounded-2xl p-3 items-center" style={tokens.shadow.sm}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text className="text-stone-900 dark:text-white text-lg mt-1" style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold, color }}>
        {value}
      </Text>
      <Text className="text-stone-400 text-xs text-center mt-0.5" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
        {label}
      </Text>
    </View>
  )
}

export default function PersonalizationScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [curriculumText, setCurriculumText] = useState('')
  const [editingCurriculum, setEditingCurriculum] = useState(false)

  const { data, isLoading } = useQuery<MemorySummary>({
    queryKey: ['teacher-memory'],
    queryFn: () => lessonApi.get('/memory').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
    onSuccess: (d) => {
      if (d.profile.curriculumContext) {
        setCurriculumText(d.profile.curriculumContext)
      }
    },
  } as Parameters<typeof useQuery>[0])

  const curriculumMutation = useMutation({
    mutationFn: (text: string) => lessonApi.post('/memory/curriculum', { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-memory'] })
      setEditingCurriculum(false)
    },
    onError: () => Alert.alert('Lỗi', 'Không thể lưu ngữ cảnh. Thử lại.'),
  })

  const resetMutation = useMutation({
    mutationFn: () => lessonApi.delete('/memory'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-memory'] })
      setCurriculumText('')
      Alert.alert('Đã xóa', 'Phong cách cá nhân hóa đã được xóa.')
    },
    onError: () => Alert.alert('Lỗi', 'Không thể xóa. Thử lại.'),
  })

  const handleReset = () => {
    Alert.alert(
      'Xóa phong cách',
      'AI sẽ không còn biết sở thích dạy học của bạn nữa. Bạn có chắc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => resetMutation.mutate() },
      ],
    )
  }

  const profile = data?.profile
  const hasMemory = data?.hasMemory ?? false

  const topSubjects = Object.entries(profile?.subjectCounts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={tokens.colors.gray[700]} />
        </TouchableOpacity>
        <Text className="text-stone-900 dark:text-white text-base flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Cá nhân hóa AI
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={tokens.colors.primary[600]} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
          {/* Intro */}
          <Animated.View entering={FadeInUp.duration(300)} className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 mb-5 flex-row gap-3">
            <View className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 items-center justify-center">
              <Text style={{ fontSize: 18 }}>🧠</Text>
            </View>
            <View className="flex-1">
              <Text className="text-violet-800 dark:text-violet-200 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                AI học từ bạn
              </Text>
              <Text className="text-violet-600 dark:text-violet-300 text-xs mt-0.5" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                {hasMemory
                  ? 'AI đã học phong cách của bạn qua các bài giảng và đề thi.'
                  : 'Bắt đầu soạn bài và tạo đề thi, AI sẽ tự học phong cách của bạn.'}
              </Text>
            </View>
          </Animated.View>

          {/* Stats */}
          {hasMemory && profile && (
            <Animated.View entering={FadeInUp.delay(60).duration(300)}>
              <Text className="text-stone-500 dark:text-stone-400 text-xs mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                HỌC TỪ LỊCH SỬ CỦA BẠN
              </Text>
              <View className="flex-row gap-3 mb-4">
                <StatCard
                  icon="📝"
                  value={String(profile.lessonCount)}
                  label="Giáo án"
                  color={tokens.colors.primary[600]}
                />
                <StatCard
                  icon="📋"
                  value={String(profile.examCount)}
                  label="Đề thi"
                  color={tokens.colors.secondary[600]}
                />
                <StatCard
                  icon="⭐"
                  value={profile.avgDifficulty.toFixed(1)}
                  label="Độ khó TB"
                  color="#7C3AED"
                />
              </View>

              {/* MCQ ratio */}
              {profile.examCount > 0 && (
                <View className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-4" style={tokens.shadow.sm}>
                  <Text className="text-stone-500 dark:text-stone-400 text-xs mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    TỈ LỆ CÂU HỎI
                  </Text>
                  <View className="flex-row items-center gap-3 mb-1">
                    <View className="flex-1 h-3 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${Math.round(profile.examMcqRatio * 100)}%` }}
                      />
                    </View>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-stone-500 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                      Trắc nghiệm {Math.round(profile.examMcqRatio * 100)}%
                    </Text>
                    <Text className="text-stone-500 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                      Tự luận {Math.round((1 - profile.examMcqRatio) * 100)}%
                    </Text>
                  </View>
                </View>
              )}

              {/* Top subjects */}
              {topSubjects.length > 0 && (
                <View className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-4" style={tokens.shadow.sm}>
                  <Text className="text-stone-500 dark:text-stone-400 text-xs mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    MÔN DẠY NHIỀU NHẤT
                  </Text>
                  {topSubjects.map(([subject, count]) => (
                    <View key={subject} className="flex-row items-center gap-2 mb-2">
                      <View className="w-2 h-2 rounded-full bg-amber-400" />
                      <Text className="text-stone-700 dark:text-stone-200 text-sm flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                        {subject}
                      </Text>
                      <Text className="text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                        {count} lần
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* Curriculum context */}
          <Animated.View entering={FadeInUp.delay(120).duration(300)}>
            <View className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-4" style={tokens.shadow.sm}>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-stone-800 dark:text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                    Ngữ cảnh chương trình
                  </Text>
                  <Text className="text-stone-400 text-xs mt-0.5" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                    Thêm thông tin về trường, lớp, chương trình
                  </Text>
                </View>
                {!editingCurriculum && (
                  <TouchableOpacity
                    onPress={() => setEditingCurriculum(true)}
                    className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-xl"
                  >
                    <Text className="text-amber-700 dark:text-amber-300 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                      {curriculumText ? 'Sửa' : 'Thêm'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {editingCurriculum ? (
                <>
                  <TextInput
                    value={curriculumText}
                    onChangeText={setCurriculumText}
                    multiline
                    placeholder="Ví dụ: Dạy lớp 10A1 trường THPT Nguyễn Trãi, chương trình Toán tăng cường, học sinh giỏi..."
                    placeholderTextColor={tokens.colors.gray[400]}
                    className="bg-stone-50 dark:bg-stone-900 rounded-xl p-3 text-stone-700 dark:text-stone-300 text-sm"
                    style={{ fontFamily: tokens.typography.fontFamily.sans, minHeight: 100, textAlignVertical: 'top' }}
                    maxLength={3000}
                  />
                  <Text className="text-stone-400 text-xs mt-1 text-right" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                    {curriculumText.length}/3000
                  </Text>
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                      className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-700 items-center"
                      onPress={() => {
                        setEditingCurriculum(false)
                        setCurriculumText(data?.profile.curriculumContext ?? '')
                      }}
                    >
                      <Text className="text-stone-600 dark:text-stone-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                        Hủy
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 items-center"
                      onPress={() => curriculumMutation.mutate(curriculumText)}
                      disabled={curriculumMutation.isPending || curriculumText.trim().length < 10}
                    >
                      {curriculumMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text className="text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                          Lưu
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : curriculumText ? (
                <Text className="text-stone-600 dark:text-stone-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  {curriculumText.slice(0, 150)}{curriculumText.length > 150 ? '...' : ''}
                </Text>
              ) : (
                <Text className="text-stone-400 text-sm italic" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  Chưa có ngữ cảnh
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Reset */}
          {hasMemory && (
            <Animated.View entering={FadeInUp.delay(180).duration(300)}>
              <TouchableOpacity
                className="flex-row items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-6"
                onPress={handleReset}
                disabled={resetMutation.isPending}
              >
                <View className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 items-center justify-center">
                  {resetMutation.isPending ? (
                    <ActivityIndicator size="small" color={tokens.colors.danger} />
                  ) : (
                    <Feather name="trash-2" size={16} color={tokens.colors.danger} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-red-600 dark:text-red-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                    Xóa phong cách cá nhân hóa
                  </Text>
                  <Text className="text-red-400 dark:text-red-500 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                    AI sẽ trở về trạng thái mặc định
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={tokens.colors.danger} />
              </TouchableOpacity>
            </Animated.View>
          )}

          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
