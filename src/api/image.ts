import { http } from './http'
import type { ImageRequest, ImageResponse } from './types'

export function generateImage(data: ImageRequest) {
  return http.post('/images/generate', data) as unknown as Promise<ImageResponse>
}
