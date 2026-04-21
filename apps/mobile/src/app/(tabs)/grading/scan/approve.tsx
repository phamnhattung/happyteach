import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { gradingApi } from '@/lib/axios'

interface CriterionScore {
  name: string
  score: number
  maxScore: number
  comment?: string
}

interface AiResult {
  questionId: string
  questionContent: string
  questionPoints: number
  gradingMode: 'ai' | 'essay'
  ocrText: string
  suggestedScore: number
  reasoning: string
  criteriaScores?: CriterionScore[]
  status: 'pending_approval' | 'approved' | 'overridden'
  approvedScore?: number
}

interface ApproveAllDto {
  approvals: { questionId: string; approvedScore: number; note?: string }[]
}

function Stepper({
  value,
  min,
  max,
  step = 0.5,
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(1))))
  const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(1))))

  return (
    <View className="flex-row items-center gap-2">
      <TouchableOpacity
        onPress={dec}
        disabled={value <= min}
        className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 items-center justify-center"
        style={{ opacity: value <= min ? 0.4 : 1 }}
      >
        <Feather name="minus" size={14} color={tokens.colors.gray[600]} />
      </TouchableOpacity>
      <View className="min-w-[52px] items-center">
        <Text className="text-stone-900 dark:text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          {value.toFixed(1)}
        </Text>
        <Text className="text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
          / {max}
        </Text>
      </View>
      <TouchableOpacity
        onPress={inc}
        disabled={value >= max}
        className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 items-center justify-center"
        style={{ opacity: value >= max ? 0.4 : 1 }}
      >
        <Feather name="plus" size={14} color={tokens.colors.gray[600]} />
      </TouchableOpacity>
    </View>
  )
}

