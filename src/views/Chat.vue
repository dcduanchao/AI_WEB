<template>
  <div class="chat">
    <el-card class="toolbar" shadow="never">
      <div class="row">
        <el-select
          v-model="aiCode"
          placeholder="选择提供商"
          style="width: 200px"
          @change="onProviderChange"
        >
          <el-option v-for="code in models.aiCodes" :key="code" :label="code" :value="code" />
        </el-select>
        <el-select v-model="model" placeholder="选择模型" style="width: 240px" filterable>
          <el-option v-for="m in models.modelsOf(aiCode)" :key="m" :label="m" :value="m" />
        </el-select>
        <span class="label">温度</span>
        <el-slider v-model="temperature" :min="0" :max="1" :step="0.1" style="width: 140px" />
        <el-switch v-model="stream" active-text="流式" inline-prompt style="margin-left: 8px" />
        <div class="spacer" />
        <el-button @click="clearChat" :disabled="sending">清空</el-button>
      </div>
    </el-card>

    <div class="messages" ref="listRef">
      <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
        <div class="avatar">{{ m.role === 'user' ? '我' : 'AI' }}</div>
        <div class="bubble" v-html="render(m.content)"></div>
      </div>
      <el-empty v-if="!messages.length" description="开始对话吧" />
    </div>

    <el-card class="composer" shadow="never">
      <el-input
        v-model="input"
        type="textarea"
        :rows="3"
        resize="none"
        placeholder="输入消息，Ctrl/⌘ + Enter 发送"
        @keydown.enter.exact.prevent="onEnter"
        @keydown.ctrl.enter.prevent="send"
        @keydown.meta.enter.prevent="send"
      />
      <div class="actions">
        <el-button v-if="sending" type="danger" @click="stop">停止生成</el-button>
        <el-button type="primary" :loading="sending && !stream" :disabled="!canSend" @click="send">
          发送
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import { useModelsStore } from '@/stores/models'
import { chat } from '@/api/chat'
import { postSse } from '@/utils/sse'
import type { ChatMessage } from '@/api/types'

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

const render = (text: string) => md.render(decorateContent(text || ''))

const models = useModelsStore()
const aiCode = ref('')
const model = ref('')
const temperature = ref(0.9)
const stream = ref(true)

const messages = ref<ChatMessage[]>([])
const input = ref('')
const sending = ref(false)
const listRef = ref<HTMLElement>()
let controller: AbortController | null = null

const canSend = computed(() => !!aiCode.value && !!model.value && !!input.value.trim() && !sending.value)

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

function onEnter() {
  input.value += '\n'
}

async function scrollBottom() {
  await nextTick()
  listRef.value?.scrollTo({ top: listRef.value.scrollHeight })
}

async function send() {
  if (!canSend.value) return

  const content = input.value.trim()
  messages.value.push({ role: 'user', content })
  input.value = ''
  messages.value.push({ role: 'assistant', content: '' })
  const assistantIndex = messages.value.length - 1
  sending.value = true
  await scrollBottom()

  const payload = {
    aiCode: aiCode.value,
    model: model.value,
    messages: messages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    temperature: temperature.value,
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

function clearChat() {
  messages.value = []
}
</script>

<style scoped>
.chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar :deep(.el-card__body) {
  padding: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.label {
  color: #606266;
  font-size: 13px;
}

.spacer {
  flex: 1;
}

.messages {
  flex: 1;
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.msg {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
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
  color: #fff;
  flex-shrink: 0;
  font-size: 13px;
}

.msg.user .avatar {
  background: #4f6df5;
}

.msg.assistant .avatar {
  background: #67c23a;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f4f4f5;
  line-height: 1.6;
  word-break: break-word;
}

.msg.user .bubble {
  background: #ecf2ff;
}

.bubble :deep(p) {
  margin: 4px 0;
}

.bubble :deep(a) {
  color: #4f6df5;
  word-break: break-all;
}

.bubble :deep(img) {
  display: block;
  width: 100%;
  max-width: 420px;
  height: auto;
  margin: 8px 0;
  border-radius: 8px;
  background: #fff;
}

.bubble :deep(pre) {
  background: #1f2937;
  color: #f8f8f2;
  padding: 10px;
  border-radius: 6px;
  overflow: auto;
}

.composer :deep(.el-card__body) {
  padding: 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
