import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL ?? 'http://localhost:3001'
const LESSON_URL = process.env.EXPO_PUBLIC_LESSON_URL ?? 'http://localhost:3002'
const EXAM_URL = process.env.EXPO_PUBLIC_EXAM_URL ?? 'http://localhost:3003'
const GRADING_URL = process.env.EXPO_PUBLIC_GRADING_URL ?? 'http://localhost:3004'
const AI_URL = process.env.EXPO_PUBLIC_AI_URL ?? 'http://localhost:3005'

function createClient(baseURL: string) {
  const client = axios.create({ baseURL, timeout: 30000 })

  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error.response?.status === 401) {
        useAuthStore.getState().logout()
      }
      return Promise.reject(error)
    }
  )

  return client
}

export const authApi = createClient(AUTH_URL)
export const lessonApi = createClient(LESSON_URL)
export const examApi = createClient(EXAM_URL)
export const gradingApi = createClient(GRADING_URL)
export const aiApi = createClient(AI_URL)
