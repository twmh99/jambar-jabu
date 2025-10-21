import axios from 'axios'

const envBase = import.meta.env.VITE_BACKEND_URL || ''
if (!envBase) {
  console.warn('⚠️ VITE_BACKEND_URL belum di-set. Harus diisi, mis: http://127.0.0.1:8000')
}

const BASE = envBase.endsWith('/api') ? envBase : `${envBase}/api`
console.info('🔗 API baseURL =', BASE)

export const api = axios.create({
  baseURL: BASE,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smpj_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
