import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInRight, FadeOutLeft, FadeInUp } from 'react-native-reanimated'
import { tokens } from '@/theme/tokens'
import { examApi } from '@/lib/axios'

const SUBJECTS = ['Toán', 'Văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Thể dục', 'Âm nhạc']
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const DURATIONS = [15, 30, 45, 60, 90, 120]
const DIFFICULTIES = [
  { value: 1, label: 'Rất dễ', color: '#10B981' },
  { value: 2, label: 'Dễ', color: '#3B82F6' },
  { value: 3, label: 'TB', color: '#F59E0B' },
  { value: 4, label: 'Khó', color: '#F97316' },
  { value: 5, label: 'Rất khó', color: '#EF4444' },
]

interface QuestionMix {
  mcqCount: number
  tfCount: number
  shortCount: number
  openCount: number
  essayCount: number
}

const QUESTION_TYPES = [
  { key: 'mcqCount' as keyof QuestionMix, label: 'Trắc nghiệm MCQ', icon: '🔵', color: '#1D4ED8', badge: 'Keyed' },
  { key: 'tfCount' as keyof QuestionMix, label: 'Đúng / Sai', icon: '🟢', color: '#15803D', badge: 'Keyed' },
  { key: 'shortCount' as keyof QuestionMix, label: 'Trả lời ngắn', icon: '🟡', color: '#B45309', badge: 'AI' },
  { key: 'openCount' as keyof QuestionMix, label: 'Câu hỏi mở', icon: '🟠', color: '#C2410C', badge: 'AI' },
  { key: 'essayCount' as keyof QuestionMix, label: 'Tự luận (Rubric)', icon: '🟣', color: '#6D28D9', badge: 'AI+Rubric' },
]

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row items-center gap-2 px-5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} className="flex-row items-center">
          <View
            className={`h-1.5 rounded-full ${i < current ? 'bg-violet-600' : 'bg-stone-200 dark:bg-stone-700'}`}
            style={{ width: (280 / total) - 4 }}
          />
        </View>
      ))}
    </View>
  )
}

function Stepper({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <View className="flex-row items-center gap-3">
      <TouchableOpacity
        className={`w-8 h-8 rounded-full border items-center justify-center ${value <= min ? 'border-stone-200 dark:border-stone-700' : 'border-violet-400'}`}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Feather name="minus" size={14} color={value <= min ? tokens.colors.gray[300] : '#7C3AED'} />
      </TouchableOpacity>
      <Text className="text-stone-900 dark:text-white w-6 text-center text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
        {value}
      </Text>
      <TouchableOpacity
        className={`w-8 h-8 rounded-full border items-center justify-center ${value >= max ? 'border-stone-200 dark:border-stone-700' : 'border-violet-400'}`}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Feather name="plus" size={14} color={value >= max ? tokens.colors.gray[300] : '#7C3AED'} />
      </TouchableOpacity>
    </View>
  )
}

