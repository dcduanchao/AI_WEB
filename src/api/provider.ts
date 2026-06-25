import { http } from './http'
import type { SyncResult } from './types'

// ✅ 已有：同步单个 / 全部 provider 的模型
export function syncProvider(aiCode: string) {
  return http.post(`/admin/providers/${aiCode}/sync-models`) as unknown as Promise<SyncResult>
}

export function syncAll() {
  return http.post('/admin/providers/sync-all-models') as unknown as Promise<SyncResult[]>
}

// ⚠️ 以下为后端待补的 provider CRUD（见 FRONTEND.md 第 0 节缺口说明），接口就绪后启用
// export const listProviders  = () => http.get('/admin/providers')
// export const createProvider = (d: any) => http.post('/admin/providers', d)
// export const updateProvider = (id: number, d: any) => http.put(`/admin/providers/${id}`, d)
// export const deleteProvider = (id: number) => http.delete(`/admin/providers/${id}`)
