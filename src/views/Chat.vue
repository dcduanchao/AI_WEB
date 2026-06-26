<template>
  <div class="chat-shell">
    <aside class="conversation-panel">
      <div class="panel-header">
        <div class="panel-title">会话</div>
        <div class="panel-actions">
          <button class="icon-btn" type="button" :disabled="sending" @click="createSession">
            <el-icon><Plus /></el-icon>
          </button>
          <button class="icon-btn" type="button" :disabled="sending" @click="clearCurrentSession">
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </div>

      <div class="session-list">
        <button
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === currentSessionId }"
          :disabled="sending"
          type="button"
          @click="selectSession(session.id)"
        >
          <span class="session-title">{{ session.title }}</span>
          <span class="session-meta">{{ session.messages.length ? `${session.messages.length} 条消息` : '空会话' }}</span>
        </button>
      </div>

      <div class="panel-footer">
        <el-select
          v-model="aiCode"
          class="side-select"
          placeholder="选择提供商"
          :disabled="sending"
          @change="onProviderChange"
        >
          <el-option v-for="code in models.aiCodes" :key="code" :label="code" :value="code" />
        </el-select>
        <el-switch v-model="stream" active-text="流式" inline-prompt :disabled="sending" />
      </div>
    </aside>

    <section class="chat-stage">
      <div v-if="messages.length" ref="listRef" class="messages">
        <div v-for="(m, i) in messages" :key="`${currentSessionId}-${i}`" class="msg" :class="m.role">
          <div class="avatar">{{ m.role === 'user' ? '我' : 'G' }}</div>
          <div class="bubble" v-html="render(m.content)"></div>
        </div>
      </div>

      <div v-else class="empty-state">
        <h1>Chat</h1>
        <p>输入一条消息开始新的会话。</p>
      </div>

      <div class="composer-wrap">
        <div class="composer">
          <button class="attach-btn" type="button" disabled>
            <el-icon><UploadFilled /></el-icon>
          </button>
          <el-input
            v-model="input"
            class="composer-input"
            type="textarea"
            resize="none"
            :autosize="{ minRows: 1, maxRows: 6 }"
            placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
            @keydown.enter.exact.prevent="send"
          />
          <div class="composer-side">
            <el-select
              v-model="model"
              class="composer-model"
              placeholder="选择模型"
              filterable
              :disabled="sending"
              :teleported="false"
              placement="top-end"
            >
              <el-option v-for="m in models.modelsOf(aiCode)" :key="m" :label="m" :value="m" />
            </el-select>
            <button
              class="send-btn"
              type="button"
              :disabled="!canSend"
              :class="{ sending }"
              @click="sending ? stop() : send()"
            >
              <el-icon v-if="!sending"><Promotion /></el-icon>
              <span v-else>停</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { Delete, Plus, Promotion, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import { useModelsStore } from '@/stores/models'
import { chat } from '@/api/chat'
import { postSse } from '@/utils/sse'
import type { ChatMessage } from '@/api/types'

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
}

