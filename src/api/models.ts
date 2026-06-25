import { http } from './http'
import type { ModelsResponse } from './types'

export function fetchModels() {
  return http.get('/models') as unknown as Promise<ModelsResponse>
}