function CriteriaBreakdown({ criteria }: { criteria: CriterionScore[] }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <View className="mt-2">
      <TouchableOpacity
        className="flex-row items-center gap-1"
        onPress={() => setExpanded((v) => !v)}
      >
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.colors.gray[500]}
        />
        <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
          Chi tiết rubric
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View className="mt-2 gap-2">
          {criteria.map((c, i) => (
            <View key={i} className="bg-stone-50 dark:bg-stone-800 rounded-xl p-2.5">
              <View className="flex-row justify-between items-center mb-0.5">
                <Text className="text-stone-700 dark:text-stone-200 text-xs flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                  {c.name}
                </Text>
                <Text className="text-violet-600 dark:text-violet-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                  {c.score}/{c.maxScore}
                </Text>
              </View>
              {c.comment && (
                <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  {c.comment}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function QuestionCard({
  result,
  index,
  score,
  onScoreChange,
  approved,
  onApprove,
}: {
  result: AiResult
  index: number
  score: number
  onScoreChange: (v: number) => void
  approved: boolean
  onApprove: () => void
}) {
  const [editingOcr, setEditingOcr] = useState(false)
  const [ocrText, setOcrText] = useState(result.ocrText)

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(250)}>
      <View
        className={`mb-3 rounded-2xl overflow-hidden ${approved ? 'border border-green-400 dark:border-green-600' : 'border border-stone-200 dark:border-stone-700'}`}
        style={tokens.shadow.sm}
      >
        {/* Header */}
        <View className={`px-4 py-3 flex-row items-center gap-2 ${approved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-stone-800'}`}>
          <View className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 items-center justify-center">
            <Text className="text-violet-700 dark:text-violet-300 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
              {index + 1}
            </Text>
          </View>
          <Text className="flex-1 text-stone-800 dark:text-white text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }} numberOfLines={2}>
            {result.questionContent}
          </Text>
          {approved && <Feather name="check-circle" size={18} color="#16A34A" />}
        </View>

        <View className="px-4 pb-4 pt-2 bg-white dark:bg-stone-900 gap-3">
          {/* OCR text */}
          <View>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                BÀI LÀM HỌC SINH
              </Text>
              <TouchableOpacity onPress={() => setEditingOcr((v) => !v)}>
                <Feather name={editingOcr ? 'check' : 'edit-2'} size={12} color={tokens.colors.gray[400]} />
              </TouchableOpacity>
            </View>
            {editingOcr ? (
              <TextInput
                value={ocrText}
                onChangeText={setOcrText}
                multiline
                className="text-stone-700 dark:text-stone-300 text-sm bg-stone-50 dark:bg-stone-800 rounded-xl p-3"
                style={{ fontFamily: tokens.typography.fontFamily.sans, minHeight: 72 }}
              />
            ) : (
              <ScrollView style={{ maxHeight: 96 }}>
                <Text className="text-stone-700 dark:text-stone-300 text-sm leading-5" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                  {ocrText || '(Không đọc được)'}
                </Text>
              </ScrollView>
            )}
          </View>

          {/* AI reasoning */}
          <View className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3">
            <Text className="text-violet-700 dark:text-violet-300 text-xs mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
              AI NHẬN XÉT
            </Text>
            <Text className="text-stone-700 dark:text-stone-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
              {result.reasoning}
            </Text>
            {result.criteriaScores && result.criteriaScores.length > 0 && (
              <CriteriaBreakdown criteria={result.criteriaScores} />
            )}
          </View>

          {/* Score stepper + approve */}
          <View className="flex-row items-center justify-between">
            <Stepper
              value={score}
              min={0}
              max={result.questionPoints}
              onChange={onScoreChange}
            />
            <TouchableOpacity
              onPress={onApprove}
              className={`px-4 py-2 rounded-xl ${approved ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-500'}`}
            >
              <Text
                className={`text-sm ${approved ? 'text-green-700 dark:text-green-400' : 'text-white'}`}
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                {approved ? '✓ Đã duyệt' : 'Duyệt'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

export default function ApproveScreen() {
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: results, isLoading } = useQuery<AiResult[]>({
    queryKey: ['ai-results', submissionId],
    queryFn: () => gradingApi.get(`/grading/submissions/${submissionId}/ai-results`).then((r) => r.data),
    enabled: !!submissionId,
  })

  const [scores, setScores] = useState<Record<string, number>>({})
  const [approved, setApproved] = useState<Record<string, boolean>>({})

  const getScore = (r: AiResult) => scores[r.questionId] ?? r.suggestedScore

  const approveMutation = useMutation({
    mutationFn: (dto: ApproveAllDto) =>
      gradingApi.post(`/grading/submissions/${submissionId}/approve`, dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      const total = dto.approvals.reduce((s, a) => s + a.approvedScore, 0)
      Alert.alert(
        'Đã duyệt',
        `Tổng điểm tự luận: ${total.toFixed(1)} điểm`,
        [{ text: 'OK', onPress: () => router.back() }],
      )
    },
    onError: () => Alert.alert('Lỗi', 'Không thể lưu kết quả. Thử lại.'),
  })

  const handleApproveOne = (questionId: string) => {
    setApproved((prev) => ({ ...prev, [questionId]: true }))
  }

  const handleApproveAll = () => {
    if (!results) return
    const approvals = results.map((r) => ({
      questionId: r.questionId,
      approvedScore: getScore(r),
    }))
    approveMutation.mutate({ approvals })
  }

  const handleSubmit = () => {
    if (!results) return
    const unapproved = results.filter((r) => !approved[r.questionId])
    if (unapproved.length > 0) {
      Alert.alert(
        'Còn câu chưa duyệt',
        `${unapproved.length} câu chưa được duyệt. Bạn có muốn duyệt tất cả và xác nhận?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Duyệt tất cả', onPress: handleApproveAll },
        ],
      )
    } else {
      const approvals = results.map((r) => ({
        questionId: r.questionId,
        approvedScore: getScore(r),
      }))
      approveMutation.mutate({ approvals })
    }
  }

  const approvedCount = results ? results.filter((r) => approved[r.questionId]).length : 0
  const totalCount = results?.length ?? 0

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center">
        <ActivityIndicator size="large" color={tokens.colors.primary[600]} />
        <Text className="text-stone-500 dark:text-stone-400 text-sm mt-3" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
          Đang tải kết quả AI...
        </Text>
      </SafeAreaView>
    )
  }

  if (!results || results.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center px-8">
        <Feather name="check-circle" size={48} color={tokens.colors.secondary[400]} />
        <Text className="text-stone-800 dark:text-white text-lg mt-4 text-center" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Không có câu tự luận
        </Text>
        <TouchableOpacity className="mt-6 bg-amber-500 px-6 py-3 rounded-2xl" onPress={() => router.back()}>
          <Text className="text-white" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={tokens.colors.gray[700]} />
        </TouchableOpacity>
        <Text className="text-stone-900 dark:text-white text-base flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Duyệt kết quả AI
        </Text>
        <View className="bg-violet-100 dark:bg-violet-900/30 px-3 py-1 rounded-full">
          <Text className="text-violet-700 dark:text-violet-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            {approvedCount}/{totalCount}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {results.map((r, i) => (
          <QuestionCard
            key={r.questionId}
            result={r}
            index={i}
            score={getScore(r)}
            onScoreChange={(v) => setScores((prev) => ({ ...prev, [r.questionId]: v }))}
            approved={!!approved[r.questionId]}
            onApprove={() => handleApproveOne(r.questionId)}
          />
        ))}
        <View className="h-28" />
      </ScrollView>

      {/* Bottom bar */}
      <View className="px-5 pb-6 pt-3 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 gap-2">
        <TouchableOpacity
          className="bg-stone-100 dark:bg-stone-800 py-3 rounded-2xl items-center"
          onPress={handleApproveAll}
          disabled={approveMutation.isPending}
        >
          <Text className="text-stone-700 dark:text-stone-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Duyệt tất cả theo AI
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-amber-500 py-4 rounded-2xl items-center flex-row justify-center gap-2"
          style={tokens.shadow.md}
          onPress={handleSubmit}
          disabled={approveMutation.isPending}
        >
          {approveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Feather name="check" size={18} color="#FFF" />
              <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                Xác nhận & Lưu điểm
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
