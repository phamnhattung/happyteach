import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { tokens } from '@/theme/tokens'

function SkeletonRow() {
  return <View className="bg-stone-200 dark:bg-stone-700 rounded-2xl h-20 mb-3" />
}

export default function GradeSheetsScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [loading] = useState(false)
  const sheets: unknown[] = []

  const onRefresh = async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1000))
    setRefreshing(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={['top']}>
      <View className="px-5 pt-5 pb-4">
        <Text
          className="text-stone-900 dark:text-white text-2xl"
          style={{ fontFamily: tokens.typography.fontFamily.sansExtraBold }}
        >
          Bảng điểm
        </Text>
        <Text
          className="text-stone-500 dark:text-stone-400 text-sm mt-1"
          style={{ fontFamily: tokens.typography.fontFamily.sans }}
        >
          Điểm tổng kết theo từng môn học
        </Text>
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
        ) : sheets.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <View className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-4">
              <Feather name="bar-chart-2" size={28} color={tokens.colors.primary[600]} />
            </View>
            <Text
              className="text-stone-800 dark:text-stone-200 text-lg mb-2"
              style={{ fontFamily: tokens.typography.fontFamily.sansBold }}
            >
              Chưa có bảng điểm
            </Text>
            <Text
              className="text-stone-500 dark:text-stone-400 text-sm text-center px-8"
              style={{ fontFamily: tokens.typography.fontFamily.sans }}
            >
              Bảng điểm của bạn sẽ xuất hiện ở đây sau khi giáo viên công bố
            </Text>
          </View>
        ) : null}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
