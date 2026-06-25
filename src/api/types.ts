// 与后端 DTO 对应的类型定义

export interface UserInfo {
  id: number
  username: string
  nickname?: string
}

export interface LoginResponse {
  token: string
  tokenType: string
  expiresAt: string
  user: UserInfo
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatRequest {
  aiCode: string
  model: string
  conversationId?: number
  messages: ChatMessage[]
  temperature?: number
}

export interface ChatResponse {
  aiCode: string
  model: string
  content: string
}

export interface ChatChunk {
  aiCode: string
  model: string
  content: string
  done: boolean
}

export interface ModelsResponse {
  providers: Record<string, string[]>
}

export interface ImageRequest {
  aiCode: string
  model: string
  prompt: string
  size?: string
  count?: number
}

export interface ImageResponse {
  aiCode: string
  model: string
  status: string
  urls: string[]
  errorMessage: string | null
}

export interface SyncResult {
  providerId: number
  aiCode: string
  modelCount: number
  status: string
  message: string | null
}
