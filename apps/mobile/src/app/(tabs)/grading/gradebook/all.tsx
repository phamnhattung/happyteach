import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { gradingApi } from '@/lib/axios'

interface ExamColumn {
  examId: string
  examTitle: string
  maxScore: number
}

interface StudentRow {
  studentId: string
  studentName: string
  scores: Record<string, number | null>
  average: number | null
}

interface ExamStats {
  examId: string
  mean: number
  median: number
  min: number
  max: number
  distribution: { range: string; count: number }[]
}

interface GradebookData {
  exams: ExamColumn[]
  students: StudentRow[]
}

function scoreColor(value: number, max: number): { bg: string; text: string } {
  const pct = max > 0 ? value / max : 0
  if (pct >= 0.7) return { bg: '#DCFCE7', text: '#15803D' }
  if (pct >= 0.5) return { bg: '#FEF3C7', text: '#B45309' }
  return { bg: '#FEE2E2', text: '#DC2626' }
}

function ScoreCell({ value, max }: { value: number | null; max: number }) {
  if (value === null) {
    return (
      <View className="w-16 h-9 items-center justify-center">
        <Text className="text-stone-300 dark:text-stone-600 text-xs">—</Text>
      </View>
    )
  }
  const { bg, text } = scoreColor(value, max)
  return (
    <View className="w-16 h-9 rounded-lg mx-0.5 items-center justify-center" style={{ backgroundColor: bg }}>
      <Text className="text-xs font-bold" style={{ color: text, fontFamily: tokens.typography.fontFamily.sansBold }}>
        {value % 1 === 0 ? value : value.toFixed(1)}
      </Text>
    </View>
  )
}

