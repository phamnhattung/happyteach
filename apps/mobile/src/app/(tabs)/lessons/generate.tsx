import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useRef, useCallback } from 'react'
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { MMKV } from 'react-native-mmkv'
import { tokens } from '@/theme/tokens'
import { lessonApi } from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'

const storage = new MMKV({ id: 'lesson-drafts' })
const DRAFT_KEY = 'lesson-generate-draft'

const SUBJECTS = ['Toán', 'Văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Thể dục', 'Âm nhạc']
const DURATIONS = [45, 90] as const

type Duration = (typeof DURATIONS)[number]

interface FormData {
  subject: string
  chapter: string
  grade: number | null
  duration: Duration | null
  style: string
}

type Step = 0 | 1 | 2 | 3

const STEP_LABELS = ['Môn học', 'Chương bài', 'Lớp & Thời gian', 'Phong cách']

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} className="flex-row items-center">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center ${
              i < current
                ? 'bg-emerald-500'
                : i === current
                  ? 'bg-amber-500'
                  : 'bg-stone-200 dark:bg-stone-700'
            }`}
          >
            {i < current ? (
              <Feather name="check" size={14} color="#FFF" />
            ) : (
              <Text
                className={`text-xs ${i === current ? 'text-white' : 'text-stone-400 dark:text-stone-500'}`}
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                {i + 1}
              </Text>
            )}
          </View>
          {i < total - 1 && (
            <View
              className={`w-8 h-0.5 ${i < current ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-700'}`}
            />
          )}
        </View>
      ))}
    </View>
  )
}

function PulsingAICard({ text }: { text: string }) {
  const opacity = useSharedValue(1)

  const start = useCallback(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    )
  }, [opacity])

  const stopPulse = useCallback(() => {
    opacity.value = withTiming(1, { duration: 300 })
  }, [opacity])

  if (!text) start()
  else stopPulse()

  const animStyle = useAnimatedStyle(() => ({ opacity: text ? 1 : opacity.value }))

  return (
    <Animated.View
      style={[
        {
          borderRadius: 16,
          overflow: 'hidden',
          marginHorizontal: 20,
          padding: 16,
          backgroundColor: tokens.colors.primary[50],
          borderWidth: 1,
          borderColor: tokens.colors.primary[200],
        },
        animStyle,
      ]}
    >
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-7 h-7 rounded-full bg-amber-500 items-center justify-center">
          <Text style={{ fontSize: 14 }}>✨</Text>
        </View>
        <Text
          className="text-amber-800 text-sm"
          style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
        >
          {text ? 'AI đang soạn bài giảng...' : 'AI đang suy nghĩ...'}
        </Text>
      </View>
      {text ? (
        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          <Text
            className="text-stone-700 text-sm leading-6"
            style={{ fontFamily: tokens.typography.fontFamily.sans }}
          >
            {text}
          </Text>
        </ScrollView>
      ) : (
        <View className="gap-2">
          <View className="h-3 bg-amber-200 rounded-full w-full" />
          <View className="h-3 bg-amber-200 rounded-full w-4/5" />
          <View className="h-3 bg-amber-200 rounded-full w-5/6" />
        </View>
      )}
    </Animated.View>
  )
}

function saveDraft(data: FormData) {
  storage.set(DRAFT_KEY, JSON.stringify(data))
}

