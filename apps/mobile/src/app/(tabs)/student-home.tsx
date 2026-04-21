import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { tokens } from '@/theme/tokens'

function ScoreBadge({ score }: { score: number }) {
  let bg = 'bg-emerald-100'
  let text = 'text-emerald-700'
  if (score < 5) { bg = 'bg-red-100'; text = 'text-red-700' }
  else if (score < 7) { bg = 'bg-amber-100'; text = 'text-amber-700' }

  return (
    <View className={`px-3 py-1 rounded-full ${bg}`}>
      <Text
        className={`${text} text-sm`}
        style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
      >
        {score.toFixed(1)}
      </Text>
    </View>
  )
}

function SubjectChip({ subject }: { subject: string }) {
  return (
    <View className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 mr-1.5">
      <Text
        className="text-amber-700 dark:text-amber-400 text-xs"
        style={{ fontFamily: tokens.typography.fontFamily.sansMedium }}
      >
        {subject}
      </Text>
    </View>
  )
}

function SkeletonRow() {
  return <View className="bg-stone-200 dark:bg-stone-700 rounded-xl h-20 mb-3" />
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View className="items-center py-10">
      <View className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-3">
        <Feather name={icon as any} size={24} color={tokens.colors.primary[600]} />
      </View>
      <Text
        className="text-stone-800 dark:text-stone-200 text-base mb-1"
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

export default function StudentHome() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [loading] = useState(false)

  const recentResults: {
    id: string
    examTitle: string
    subject: string
    score: number
    maxScore: number
    date: string
  }[] = []

  const gradeSheets: {
    id: string
    subject: string
    semester: string
    average: number
  }[] = []

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
          <Text
            className="text-amber-100 text-sm"
            style={{ fontFamily: tokens.typography.fontFamily.sansMedium }}
          >
            Xin chào, {user?.name ?? 'Học sinh'}
          </Text>
          <Text
            className="text-white text-2xl mt-0.5"
            style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
          >
            Kết quả của tôi 🏆
          </Text>
        </View>

        <View className="px-5 pt-5">
          {/* Recent Results */}
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="text-stone-800 dark:text-stone-100 text-base"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Kết quả gần đây
            </Text>
            <TouchableOpacity onPress={() => router.push('/grade-sheets')}>
              <Text
                className="text-amber-600 text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
              >
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
          ) : recentResults.length === 0 ? (
            <View
              className="rounded-2xl bg-white dark:bg-stone-900 mb-6"
              style={tokens.shadow.sm}
            >
              <EmptyState
                icon="award"
                title="Chưa có kết quả"
                subtitle="Kết quả bài kiểm tra sẽ xuất hiện ở đây"
              />
            </View>
          ) : (
            <View className="mb-6">
              {recentResults.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl p-4 mb-3 flex-row items-center"
                  style={tokens.shadow.sm}
                  onPress={() => router.push(`/results/${result.id}` as any)}
                >
                  <View className="flex-1">
                    <Text
                      className="text-stone-800 dark:text-stone-100 text-sm"
                      style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                    >
                      {result.examTitle}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <SubjectChip subject={result.subject} />
                      <Text
                        className="text-stone-400 dark:text-stone-500 text-xs"
                        style={{ fontFamily: tokens.typography.fontFamily.sans }}
                      >
                        {result.date}
                      </Text>
                    </View>
                  </View>
                  <ScoreBadge score={result.score} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Grade Sheets */}
          <Text
            className="text-stone-800 dark:text-stone-100 text-base mb-3"
            style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
          >
            Bảng điểm môn học
          </Text>

          {loading ? (
            <><SkeletonRow /><SkeletonRow /></>
          ) : gradeSheets.length === 0 ? (
            <View
              className="rounded-2xl bg-white dark:bg-stone-900 mb-6"
              style={tokens.shadow.sm}
            >
              <EmptyState
                icon="bar-chart-2"
                title="Chưa có bảng điểm"
                subtitle="Bảng điểm theo môn học sẽ xuất hiện ở đây"
              />
            </View>
          ) : (
            <View className="mb-6">
              {gradeSheets.map((sheet) => (
                <TouchableOpacity
                  key={sheet.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl p-4 mb-3 flex-row items-center"
                  style={tokens.shadow.sm}
                  onPress={() => router.push(`/grade-sheets/${sheet.id}` as any)}
                >
                  <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                    <Feather name="bar-chart-2" size={18} color={tokens.colors.secondary[600]} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-stone-800 dark:text-stone-100 text-sm"
                      style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                    >
                      {sheet.subject}
                    </Text>
                    <Text
                      className="text-stone-500 dark:text-stone-400 text-xs mt-0.5"
                      style={{ fontFamily: tokens.typography.fontFamily.sans }}
                    >
                      {sheet.semester}
                    </Text>
                  </View>
                  <ScoreBadge score={sheet.average} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
