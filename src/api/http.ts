import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 60000,
})

// 请求拦截：注入 Bearer token
http.interceptors.request.use((cfg) => {
  const auth = useAuthStore()
  if (auth.token) {
    cfg.headers.Authorization = `Bearer ${auth.token}`
  }
  return cfg
})

// 响应拦截：拆 data、统一错误体 { message }、401 自动登出
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '请求失败'
    if (status === 401) {
      const auth = useAuthStore()
      auth.logout()
      if (router.currentRoute.value.path !== '/login') {
        router.replace('/login')
      }
    }
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)