function StatsModal({
  stats,
  exam,
  onClose,
}: {
  stats: ExamStats
  exam: ExamColumn
  onClose: () => void
}) {
  const maxCount = Math.max(...stats.distribution.map((d) => d.count), 1)
  return (
    <View className="absolute inset-0 bg-black/60 items-center justify-center px-5" style={{ zIndex: 100 }}>
      <Animated.View entering={FadeIn.duration(200)} className="bg-white dark:bg-stone-900 rounded-3xl w-full p-5">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-stone-900 dark:text-white text-base flex-1 mr-2" style={{ fontFamily: tokens.typography.fontFamily.sansBold }} numberOfLines={2}>
            {exam.examTitle}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={20} color={tokens.colors.gray[500]} />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mb-5">
          {[
            { label: 'TB', value: stats.mean.toFixed(1) },
            { label: 'Trung vị', value: stats.median.toFixed(1) },
            { label: 'Thấp nhất', value: stats.min.toFixed(1) },
            { label: 'Cao nhất', value: stats.max.toFixed(1) },
          ].map((s) => (
            <View key={s.label} className="items-center">
              <Text className="text-stone-900 dark:text-white text-lg" style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}>
                {s.value}
              </Text>
              <Text className="text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <Text className="text-stone-500 dark:text-stone-400 text-xs mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
          PHÂN PHỐI ĐIỂM
        </Text>
        <View className="gap-1.5">
          {stats.distribution.map((d) => (
            <View key={d.range} className="flex-row items-center gap-2">
              <Text className="text-stone-500 text-xs w-16" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                {d.range}
              </Text>
              <View className="flex-1 h-5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${(d.count / maxCount) * 100}%` }}
                />
              </View>
              <Text className="text-stone-400 text-xs w-6 text-right" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                {d.count}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  )
}

export default function GradebookScreen() {
  const router = useRouter()
  const [statsModal, setStatsModal] = useState<{ stats: ExamStats; exam: ExamColumn } | null>(null)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const { data, isLoading } = useQuery<GradebookData>({
    queryKey: ['gradebook'],
    queryFn: () => gradingApi.get('/grading/class/all').then((r) => r.data),
    staleTime: 1000 * 60,
  })

  const handleExamHeaderPress = async (exam: ExamColumn) => {
    try {
      const res = await gradingApi.get(`/grading/submissions/exam/${exam.examId}/stats`)
      setStatsModal({ stats: res.data as ExamStats, exam })
    } catch {
      Alert.alert('Lỗi', 'Không thể tải thống kê bài thi.')
    }
  }

  const handleExport = async (type: 'excel' | 'pdf') => {
    setExporting(type)
    try {
      const endpoint = type === 'excel' ? '/grading/export/excel' : '/grading/export/pdf'
      const res = await gradingApi.get(endpoint, { responseType: 'blob' })
      const url: string = (res.data as { url?: string }).url ?? ''
      if (url) await Linking.openURL(url)
    } catch {
      Alert.alert('Lỗi', `Không thể xuất ${type === 'excel' ? 'Excel' : 'PDF'}.`)
    } finally {
      setExporting(null)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center">
        <ActivityIndicator size="large" color={tokens.colors.primary[600]} />
      </SafeAreaView>
    )
  }

  const exams = data?.exams ?? []
  const students = data?.students ?? []

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={tokens.colors.gray[700]} />
        </TouchableOpacity>
        <Text className="text-stone-900 dark:text-white text-base flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Bảng điểm
        </Text>
        <View className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
          <Text className="text-amber-700 dark:text-amber-300 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            {students.length} học sinh
          </Text>
        </View>
      </View>

      {students.length === 0 ? (
        <View className="flex-1 items-center justify-center pb-20">
          <Feather name="bar-chart-2" size={48} color={tokens.colors.gray[300]} />
          <Text className="text-stone-500 dark:text-stone-400 text-base mt-4" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Chưa có dữ liệu điểm
          </Text>
          <Text className="text-stone-400 text-sm text-center px-8 mt-1" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Chấm bài xong sẽ hiển thị bảng điểm ở đây
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Legend */}
          <View className="flex-row items-center gap-4 px-5 py-3">
            {[
              { bg: '#DCFCE7', text: '#15803D', label: '≥70%' },
              { bg: '#FEF3C7', text: '#B45309', label: '50–70%' },
              { bg: '#FEE2E2', text: '#DC2626', label: '<50%' },
            ].map((l) => (
              <View key={l.label} className="flex-row items-center gap-1">
                <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.bg }} />
                <Text className="text-stone-500 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  {l.label}
                </Text>
              </View>
            ))}
            <Text className="text-stone-400 text-xs flex-1 text-right" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              Nhấn tiêu đề để xem thống kê
            </Text>
          </View>

          {/* Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5">
            <View>
              {/* Column headers */}
              <View className="flex-row items-center mb-1">
                <View className="w-32 mr-2">
                  <Text className="text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    HỌC SINH
                  </Text>
                </View>
                {exams.map((e) => (
                  <TouchableOpacity
                    key={e.examId}
                    className="w-16 mx-0.5"
                    onPress={() => handleExamHeaderPress(e)}
                  >
                    <Text
                      className="text-amber-700 dark:text-amber-400 text-xs text-center"
                      style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                      numberOfLines={2}
                    >
                      {e.examTitle}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View className="w-16 mx-0.5">
                  <Text className="text-stone-400 text-xs text-center" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                    TB
                  </Text>
                </View>
              </View>

              {/* Student rows */}
              {students.map((student, i) => (
                <Animated.View key={student.studentId} entering={FadeInUp.delay(i * 20).duration(200)}>
                  <View className="flex-row items-center py-1">
                    <TouchableOpacity
                      className="w-32 mr-2"
                      onPress={() => router.push({ pathname: '/grading/scan/approve', params: { submissionId: student.studentId } })}
                    >
                      <Text className="text-stone-800 dark:text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }} numberOfLines={1}>
                        {student.studentName}
                      </Text>
                    </TouchableOpacity>
                    {exams.map((e) => (
                      <ScoreCell key={e.examId} value={student.scores[e.examId] ?? null} max={e.maxScore} />
                    ))}
                    <View className="w-16 mx-0.5 h-9 items-center justify-center">
                      {student.average !== null ? (
                        <Text
                          className="text-sm"
                          style={{
                            fontFamily: tokens.typography.fontFamily.sansBold,
                            color: student.average >= 7 ? '#15803D' : student.average >= 5 ? '#B45309' : '#DC2626',
                          }}
                        >
                          {student.average.toFixed(1)}
                        </Text>
                      ) : (
                        <Text className="text-stone-300 text-xs">—</Text>
                      )}
                    </View>
                  </View>
                  {i < students.length - 1 && (
                    <View className="h-px bg-stone-100 dark:bg-stone-800" />
                  )}
                </Animated.View>
              ))}
            </View>
          </ScrollView>

          {/* Export row */}
          <View className="px-5 py-4 mt-2 flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-green-600 py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
              style={tokens.shadow.sm}
              onPress={() => handleExport('excel')}
              disabled={exporting !== null}
            >
              {exporting === 'excel' ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="download" size={16} color="#FFF" />
              )}
              <Text className="text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                Excel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-rose-600 py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
              style={tokens.shadow.sm}
              onPress={() => handleExport('pdf')}
              disabled={exporting !== null}
            >
              {exporting === 'pdf' ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="file-text" size={16} color="#FFF" />
              )}
              <Text className="text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                PDF
              </Text>
            </TouchableOpacity>
          </View>
          <View className="h-8" />
        </ScrollView>
      )}

      {/* Stats modal */}
      {statsModal && (
        <StatsModal
          stats={statsModal.stats}
          exam={statsModal.exam}
          onClose={() => setStatsModal(null)}
        />
      )}
    </SafeAreaView>
  )
}
