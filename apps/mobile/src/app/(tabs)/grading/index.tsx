import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { examApi, gradingApi } from '@/lib/axios'

interface Exam {
  id: string
  title: string
  subject: string
  grade: string
  questions: { gradingMode: string }[]
}

interface Submission {
  id: string
  studentId: string
  studentName: string | null
  status: string
  finalScore: number | null
  keyedScore: number | null
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  pending: { icon: '⬜', label: 'Chưa nộp', color: '#78716C', bg: '#F5F5F4' },
  keyed_done: { icon: '🔄', label: 'Đã chấm TN', color: '#0369A1', bg: '#E0F2FE' },
  pending_approval: { icon: '🔑', label: 'Chờ duyệt AI', color: '#B45309', bg: '#FEF3C7' },
  graded: { icon: '✅', label: 'Đã chấm', color: '#15803D', bg: '#DCFCE7' },
}

function StatusChip({ status }: { status: string }) {
  const config = STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.pending!
  return (
    <View className="flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: config.bg }}>
      <Text style={{ fontSize: 10 }}>{config.icon}</Text>
      <Text style={{ color: config.color, fontSize: 10, fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
        {config.label}
      </Text>
    </View>
  )
}

function StudentRow({ submission, onGrade }: { submission: Submission; onGrade: () => void }) {
  const status = submission.status.toLowerCase()
  const isGraded = status === 'graded'

  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-3 border-b border-stone-100 dark:border-stone-800"
      onPress={onGrade}
      activeOpacity={0.7}
    >
      <View className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-700 items-center justify-center mr-3">
        <Text className="text-stone-600 dark:text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          {(submission.studentName ?? submission.studentId).slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-stone-900 dark:text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
          {submission.studentName ?? submission.studentId}
        </Text>
        {isGraded && submission.finalScore !== null && (
          <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Điểm: {submission.finalScore.toFixed(1)}
          </Text>
        )}
      </View>
      <StatusChip status={status} />
      <Feather name="chevron-right" size={14} color={tokens.colors.gray[400]} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  )
}

export default function GradingScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [showExamPicker, setShowExamPicker] = useState(false)

  const { data: exams } = useQuery<{ data: Exam[] }>({
    queryKey: ['exams-published'],
    queryFn: () => examApi.get('/exams', { params: { status: 'published', limit: 50 } }).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  const selectedExam = exams?.data.find((e) => e.id === selectedExamId)

  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ['submissions', selectedExamId],
    queryFn: () => gradingApi.get(`/grading/submissions/exam/${selectedExamId}`).then((r) => r.data),
    enabled: !!selectedExamId,
    staleTime: 1000 * 30,
  })

  const createSubmissionMutation = useMutation({
    mutationFn: (studentId: string) =>
      gradingApi.post('/grading/submissions', { examId: selectedExamId, studentId, studentName: `Học sinh ${studentId}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions', selectedExamId] }),
  })

  const pendingApprovalCount = (submissions ?? []).filter((s) => s.status.toLowerCase() === 'pending_approval').length

  const handleStartGrading = (submission: Submission) => {
    const status = submission.status.toLowerCase()
    const hasKeyed = (selectedExam?.questions ?? []).some((q) => q.gradingMode === 'keyed')
    const hasAI = (selectedExam?.questions ?? []).some((q) => q.gradingMode !== 'keyed')

    if (status === 'pending' || status === 'keyed_done') {
      if (hasKeyed && status === 'pending') {
        router.push({ pathname: '/grading/scan/bubble', params: { submissionId: submission.id, examId: selectedExamId ?? '' } })
      } else if (hasAI) {
        router.push({ pathname: '/grading/scan/answers', params: { submissionId: submission.id } })
      }
    } else if (status === 'pending_approval') {
      router.push({ pathname: '/grading/scan/approve', params: { submissionId: submission.id } })
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Text className="text-stone-900 dark:text-white text-2xl" style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}>
          Chấm bài
        </Text>
        <TouchableOpacity
          className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-xl items-center justify-center"
          onPress={() => router.push('/grading/gradebook/all')}
        >
          <Feather name="bar-chart-2" size={18} color={tokens.colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Exam selector */}
      <TouchableOpacity
        className="mx-5 mb-4 bg-white dark:bg-stone-800 rounded-2xl p-4 flex-row items-center gap-3"
        style={tokens.shadow.sm}
        onPress={() => setShowExamPicker(true)}
      >
        <View className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 items-center justify-center">
          <Feather name="file-text" size={18} color={tokens.colors.primary[600]} />
        </View>
        <View className="flex-1">
          <Text className="text-stone-500 dark:text-stone-400 text-xs mb-0.5" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Đề thi đang chấm
          </Text>
          <Text className="text-stone-900 dark:text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            {selectedExam?.title ?? 'Chọn đề thi...'}
          </Text>
        </View>
        <Feather name="chevron-down" size={16} color={tokens.colors.gray[400]} />
      </TouchableOpacity>

      {/* Pending approval banner */}
      {pendingApprovalCount > 0 && (
        <Animated.View entering={FadeInUp.duration(300)} className="mx-5 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-3 flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 items-center justify-center">
            <Text style={{ fontSize: 14 }}>🔑</Text>
          </View>
          <Text className="flex-1 text-amber-800 dark:text-amber-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            {pendingApprovalCount} bài đang chờ duyệt kết quả AI
          </Text>
        </Animated.View>
      )}

      {/* Student list */}
      {!selectedExamId ? (
        <View className="flex-1 items-center justify-center pb-20">
          <View className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-4">
            <Feather name="check-circle" size={28} color={tokens.colors.primary[600]} />
          </View>
          <Text className="text-stone-800 dark:text-stone-200 text-lg mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Chọn đề thi để bắt đầu
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm text-center px-8" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Camera quét phiếu trắc nghiệm + AI chấm bài tự luận
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="bg-white dark:bg-stone-800 mx-5 rounded-2xl overflow-hidden mb-4" style={tokens.shadow.sm}>
            {(submissions ?? []).length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>Chưa có bài nộp nào</Text>
              </View>
            ) : (
              (submissions ?? []).map((sub) => (
                <StudentRow key={sub.id} submission={sub} onGrade={() => handleStartGrading(sub)} />
              ))
            )}
          </View>

          {/* Add student button */}
          <TouchableOpacity
            className="mx-5 mb-6 border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-2xl py-4 items-center gap-1"
            onPress={() => {
              Alert.prompt('Thêm học sinh', 'Nhập mã học sinh:', (studentId) => {
                if (studentId?.trim()) createSubmissionMutation.mutate(studentId.trim())
              })
            }}
          >
            <Feather name="user-plus" size={18} color={tokens.colors.gray[400]} />
            <Text className="text-stone-400 dark:text-stone-500 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
              Thêm học sinh
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Exam picker modal */}
      {showExamPicker && (
        <View className="absolute inset-0 bg-black/50 justify-end">
          <View className="bg-white dark:bg-stone-900 rounded-t-3xl pt-4 pb-10 max-h-[70%]">
            <View className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 self-center mb-4" />
            <Text className="text-stone-900 dark:text-white text-base px-5 mb-4" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              Chọn đề thi
            </Text>
            <FlatList
              data={exams?.data ?? []}
              keyExtractor={(e) => e.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="px-5 py-3.5 flex-row items-center gap-3 border-b border-stone-100 dark:border-stone-800"
                  onPress={() => { setSelectedExamId(item.id); setShowExamPicker(false) }}
                >
                  <View className="flex-1">
                    <Text className="text-stone-900 dark:text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                      {item.title}
                    </Text>
                    <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                      {item.subject} · Lớp {item.grade}
                    </Text>
                  </View>
                  {selectedExamId === item.id && <Feather name="check" size={16} color={tokens.colors.primary[600]} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              className="mx-5 mt-4 py-3 items-center"
              onPress={() => setShowExamPicker(false)}
            >
              <Text className="text-stone-500 dark:text-stone-400" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