export default function GenerateExamScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [chapter, setChapter] = useState('')
  const [duration, setDuration] = useState(45)
  const [instructions, setInstructions] = useState('')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [questionMix, setQuestionMix] = useState<QuestionMix>({
    mcqCount: 10,
    tfCount: 0,
    shortCount: 2,
    openCount: 0,
    essayCount: 1,
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const totalQuestions = Object.values(questionMix).reduce((a, b) => a + b, 0)

  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true)
      const [questionsRes] = await Promise.all([
        examApi.post('/exams/generate', {
          subject, grade, chapter, duration, instructions: instructions || undefined,
          questions: questionMix, difficulty,
        }),
      ])
      const questions = questionsRes.data
      const examRes = await examApi.post('/exams', {
        title: `Đề kiểm tra ${subject} - Lớp ${grade}`,
        subject,
        grade,
        chapter,
        duration,
        instructions: instructions || undefined,
        questions,
      })
      return examRes.data
    },
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      router.replace(`/exams/${exam.id}`)
    },
    onError: () => {
      setIsGenerating(false)
      Alert.alert('Lỗi', 'Không thể tạo đề thi. Vui lòng thử lại.')
    },
  })

  const canNext = () => {
    if (step === 1) return !!(subject && grade)
    if (step === 2) return !!chapter
    if (step === 3) return totalQuestions > 0
    return true
  }

  const renderStep = () => {
    if (step === 1) {
      return (
        <Animated.View entering={FadeInRight.duration(300)} key="step1">
          <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Môn học & Lớp
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Chọn môn học và lớp bạn muốn tạo đề thi
          </Text>

          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Môn học
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                className={`px-4 py-2 rounded-xl border ${subject === s ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'}`}
                onPress={() => setSubject(s)}
              >
                <Text
                  className={`text-sm ${subject === s ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}
                  style={{ fontFamily: subject === s ? tokens.typography.fontFamily.sansBold : tokens.typography.fontFamily.sans }}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Lớp
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g}
                className={`w-12 h-12 rounded-xl border items-center justify-center ${grade === g ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'}`}
                onPress={() => setGrade(g)}
              >
                <Text
                  className={`text-sm ${grade === g ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}
                  style={{ fontFamily: grade === g ? tokens.typography.fontFamily.sansBold : tokens.typography.fontFamily.sans }}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )
    }

    if (step === 2) {
      return (
        <Animated.View entering={FadeInRight.duration(300)} key="step2">
          <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Nội dung & Thời gian
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Nhập chương/bài và thời gian làm bài
          </Text>

          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Chương / Bài *
          </Text>
          <View
            className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 mb-5"
            style={tokens.shadow.sm}
          >
            <TextInput
              className="text-stone-900 dark:text-white text-sm"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
              placeholder="VD: Chương 2 - Phương trình bậc hai"
              placeholderTextColor={tokens.colors.gray[400]}
              value={chapter}
              onChangeText={setChapter}
              multiline
            />
          </View>

          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Thời gian làm bài
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                className={`px-4 py-2 rounded-xl border ${duration === d ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'}`}
                onPress={() => setDuration(d)}
              >
                <Text
                  className={`text-sm ${duration === d ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}
                  style={{ fontFamily: duration === d ? tokens.typography.fontFamily.sansBold : tokens.typography.fontFamily.sans }}
                >
                  {d} phút
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-2" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Yêu cầu đặc biệt (tuỳ chọn)
          </Text>
          <View
            className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3"
            style={tokens.shadow.sm}
          >
            <TextInput
              className="text-stone-900 dark:text-white text-sm"
              style={{ fontFamily: tokens.typography.fontFamily.sans, minHeight: 72 }}
              placeholder="VD: Tập trung vào dạng bài tập thực tế, tránh lý thuyết thuần tuý..."
              placeholderTextColor={tokens.colors.gray[400]}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              textAlignVertical="top"
            />
          </View>
        </Animated.View>
      )
    }

    if (step === 3) {
      return (
        <Animated.View entering={FadeInRight.duration(300)} key="step3">
          <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Cơ cấu đề thi
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Tổng: {totalQuestions} câu hỏi
          </Text>

          <View className="gap-4 mb-6">
            {QUESTION_TYPES.map((qt) => (
              <View key={qt.key} className="bg-white dark:bg-stone-800 rounded-2xl p-4 flex-row items-center justify-between" style={tokens.shadow.sm}>
                <View className="flex-row items-center gap-3 flex-1">
                  <Text style={{ fontSize: 20 }}>{qt.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-stone-800 dark:text-stone-200 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
                      {qt.label}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <View className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700">
                        <Text className="text-stone-500 dark:text-stone-400 text-xs" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
                          {qt.badge}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Stepper
                  value={questionMix[qt.key]}
                  onChange={(v) => setQuestionMix((prev) => ({ ...prev, [qt.key]: v }))}
                />
              </View>
            ))}
          </View>

          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>
            Độ khó
          </Text>
          <View className="flex-row gap-2">
            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d.value}
                className={`flex-1 py-2.5 rounded-xl items-center border ${difficulty === d.value ? 'border-transparent' : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800'}`}
                style={difficulty === d.value ? { backgroundColor: d.color } : undefined}
                onPress={() => setDifficulty(d.value as 1 | 2 | 3 | 4 | 5)}
              >
                <Text
                  className={`text-xs ${difficulty === d.value ? 'text-white' : 'text-stone-600 dark:text-stone-400'}`}
                  style={{ fontFamily: difficulty === d.value ? tokens.typography.fontFamily.sansBold : tokens.typography.fontFamily.sans }}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )
    }

    // Step 4 — Review
    return (
      <Animated.View entering={FadeInRight.duration(300)} key="step4">
        <Text className="text-stone-900 dark:text-white text-xl mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Xem lại & Tạo đề
        </Text>
        <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
          AI sẽ tạo đề thi hoàn chỉnh theo thông số bên dưới
        </Text>

        <View className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-4" style={tokens.shadow.sm}>
          {[
            { label: 'Môn học', value: subject },
            { label: 'Lớp', value: `Lớp ${grade}` },
            { label: 'Chương/Bài', value: chapter },
            { label: 'Thời gian', value: `${duration} phút` },
            { label: 'Độ khó', value: DIFFICULTIES.find((d) => d.value === difficulty)?.label ?? '' },
          ].map(({ label, value }) => (
            <View key={label} className="flex-row items-start justify-between py-2.5 border-b border-stone-100 dark:border-stone-700 last:border-0">
              <Text className="text-stone-500 dark:text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>{label}</Text>
              <Text className="text-stone-800 dark:text-stone-200 text-sm ml-4 text-right flex-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>{value}</Text>
            </View>
          ))}
        </View>

        <View className="bg-white dark:bg-stone-800 rounded-2xl p-4 mb-4" style={tokens.shadow.sm}>
          <Text className="text-stone-700 dark:text-stone-300 text-sm mb-3" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            Cơ cấu câu hỏi
          </Text>
          {QUESTION_TYPES.filter((qt) => questionMix[qt.key] > 0).map((qt) => (
            <View key={qt.key} className="flex-row items-center justify-between py-1.5">
              <View className="flex-row items-center gap-2">
                <Text style={{ fontSize: 14 }}>{qt.icon}</Text>
                <Text className="text-stone-600 dark:text-stone-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>{qt.label}</Text>
              </View>
              <Text className="text-stone-800 dark:text-stone-200 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                {questionMix[qt.key]} câu
              </Text>
            </View>
          ))}
          <View className="border-t border-stone-100 dark:border-stone-700 mt-2 pt-2 flex-row justify-between">
            <Text className="text-stone-700 dark:text-stone-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>Tổng</Text>
            <Text className="text-violet-600 dark:text-violet-400 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>{totalQuestions} câu</Text>
          </View>
        </View>

        {instructions ? (
          <View className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800">
            <Text className="text-amber-700 dark:text-amber-400 text-xs mb-1" style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}>Yêu cầu đặc biệt</Text>
            <Text className="text-amber-800 dark:text-amber-300 text-sm" style={{ fontFamily: tokens.typography.fontFamily.sans }}>{instructions}</Text>
          </View>
        ) : null}
      </Animated.View>
    )
  }

  if (isGenerating) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center">
        <Animated.View entering={FadeInUp.duration(400)} className="items-center px-8">
          <View className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/30 items-center justify-center mb-6">
            <ActivityIndicator size="large" color={tokens.colors.secondary[600]} />
          </View>
          <Text className="text-stone-900 dark:text-white text-xl mb-2 text-center" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
            AI đang soạn đề...
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm text-center" style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Đang tạo {totalQuestions} câu hỏi cho môn {subject} lớp {grade}
          </Text>
        </Animated.View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={tokens.colors.gray[700]} />
        </TouchableOpacity>
        <Text className="text-stone-800 dark:text-stone-200 text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
          Bước {step} / 4
        </Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={tokens.colors.gray[700]} />
        </TouchableOpacity>
      </View>

      <StepIndicator current={step} total={4} />

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderStep()}
        <View className="h-24" />
      </ScrollView>

      {/* Bottom action */}
      <View className="px-5 pb-6 pt-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
        <TouchableOpacity
          className={`py-4 rounded-2xl items-center flex-row justify-center gap-2 ${canNext() ? 'bg-violet-600' : 'bg-stone-200 dark:bg-stone-700'}`}
          style={canNext() ? tokens.shadow.md : undefined}
          disabled={!canNext()}
          onPress={() => {
            if (step < 4) {
              setStep(step + 1)
            } else {
              generateMutation.mutate()
            }
          }}
        >
          {step === 4 ? (
            <>
              <Feather name="zap" size={18} color="#FFF" />
              <Text className="text-white text-base" style={{ fontFamily: tokens.typography.fontFamily.sansBold }}>
                Tạo đề thi AI
              </Text>
            </>
          ) : (
            <>
              <Text
                className={`text-base ${canNext() ? 'text-white' : 'text-stone-400'}`}
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Tiếp theo
              </Text>
              <Feather name="arrow-right" size={18} color={canNext() ? '#FFF' : tokens.colors.gray[400]} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
