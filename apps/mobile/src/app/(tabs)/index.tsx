import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { tokens } from '@/theme/tokens'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function formatDate(): string {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function SkeletonRow() {
  return (
    <View className="bg-stone-200 dark:bg-stone-700 rounded-xl h-20 mb-3 animate-pulse" />
  )
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View className="items-center py-8">
      <View className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-3">
        <Feather name={icon as any} size={24} color={tokens.colors.primary[600]} />
      </View>
      <Text
        className="text-stone-800 dark:text-stone-200 text-base font-semibold mb-1"
        style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
      >
        {title}
      </Text>
      <Text
        className="text-stone-500 dark:text-stone-400 text-sm text-center"
        style={{ fontFamily: tokens.typography.fontFamily.sans }}
      >
        {subtitle}
      </Text>
    </View>
  )
}

interface QuickAction {
  label: string
  icon: string
  color: string
  bg: string
  route: string
}

const quickActions: QuickAction[] = [
  { label: 'Bài giảng mới', icon: 'plus-circle', color: tokens.colors.primary[600], bg: '#FEF3C7', route: '/lessons/generate' },
  { label: 'Đề thi mới', icon: 'edit-3', color: tokens.colors.secondary[600], bg: '#D1FAE5', route: '/exams/generate' },
  { label: 'Chấm bài', icon: 'camera', color: '#7C3AED', bg: '#EDE9FE', route: '/grading/scan' },
]

export default function TeacherDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const [refreshing, setRefreshing] = useState(false)
  const [loading] = useState(false)

  const upcomingLessons: { id: string; subject: string; class: string; time: string }[] = []
  const recentExams: { id: string; title: string; subject: string; count: number }[] = []

  const onRefresh = async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1000))
    setRefreshing(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-6 pb-5 bg-amber-500">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1">
              <Text
                className="text-amber-100 text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansMedium }}
              >
                {formatDate()}
              </Text>
              <Text
                className="text-white text-2xl mt-0.5"
                style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
              >
                {getGreeting()}, {user?.name?.split(' ').at(-1) ?? 'Thầy/Cô'} 👋
              </Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-amber-400 items-center justify-center"
              onPress={() => router.push('/notifications')}
            >
              <Feather name="bell" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5 pt-5">
          {/* Quick Actions */}
          <Text
            className="text-stone-800 dark:text-stone-100 text-base mb-3"
            style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
          >
            Thao tác nhanh
          </Text>
          <View className="flex-row gap-3 mb-6">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                className="flex-1 rounded-2xl py-4 items-center"
                style={{
                  backgroundColor: isDark ? tokens.colors.gray[800] : action.bg,
                  ...tokens.shadow.sm,
                }}
                onPress={() => router.push(action.route as any)}
              >
                <Feather name={action.icon as any} size={24} color={action.color} />
                <Text
                  className="text-stone-700 dark:text-stone-200 text-xs mt-2 text-center"
                  style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upcoming Lessons */}
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="text-stone-800 dark:text-stone-100 text-base"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Bài giảng sắp tới
            </Text>
            <TouchableOpacity onPress={() => router.push('/lessons')}>
              <Text
                className="text-amber-600 text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
              >
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : upcomingLessons.length === 0 ? (
            <View
              className="rounded-2xl bg-white dark:bg-stone-900 mb-6 overflow-hidden"
              style={tokens.shadow.sm}
            >
              <EmptyState
                icon="book-open"
                title="Chưa có bài giảng nào"
                subtitle="Tạo bài giảng mới để bắt đầu"
              />
            </View>
          ) : (
            <View className="mb-6">
              {upcomingLessons.map((lesson) => (
                <TouchableOpacity
                  key={lesson.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl p-4 mb-3 flex-row items-center"
                  style={tokens.shadow.sm}
                  onPress={() => router.push(`/lessons/${lesson.id}` as any)}
                >
                  <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center mr-3">
                    <Feather name="book-open" size={18} color={tokens.colors.primary[600]} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-stone-800 dark:text-stone-100 text-sm"
                      style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                    >
                      {lesson.subject}
                    </Text>
                    <Text
                      className="text-stone-500 dark:text-stone-400 text-xs mt-0.5"
                      style={{ fontFamily: tokens.typography.fontFamily.sans }}
                    >
                      {lesson.class} • {lesson.time}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={tokens.colors.gray[400]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recent Exams */}
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="text-stone-800 dark:text-stone-100 text-base"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Đề thi gần đây
            </Text>
            <TouchableOpacity onPress={() => router.push('/exams')}>
              <Text
                className="text-amber-600 text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
              >
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : recentExams.length === 0 ? (
            <View
              className="rounded-2xl bg-white dark:bg-stone-900 mb-6 overflow-hidden"
              style={tokens.shadow.sm}
            >
              <EmptyState
                icon="edit-3"
                title="Chưa có đề thi nào"
                subtitle="Tạo đề thi AI chỉ trong vài phút"
              />
            </View>
          ) : (
            <View className="mb-6">
              {recentExams.map((exam) => (
                <TouchableOpacity
                  key={exam.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl p-4 mb-3 flex-row items-center"
                  style={tokens.shadow.sm}
                  onPress={() => router.push(`/exams/${exam.id}` as any)}
                >
                  <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                    <Feather name="edit-3" size={18} color={tokens.colors.secondary[600]} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-stone-800 dark:text-stone-100 text-sm"
                      style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                    >
                      {exam.title}
                    </Text>
                    <Text
                      className="text-stone-500 dark:text-stone-400 text-xs mt-0.5"
                      style={{ fontFamily: tokens.typography.fontFamily.sans }}
                    >
                      {exam.subject} • {exam.count} câu hỏi
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={tokens.colors.gray[400]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
