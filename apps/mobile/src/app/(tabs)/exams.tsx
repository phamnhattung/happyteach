import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { tokens } from '@/theme/tokens'

function SkeletonRow() {
  return <View className="bg-stone-200 dark:bg-stone-700 rounded-2xl h-24 mb-3" />
}

export default function ExamsScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [loading] = useState(false)
  const exams: unknown[] = []

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
          Đề thi
        </Text>
        <TouchableOpacity
          className="flex-row items-center gap-2 bg-emerald-600 px-4 py-2.5 rounded-xl"
          onPress={() => router.push('/exams/generate' as any)}
        >
          <Feather name="plus" size={16} color="#FFF" />
          <Text
            className="text-white text-sm"
            style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
          >
            Tạo mới
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colors.secondary[500]} />
        }
      >
        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : exams.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <View className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mb-4">
              <Feather name="edit-3" size={28} color={tokens.colors.secondary[600]} />
            </View>
            <Text
              className="text-stone-800 dark:text-stone-200 text-lg mb-2"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Chưa có đề thi nào
            </Text>
            <Text
              className="text-stone-500 dark:text-stone-400 text-sm text-center mb-6 px-8"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              Tạo đề thi nhiều phiên bản, xuất PDF và chia sẻ ngay lập tức
            </Text>
            <TouchableOpacity
              className="bg-emerald-600 px-6 py-3 rounded-xl flex-row items-center gap-2"
              onPress={() => router.push('/exams/generate' as any)}
            >
              <Feather name="zap" size={16} color="#FFF" />
              <Text
                className="text-white text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Tạo đề thi đầu tiên
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
