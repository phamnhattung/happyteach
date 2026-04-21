import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { tokens } from '@/theme/tokens'

function SkeletonRow() {
  return <View className="bg-stone-200 dark:bg-stone-700 rounded-2xl h-24 mb-3" />
}

export default function LessonsScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [loading] = useState(false)
  const lessons: unknown[] = []

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
          Bài giảng
        </Text>
        <TouchableOpacity
          className="flex-row items-center gap-2 bg-amber-500 px-4 py-2.5 rounded-xl"
          onPress={() => router.push('/lessons/generate' as any)}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colors.primary[500]} />
        }
      >
        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : lessons.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <View className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-4">
              <Feather name="book-open" size={28} color={tokens.colors.primary[600]} />
            </View>
            <Text
              className="text-stone-800 dark:text-stone-200 text-lg mb-2"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Chưa có bài giảng nào
            </Text>
            <Text
              className="text-stone-500 dark:text-stone-400 text-sm text-center mb-6 px-8"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              AI sẽ soạn bài giảng đúng với chương trình và phong cách giảng dạy của bạn
            </Text>
            <TouchableOpacity
              className="bg-amber-500 px-6 py-3 rounded-xl flex-row items-center gap-2"
              onPress={() => router.push('/lessons/generate' as any)}
            >
              <Feather name="zap" size={16} color="#FFF" />
              <Text
                className="text-white text-sm"
                style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
              >
                Tạo bài giảng đầu tiên
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