function loadDraft(): Partial<FormData> {
  try {
    const raw = storage.getString(DRAFT_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function clearDraft() {
  storage.delete(DRAFT_KEY)
}

export default function GenerateScreen() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const draft = loadDraft()

  const [step, setStep] = useState<Step>(0)
  const [form, setForm] = useState<FormData>({
    subject: draft.subject ?? '',
    chapter: draft.chapter ?? '',
    grade: draft.grade ?? null,
    duration: draft.duration ?? null,
    style: draft.style ?? '',
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const update = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value }
        saveDraft(next)
        return next
      })
    },
    [],
  )

  const canAdvance = useCallback(() => {
    if (step === 0) return !!form.subject
    if (step === 1) return form.chapter.trim().length >= 2
    if (step === 2) return form.grade !== null && form.duration !== null
    return true
  }, [step, form])

  const startStream = useCallback(() => {
    if (!accessToken) return
    setIsStreaming(true)
    setStreamedText('')

    const baseUrl = process.env.EXPO_PUBLIC_LESSON_URL ?? 'http://localhost:3002'
    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr

    let lastIndex = 0
    let accumulated = ''

    xhr.onprogress = () => {
      const chunk = xhr.responseText.slice(lastIndex)
      lastIndex = xhr.responseText.length

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          handleStreamDone(accumulated)
          return
        }
        try {
          const { token } = JSON.parse(payload) as { token: string }
          accumulated += token
          setStreamedText((prev) => prev + token)
        } catch {}
      }
    }

    xhr.onerror = () => {
      setIsStreaming(false)
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.')
    }

    xhr.open('POST', `${baseUrl}/lessons/generate`)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.send(
      JSON.stringify({
        subject: form.subject,
        chapter: form.chapter,
        grade: form.grade,
        duration: form.duration,
        style: form.style || undefined,
      }),
    )
  }, [accessToken, form])

  const handleStreamDone = useCallback(
    async (fullText: string) => {
      setIsStreaming(false)
      setIsSaving(true)

      try {
        const lessonPlan = JSON.parse(fullText)
        const { data } = await lessonApi.post('/lessons', {
          subject: form.subject,
          grade: form.grade,
          duration: form.duration,
          content: lessonPlan,
        })
        clearDraft()
        router.replace(`/lessons/${data.id}`)
      } catch {
        setIsSaving(false)
        Alert.alert('Lỗi', 'Không thể lưu bài giảng. Vui lòng thử lại.')
      }
    },
    [form, router],
  )

  const cancelStream = useCallback(() => {
    xhrRef.current?.abort()
    setIsStreaming(false)
    setStreamedText('')
  }, [])

  if (isStreaming || isSaving) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
        <View className="px-5 pt-5 pb-4 flex-row items-center">
          {!isSaving && (
            <TouchableOpacity onPress={cancelStream} className="mr-3">
              <Feather name="x" size={22} color={tokens.colors.gray[500]} />
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Text
              className="text-stone-900 dark:text-white text-lg"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              {isSaving ? 'Đang lưu bài giảng...' : 'AI đang soạn bài'}
            </Text>
            <Text
              className="text-stone-500 text-sm"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              {form.subject} · Lớp {form.grade} · {form.duration} phút
            </Text>
          </View>
        </View>

        <PulsingAICard text={streamedText} />

        {!isSaving && (
          <View className="px-5 pt-4">
            <Text
              className="text-stone-400 text-xs text-center"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              Bài giảng sẽ tự động lưu khi AI hoàn thành
            </Text>
          </View>
        )}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <TouchableOpacity
            onPress={() => (step === 0 ? router.back() : setStep((s) => (s - 1) as Step))}
            className="mr-3 w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center"
          >
            <Feather name={step === 0 ? 'x' : 'arrow-left'} size={18} color={tokens.colors.gray[600]} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text
              className="text-stone-900 dark:text-white text-lg"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Soạn bài giảng AI
            </Text>
            <Text
              className="text-stone-400 text-xs"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              Bước {step + 1}/4 · {STEP_LABELS[step]}
            </Text>
          </View>
        </View>

        <StepIndicator current={step} total={4} />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        >
          {step === 0 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text
                className="text-stone-800 dark:text-stone-200 text-xl mb-2"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Bạn muốn soạn bài cho môn nào?
              </Text>
              <Text
                className="text-stone-500 text-sm mb-6"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                Chọn môn học để AI hiểu ngữ cảnh bài giảng
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {SUBJECTS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    className={`px-4 py-3 rounded-xl border ${
                      form.subject === s
                        ? 'bg-amber-500 border-amber-500'
                        : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                    }`}
                    style={form.subject === s ? tokens.shadow.sm : undefined}
                    onPress={() => update('subject', s)}
                  >
                    <Text
                      className={`text-sm ${form.subject === s ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}
                      style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text
                className="text-stone-800 dark:text-stone-200 text-xl mb-2"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Tên chương / bài học?
              </Text>
              <Text
                className="text-stone-500 text-sm mb-6"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                Nhập tên chương hoặc bài học cụ thể để AI soạn đúng nội dung
              </Text>
              <TextInput
                className="bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl px-4 py-4 text-base border border-stone-200 dark:border-stone-700"
                style={[{ fontFamily: tokens.typography.fontFamily.sans }, tokens.shadow.sm]}
                placeholder={`VD: Phương trình bậc hai một ẩn`}
                placeholderTextColor={tokens.colors.gray[400]}
                value={form.chapter}
                onChangeText={(v) => update('chapter', v)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoFocus
              />
              <Text
                className="text-stone-400 text-xs mt-2"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                {form.chapter.length}/200 ký tự
              </Text>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text
                className="text-stone-800 dark:text-stone-200 text-xl mb-6"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Lớp học và thời lượng tiết
              </Text>

              <Text
                className="text-stone-600 dark:text-stone-400 text-sm mb-3"
                style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
              >
                Lớp học
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <TouchableOpacity
                    key={g}
                    className={`w-14 h-12 rounded-xl border items-center justify-center ${
                      form.grade === g
                        ? 'bg-amber-500 border-amber-500'
                        : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                    }`}
                    onPress={() => update('grade', g)}
                  >
                    <Text
                      className={`text-sm ${form.grade === g ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}
                      style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                className="text-stone-600 dark:text-stone-400 text-sm mb-3"
                style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
              >
                Thời lượng tiết học
              </Text>
              <View className="flex-row gap-3">
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    className={`flex-1 py-4 rounded-xl border items-center ${
                      form.duration === d
                        ? 'bg-amber-500 border-amber-500'
                        : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                    }`}
                    onPress={() => update('duration', d)}
                  >
                    <Text
                      className={`text-xl mb-1 ${form.duration === d ? 'text-white' : 'text-stone-800 dark:text-stone-200'}`}
                      style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
                    >
                      {d}
                    </Text>
                    <Text
                      className={`text-xs ${form.duration === d ? 'text-amber-100' : 'text-stone-400'}`}
                      style={{ fontFamily: tokens.typography.fontFamily.sans }}
                    >
                      phút
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text
                className="text-stone-800 dark:text-stone-200 text-xl mb-2"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Phong cách giảng dạy (tùy chọn)
              </Text>
              <Text
                className="text-stone-500 text-sm mb-6"
                style={{ fontFamily: tokens.typography.fontFamily.sans }}
              >
                Mô tả phong cách để AI cá nhân hóa bài giảng theo cách dạy của bạn
              </Text>
              <TextInput
                className="bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl px-4 py-4 text-sm border border-stone-200 dark:border-stone-700"
                style={[{ fontFamily: tokens.typography.fontFamily.sans }, tokens.shadow.sm]}
                placeholder="VD: Tôi thích sử dụng nhiều ví dụ thực tế, tổ chức thảo luận nhóm, và dùng hình ảnh minh họa..."
                placeholderTextColor={tokens.colors.gray[400]}
                value={form.style}
                onChangeText={(v) => update('style', v)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <View className="mt-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <View className="flex-row items-start gap-2">
                  <Feather name="info" size={16} color={tokens.colors.primary[600]} style={{ marginTop: 1 }} />
                  <Text
                    className="text-amber-800 dark:text-amber-300 text-xs flex-1"
                    style={{ fontFamily: tokens.typography.fontFamily.sans }}
                  >
                    AI học dần từ các bài giảng bạn lưu. Bỏ trống ô này nếu bạn muốn dùng phong cách đã học.
                  </Text>
                </View>
              </View>

              {/* Summary */}
              <View className="mt-6 bg-white dark:bg-stone-800 rounded-xl p-4 border border-stone-200 dark:border-stone-700">
                <Text
                  className="text-stone-600 dark:text-stone-400 text-xs mb-3"
                  style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                >
                  TÓM TẮT BÀI GIẢNG
                </Text>
                {[
                  { label: 'Môn học', value: form.subject },
                  { label: 'Chương bài', value: form.chapter },
                  { label: 'Lớp', value: `Lớp ${form.grade}` },
                  { label: 'Thời lượng', value: `${form.duration} phút` },
                ].map(({ label, value }) => (
                  <View key={label} className="flex-row justify-between items-center mb-2">
                    <Text
                      className="text-stone-400 text-sm"
                      style={{ fontFamily: tokens.typography.fontFamily.sans }}
                    >
                      {label}
                    </Text>
                    <Text
                      className="text-stone-800 dark:text-stone-200 text-sm"
                      style={{ fontFamily: tokens.typography.fontFamily.sansSemiBold }}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom button */}
        <View className="px-5 pb-6 pt-3 bg-stone-50 dark:bg-stone-950">
          <TouchableOpacity
            className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${
              canAdvance() ? 'bg-amber-500' : 'bg-stone-200 dark:bg-stone-700'
            }`}
            style={canAdvance() ? tokens.shadow.md : undefined}
            onPress={() => {
              if (!canAdvance()) return
              if (step < 3) {
                setStep((s) => (s + 1) as Step)
              } else {
                startStream()
              }
            }}
            disabled={!canAdvance()}
          >
            {step === 3 ? (
              <>
                <Feather name="zap" size={18} color={canAdvance() ? '#FFF' : tokens.colors.gray[400]} />
                <Text
                  className={`text-base ${canAdvance() ? 'text-white' : 'text-stone-400'}`}
                  style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                >
                  Tạo bài giảng
                </Text>
              </>
            ) : (
              <>
                <Text
                  className={`text-base ${canAdvance() ? 'text-white' : 'text-stone-400'}`}
                  style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
                >
                  Tiếp theo
                </Text>
                <Feather name="arrow-right" size={18} color={canAdvance() ? '#FFF' : tokens.colors.gray[400]} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
