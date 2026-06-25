import { http } from './http'
import type { ChatRequest, ChatResponse } from './types'

export function chat(data: ChatRequest) {
  return http.post('/chat', data) as unknown as Promise<ChatResponse>
}
