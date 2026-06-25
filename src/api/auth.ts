import { http } from './http'
import type { LoginResponse, UserInfo } from './types'

export function login(data: { username: string; password: string }) {
  return http.post('/auth/login', data) as unknown as Promise<LoginResponse>
}

export function fetchMe() {
  return http.get('/auth/me') as unknown as Promise<UserInfo>
}
