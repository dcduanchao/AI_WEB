import { useAuthStore } from '@/stores/auth'

function parseSseBlock(
  block: string,
  onEvent: (event: string, data: any) => void,
) {
  if (!block.trim()) return

  let event = 'message'
  const dataLines: string[] = []

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (!dataLines.length) return

  const data = dataLines.join('\n')
  try {
    onEvent(event, JSON.parse(data))
  } catch {
    onEvent(event, data)
  }
}

export async function postSse(
  url: string,
  body: unknown,
  onEvent: (event: string, data: any) => void,
  signal?: AbortSignal,
): Promise<void> {
  const auth = useAuthStore()
  const resp = await fetch(import.meta.env.VITE_API_BASE + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth.token ? `Bearer ${auth.token}` : '',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (resp.status === 401) {
    auth.logout()
    window.location.href = '/login'
    return
  }

  if (!resp.ok) {
    let message = `请求失败(${resp.status})`
    try {
      const data = await resp.json()
      if (data?.message) message = data.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (!resp.body) return

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      buffer += decoder.decode()
      parseSseBlock(buffer, onEvent)
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      parseSseBlock(block, onEvent)
    }
  }
}
