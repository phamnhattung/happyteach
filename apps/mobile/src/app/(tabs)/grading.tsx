import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { tokens } from '@/theme/tokens'

function SkeletonRow() {
  return <View className="bg-stone-200 dark:bg-stone-700 rounded-2xl h-20 mb-3" />
}

export default function GradingScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [loading] = useState(false)
  const sessions: unknown[] = []

  const onRefresh = async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1000))
    setRefreshing(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
        <Text
          className="text-stone-900 dark:text-white text-2xl"
          style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
        >
          Chấm bài
        </Text>
        <TouchableOpacity
          className="flex-row items-center gap-2 bg-violet-600 px-4 py-2.5 rounded-xl"
          onPress={() => router.push('/grading/scan' as any)}
        >
          <Feather name="camera" size={16} color="#FFF" />
          <Text
            className="text-white text-sm"
            style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
          >
            Quét bài
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
        }
      >
        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : sessions.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <View className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 items-center justify-center mb-4">
              <Feather name="camera" size={28} color="#7C3AED" />
            </View>
            <Text
              className="text-stone-800 dark:text-stone-200 text-lg mb-2"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Chưa có phiên chấm bài
            </Text>
            <Text
              className="text-stone-500 dark:text-stone-400 text-sm text-center mb-6 px-8"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              Quét phiếu trả lời bằng camera, AI chấm điểm tức thì và chính xác
            </Text>
            <TouchableOpacity
              className="bg-violet-600 px-6 py-3 rounded-xl flex-row items-center gap-2"
              onPress={() => router.push('/grading/scan' as any)}
            >
              <Feather name="camera" size={16} color="#FFF" />
              <Text
                className="text-white text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Bắt đầu chấm bài
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