const md = new MarkdownIt({ breaks: true, linkify: true })
const imageUrlPattern = /\.(png|jpe?g|gif|webp|bmp|svg)(?:$|[?#])/i
const imageRoutePattern = /\/(?:v\d+\/)?files\/image\b/i
const urlPattern = /https?:\/\/[^\s<>"']+/g

function isImageUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return imageUrlPattern.test(parsed.pathname) || imageRoutePattern.test(parsed.pathname)
  } catch {
    return false
  }
}

function decorateContent(text: string) {
  return text.replace(urlPattern, (url) => {
    if (!isImageUrl(url)) return url
    return `\n\n![](<${url}>)\n\n[查看原图](<${url}>)\n\n`
  })
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptySession(): ChatSession {
  return {
    id: createSessionId(),
    title: '新建聊天',
    messages: [],
  }
}

function formatSessionTitle(content: string) {
  const firstLine = content.split('\n').find((line) => line.trim()) || '新建聊天'
  return firstLine.trim().slice(0, 28) || '新建聊天'
}

const render = (text: string) => md.render(decorateContent(text || ''))

const models = useModelsStore()
const aiCode = ref('')
const model = ref('')
const stream = ref(true)

const sessions = ref<ChatSession[]>([createEmptySession()])
const currentSessionId = ref(sessions.value[0].id)
const input = ref('')
const sending = ref(false)
const listRef = ref<HTMLElement>()
let controller: AbortController | null = null

const currentSession = computed(
  () => sessions.value.find((session) => session.id === currentSessionId.value) || sessions.value[0],
)

const messages = computed<ChatMessage[]>({
  get: () => currentSession.value.messages,
  set: (value) => {
    currentSession.value.messages = value
  },
})

const canSend = computed(() => !!aiCode.value && !!model.value && !!input.value.trim())

onMounted(async () => {
  await models.load()
  if (models.aiCodes.length) {
    aiCode.value = models.aiCodes[0]
    onProviderChange()
  }
})

function onProviderChange() {
  const list = models.modelsOf(aiCode.value)
  model.value = list[0] || ''
}

async function scrollBottom() {
  await nextTick()
  listRef.value?.scrollTo({ top: listRef.value.scrollHeight })
}

function createSession() {
  if (sending.value) return
  const session = createEmptySession()
  sessions.value.unshift(session)
  currentSessionId.value = session.id
  input.value = ''
}

function selectSession(id: string) {
  if (sending.value || id === currentSessionId.value) return
  currentSessionId.value = id
  input.value = ''
  scrollBottom()
}

function clearCurrentSession() {
  if (sending.value) return
  const index = sessions.value.findIndex((session) => session.id === currentSessionId.value)
  if (index === -1) return

  sessions.value.splice(index, 1)

  if (!sessions.value.length) {
    const session = createEmptySession()
    sessions.value.push(session)
    currentSessionId.value = session.id
    input.value = ''
    return
  }

  const nextSession = sessions.value[index] || sessions.value[index - 1]
  currentSessionId.value = nextSession.id
  input.value = ''
}

async function send() {
  if (!canSend.value || sending.value) return

  const content = input.value.trim()
  messages.value.push({ role: 'user', content })
  if (currentSession.value.title === '新建聊天') {
    currentSession.value.title = formatSessionTitle(content)
  }

  input.value = ''
  messages.value.push({ role: 'assistant', content: '' })
  const assistantIndex = messages.value.length - 1
  sending.value = true
  await scrollBottom()

  const payload = {
    aiCode: aiCode.value,
    model: model.value,
    messages: messages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
  }

  try {
    if (stream.value) {
      controller = new AbortController()
      await postSse(
        '/chat/stream',
        payload,
        (event, data) => {
          if (event === 'chunk' && data && !data.done) {
            messages.value[assistantIndex].content += data.content || ''
            scrollBottom()
          }
        },
        controller.signal,
      )
    } else {
      const res = await chat(payload)
      messages.value[assistantIndex].content = res.content
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      messages.value[assistantIndex].content += '\n\n_(已停止)_'
    } else {
      ElMessage.error(e?.message || '请求失败')
    }
  } finally {
    sending.value = false
    controller = null
    await scrollBottom()
  }
}

function stop() {
  controller?.abort()
}
</script>

<style scoped>
.chat-shell {
  height: 100%;
  display: flex;
  gap: 0;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 65% 30%, rgba(214, 223, 243, 0.35), transparent 22%),
    radial-gradient(circle at 78% 82%, rgba(235, 220, 205, 0.28), transparent 20%),
    linear-gradient(180deg, #f8f5ef 0%, #fbf8f2 100%);
  box-shadow: inset 0 0 0 1px rgba(57, 48, 36, 0.05);
}

.conversation-panel {
  width: 272px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 14px 14px;
  border-right: 1px solid rgba(87, 72, 57, 0.08);
  background: rgba(252, 249, 243, 0.74);
  backdrop-filter: blur(8px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #181411;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn,
.attach-btn,
.send-btn,
.session-item {
  border: none;
  outline: none;
}

.icon-btn,
.attach-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: transparent;
  color: #352e28;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.icon-btn:hover:not(:disabled),
.attach-btn:hover:not(:disabled) {
  background: rgba(53, 46, 40, 0.08);
}

.icon-btn:disabled,
.session-item:disabled,
.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.session-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

.session-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  color: #1f1a16;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.session-item:hover:not(:disabled) {
  background: rgba(69, 56, 40, 0.05);
}

.session-item.active {
  background: rgba(69, 56, 40, 0.08);
}

.session-title {
  font-size: 14px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  font-size: 12px;
  color: #827768;
}

.panel-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 14px;
}

.side-select {
  width: 100%;
}

.side-select :deep(.el-select__wrapper) {
  min-height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 0 0 1px rgba(87, 72, 57, 0.08);
}

.chat-stage {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.messages {
  flex: 1;
  overflow: auto;
  padding: 34px 64px 18px;
}

.msg {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.msg.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.msg.user .avatar {
  background: #25211e;
}

.msg.assistant .avatar {
  background: #b5935a;
}

.bubble {
  max-width: min(760px, 78%);
  padding: 14px 16px;
  border-radius: 18px;
  line-height: 1.7;
  word-break: break-word;
  color: #221d18;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 30px rgba(65, 51, 35, 0.06);
}

.msg.user .bubble {
  background: #f1ebe1;
}

.bubble :deep(p) {
  margin: 4px 0;
}

.bubble :deep(a) {
  color: #7a5a2f;
  word-break: break-all;
}

.bubble :deep(img) {
  display: block;
  width: 100%;
  max-width: 420px;
  height: auto;
  margin: 8px 0;
  border-radius: 10px;
  background: #fff;
}

.bubble :deep(pre) {
  background: #1f2937;
  color: #f8f8f2;
  padding: 10px;
  border-radius: 8px;
  overflow: auto;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
}

.empty-state h1 {
  margin: 0 0 10px;
  font-size: 34px;
  line-height: 1.1;
  color: #171311;
}

.empty-state p {
  margin: 0;
  color: #74695e;
  font-size: 15px;
}

.composer-wrap {
  padding: 14px 22px 18px;
}

.composer {
  min-height: 56px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 28px;
  background: rgba(244, 236, 224, 0.78);
  box-shadow: inset 0 0 0 1px rgba(87, 72, 57, 0.05);
}

.attach-btn {
  flex-shrink: 0;
  margin-bottom: 2px;
}

.composer-input {
  flex: 1;
}

.composer-input :deep(.el-textarea__inner) {
  padding: 8px 0;
  border: none;
  box-shadow: none;
  background: transparent;
  color: #2c241e;
  line-height: 1.6;
}

.composer-input :deep(.el-textarea__inner::placeholder) {
  color: #938677;
}

.composer-side {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 8px;
}

.composer-model {
  width: 180px;
}

.composer-model :deep(.el-select__wrapper) {
  min-height: 38px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: inset 0 0 0 1px rgba(87, 72, 57, 0.08);
}

.send-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #151311;
  color: #fff;
  font-size: 14px;
}

.send-btn.sending {
  background: #7b241c;
}

@media (max-width: 960px) {
  .chat-shell {
    flex-direction: column;
    border-radius: 18px;
  }

  .conversation-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(87, 72, 57, 0.08);
  }

  .session-list {
    max-height: 180px;
  }

  .messages {
    padding: 24px 18px 12px;
  }

  .bubble {
    max-width: 88%;
  }

  .composer-wrap {
    padding: 12px;
  }

  .composer {
    border-radius: 22px;
  }

  .composer-side {
    gap: 8px;
  }

  .composer-model {
    width: 120px;
  }
}
</style>
