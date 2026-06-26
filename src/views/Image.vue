<template>
  <div class="image-workbench">
    <section class="hero panel">
      <div class="hero-main">
        <div class="hero-brand">
          <div class="brand-mark">
            <el-icon><PictureRounded /></el-icon>
          </div>
          <div>
            <div class="brand-name">生图工作台</div>
            <div class="brand-subtitle">在当前后台结构中使用更接近参考图的生图工作流。</div>
          </div>
        </div>
      </div>

      <div class="hero-actions">
        <el-button round plain>
          <el-icon><Picture /></el-icon>
          图库
        </el-button>
        <el-button round plain>
          <el-icon><Collection /></el-icon>
          提示词库
        </el-button>
        <el-button round type="success" @click="createSession">
          <el-icon><Plus /></el-icon>
          新建会话
        </el-button>
      </div>
    </section>

    <section class="workbench-grid">
      <div v-if="isMobile" class="mobile-panels">
        <button class="mobile-panel-btn" type="button" @click="conversationOpen = !conversationOpen">
          {{ conversationOpen ? '隐藏会话' : '显示会话' }}
        </button>
        <button class="mobile-panel-btn" type="button" @click="configOpen = !configOpen">
          {{ configOpen ? '隐藏参数' : '显示参数' }}
        </button>
      </div>

      <aside v-show="!isMobile || conversationOpen" class="conversation panel">
        <div class="panel-title">会话</div>
        <div class="conversation-list">
          <button
            v-for="session in sessions"
            :key="session.id"
            type="button"
            class="conversation-item"
            :class="{ active: activeSessionId === session.id }"
            @click="selectSession(session.id)"
          >
            <div class="conversation-text">
              <div class="conversation-name">{{ session.title }}</div>
              <div class="conversation-desc">{{ session.subtitle || '空会话' }}</div>
            </div>
            <div class="conversation-side">
              <span v-if="session.id === activeSessionId" class="active-dot" />
              <el-icon class="trash-icon" @click.stop="removeSession(session.id)"><Delete /></el-icon>
            </div>
          </button>
        </div>
        <div v-if="!sessions.length" class="conversation-empty">点击右上角“新建会话”开始。</div>
      </aside>

      <main class="workspace">
        <section class="prompt panel">
          <div class="prompt-header">
            <div class="prompt-tags">
              <span class="tag tag-accent">文生图</span>
              <span class="tag tag-info">{{ currentSizeLabel }}</span>
              <span v-if="hasSuccess" class="tag tag-muted">已保存</span>
            </div>
            <div class="prompt-tools">
              <el-button round plain :loading="inspiring" :disabled="!canInspire" @click="handleInspirePrompt">
                <el-icon><Opportunity /></el-icon>
                灵感提示词
              </el-button>
              <el-button round plain :loading="enriching" :disabled="!canEnrich" @click="handleEnhancePrompt">
                <el-icon><MagicStick /></el-icon>
                丰富提示词
              </el-button>
              <el-button round plain @click="clearAll">
                <el-icon><Close /></el-icon>
                清空
              </el-button>
            </div>
          </div>

          <div class="prompt-box">
            <el-input
              v-model="prompt"
              type="textarea"
              resize="none"
              :rows="5"
              placeholder="输入提示词，例如：a cinematic white cat sitting by a rainy window"
            />

            <div class="prompt-footer">
              <button type="button" class="upload-trigger">
                <el-icon><Plus /></el-icon>
              </button>

              <el-button
                type="success"
                round
                class="generate-btn"
                :loading="loading"
                :disabled="!canSubmit"
                @click="submit"
              >
                <el-icon><MagicStick /></el-icon>
                继续生成
              </el-button>
            </div>
          </div>
        </section>

        <section class="workspace-panel panel">
          <div class="workspace-header">
            <div class="workspace-title">
              <el-icon><Picture /></el-icon>
              当前工作区
            </div>
            <div class="workspace-stats">
              <span v-if="loading" class="stat-chip stat-running">
                正在生成 {{ pendingCount }} 项 · 已耗时 {{ elapsedSeconds }}s
              </span>
              <span class="stat-chip">共 {{ items.length }} 条</span>
              <span class="stat-chip stat-success">成功 {{ successCount }}</span>
              <span class="stat-chip stat-error">失败 {{ errorCount }}</span>
              <span class="stat-chip stat-info">生成中 {{ pendingCount }}</span>
            </div>
          </div>

          <div v-if="!items.length" class="empty-workspace">
            <div class="empty-illustration" />
            <div class="empty-title">还没有生成结果</div>
            <div class="empty-text">输入提示词后开始生成，结果会显示在这里。</div>
          </div>

          <div v-else class="results-grid">
            <article
              v-for="(item, index) in items"
              :key="`${item.status}-${item.url}-${index}`"
              class="result-card"
              :class="`result-${item.status}`"
            >
              <template v-if="item.status === 'loading'">
                <div class="result-loading">
                  <div class="loading-sheen" />
                  <div class="loading-main">生成中</div>
                  <div class="loading-time">已耗时 {{ elapsedSeconds }}s</div>
                  <el-button text class="cancel-btn" @click="clearAll">清空</el-button>
                </div>
              </template>

              <template v-else-if="item.status === 'success'">
                <el-image
                  :src="item.url"
                  :preview-src-list="previewUrls"
                  :initial-index="getPreviewIndex(item.url)"
                  fit="cover"
                  class="result-image"
                />
                <div class="result-overlay">
                  <span>#{{
                    index + 1
                  }}</span>
                  <span>{{ model }}</span>
                </div>
              </template>

              <template v-else>
                <div class="result-error-box">
                  <div class="loading-main">生成失败</div>
                  <div class="error-message">{{ item.errorMessage }}</div>
                </div>
              </template>
            </article>
          </div>

          <div class="workspace-footer">
            <div class="pager">
              <el-button round plain size="small" :disabled="true">上一页</el-button>
              <span>1 / 1</span>
              <el-button round plain size="small" :disabled="true">下一页</el-button>
            </div>
            <el-select model-value="30 / 页" size="small" style="width: 110px">
              <el-option label="30 / 页" value="30 / 页" />
            </el-select>
          </div>
        </section>
      </main>

      <aside v-show="!isMobile || configOpen" class="sidebar">
        <section class="panel side-card">
          <div class="side-card-header">
            <div class="panel-title">服务配置</div>
            <span class="status-badge">已配置</span>
          </div>

          <div class="field">
            <label>服务商</label>
            <el-select v-model="aiCode" placeholder="选择提供商" @change="onProviderChange">
              <el-option v-for="code in models.aiCodes" :key="code" :label="code" :value="code" />
            </el-select>
          </div>
          <div class="field">
            <label>生图模型</label>
            <el-select v-model="model" filterable>
              <el-option v-for="m in providerModels" :key="m" :label="m" :value="m" />
            </el-select>
          </div>
          <div class="field">
            <label>提示词助手模型</label>
            <el-select v-model="promptModel" filterable>
              <el-option v-for="m in providerModels" :key="m" :label="m" :value="m" />
            </el-select>
          </div>

          <el-button type="success" class="save-btn" plain>保存服务配置</el-button>
        </section>

        <section class="panel side-card">
          <div class="panel-title">当前会话参数</div>

          <div class="field">
            <label>图片比例</label>
            <div class="ratio-grid">
              <button
                v-for="option in sizes"
                :key="option.value"
                type="button"
                class="ratio-item"
                :class="{ active: size === option.value }"
                @click="size = option.value"
              >
                {{ option.ratio }}
              </button>
            </div>
          </div>

          <div class="field">
            <label>分辨率</label>
            <el-select v-model="size">
              <el-option v-for="option in sizes" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </div>

          <div class="field">
            <label>质量</label>
            <div class="quality-row">
              <button
                v-for="option in qualityOptions"
                :key="option"
                type="button"
                class="quality-item"
                :class="{ active: quality === option }"
                @click="quality = option"
              >
                {{ option }}
              </button>
            </div>
          </div>

          <div class="field">
            <label>生成数量</label>
            <el-input-number v-model="count" :min="1" :max="10" style="width: 100%" />
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useModelsStore } from '@/stores/models'
import { generateImage } from '@/api/image'
import { chat } from '@/api/chat'

type ImageItem = {
  status: 'loading' | 'success' | 'error'
  url: string
  errorMessage: string
}

type SessionItem = {
  id: string
  title: string
  subtitle: string
  prompt: string
}

const models = useModelsStore()
const aiCode = ref('')
const model = ref('grok-imagine-image-lite')
const promptModel = ref('')
const prompt = ref('')
const size = ref('1024x1024')
const count = ref(1)
const quality = ref('自动')
const qualityOptions = ['自动', '低', '中', '高']
const loading = ref(false)
const enriching = ref(false)
const inspiring = ref(false)
const items = ref<ImageItem[]>([])
const elapsedSeconds = ref(0)
const activeSessionId = ref('')
const sessions = ref<SessionItem[]>([])
const isMobile = ref(false)
const conversationOpen = ref(false)
const configOpen = ref(false)

const timer = ref<number | null>(null)
const sizes = [
  { value: '1024x1024', ratio: '1:1', label: '标准 1024x1024' },
  { value: '1536x1024', ratio: '3:2', label: '宽幅 1536x1024' },
  { value: '1024x1536', ratio: '2:3', label: '竖构图 1024x1536' },
  { value: '1024x768', ratio: '4:3', label: '经典 1024x768' },
  { value: '768x1024', ratio: '3:4', label: '经典 768x1024' },
  { value: '1792x1024', ratio: '16:9', label: '影院 1792x1024' },
  { value: '1024x1792', ratio: '9:16', label: '短视频 1024x1792' },
  { value: '2048x2048', ratio: '1:1', label: '2K 2048x2048' },
  { value: '2048x1152', ratio: '16:9', label: '2K 2048x1152' },
  { value: '1152x2048', ratio: '9:16', label: '2K 1152x2048' },
  { value: '4096x2304', ratio: '21:9', label: '4K 4096x2304' },
]

const canSubmit = computed(() => !!aiCode.value && !!model.value && !!prompt.value.trim())
const canEnrich = computed(() => !!aiCode.value && !!promptModel.value && !!prompt.value.trim() && !enriching.value)
const canInspire = computed(() => !!aiCode.value && !!promptModel.value && !inspiring.value)
const providerModels = computed(() => models.modelsOf(aiCode.value))
const previewUrls = computed(() => items.value.filter((item) => item.status === 'success').map((item) => item.url))
const successCount = computed(() => items.value.filter((item) => item.status === 'success').length)
const errorCount = computed(() => items.value.filter((item) => item.status === 'error').length)
const pendingCount = computed(() => items.value.filter((item) => item.status === 'loading').length)
const hasSuccess = computed(() => successCount.value > 0)
const currentSizeLabel = computed(() => sizes.find((item) => item.value === size.value)?.label || size.value)

onMounted(async () => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  await models.load()
  if (models.aiCodes.length) {
    aiCode.value = models.aiCodes[0]
    onProviderChange()
  }
  createSession()
})

onBeforeUnmount(() => {
  stopTimer()
  window.removeEventListener('resize', syncViewport)
})

watch(
  () => prompt.value.trim(),
  (value) => {
    const current = getCurrentSession()
    if (!current) return
    current.prompt = prompt.value
    current.title = formatSessionTitle(value)
    current.subtitle = value ? formatSessionSubtitle(value) : '空会话'
  },
)

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function syncViewport() {
  isMobile.value = window.innerWidth <= 980
  if (!isMobile.value) {
    conversationOpen.value = true
    configOpen.value = true
  }
}

function formatSessionTitle(value: string) {
  if (!value) return '新会话'
  return value.length > 14 ? `${value.slice(0, 14)}...` : value
}

function formatSessionSubtitle(value: string) {
  return value.length > 22 ? `${value.slice(0, 22)}...` : value
}

function getCurrentSession() {
  return sessions.value.find((session) => session.id === activeSessionId.value)
}

function createSession() {
  const session: SessionItem = {
    id: createSessionId(),
    title: '新会话',
    subtitle: '空会话',
    prompt: '',
  }
  sessions.value.unshift(session)
  activeSessionId.value = session.id
  prompt.value = ''
  items.value = []
  stopTimer()
  elapsedSeconds.value = 0
}

function selectSession(id: string) {
  const session = sessions.value.find((item) => item.id === id)
  if (!session) return
  activeSessionId.value = id
  prompt.value = session.prompt
  items.value = []
  stopTimer()
  elapsedSeconds.value = 0
}

function removeSession(id: string) {
  const index = sessions.value.findIndex((item) => item.id === id)
  if (index === -1) return
  sessions.value.splice(index, 1)

  if (!sessions.value.length) {
    createSession()
    return
  }

  if (activeSessionId.value === id) {
    const nextSession = sessions.value[index] || sessions.value[index - 1]
    activeSessionId.value = nextSession.id
    prompt.value = nextSession.prompt
    items.value = []
  }
}

function onProviderChange() {
  const imageModel = providerModels.value.find((item) => item.toLowerCase().includes('image'))
  const textModel =
    providerModels.value.find((item) => {
      const lower = item.toLowerCase()
      return lower.includes('gpt') || lower.includes('chat') || lower.includes('text')
    }) || providerModels.value[0] || ''

  model.value = imageModel || providerModels.value[0] || ''
  promptModel.value = textModel
}

function getPreviewIndex(url: string) {
  return previewUrls.value.indexOf(url)
}

function setItem(index: number, item: ImageItem) {
  items.value[index] = item
}

function startTimer() {
  stopTimer()
  elapsedSeconds.value = 0
  timer.value = window.setInterval(() => {
    elapsedSeconds.value += 1
  }, 1000)
}

function stopTimer() {
  if (timer.value !== null) {
    window.clearInterval(timer.value)
    timer.value = null
  }
}

function clearAll() {
  prompt.value = ''
  items.value = []
  stopTimer()
  elapsedSeconds.value = 0
  const current = getCurrentSession()
  if (current) {
    current.prompt = ''
    current.title = '新会话'
    current.subtitle = '空会话'
  }
}

async function handleEnhancePrompt() {
  const currentPrompt = prompt.value.trim()
  if (!currentPrompt || !aiCode.value || !promptModel.value || enriching.value) return

  enriching.value = true
  try {
    const res = await chat({
      aiCode: aiCode.value,
      model: promptModel.value,
      messages: [
        {
          role: 'system',
          content:
            '你是一个有帮助提示词生成助手 帮助用户扩展提示词，规则如下：1.请丰富并优化下面的图像生成提示词,2.保持用户原意和核心主体不变,3.补充视觉细节、镜头/构图、材质、光影、风格描述,4.只输出优化后的提示词正文(最多300字)，不要解释，不要加标题 5.跟随原提示词语言输出',
        },
        {
          role: 'user',
          content: currentPrompt,
        },
      ],
    })

    prompt.value = (res.content || '').trim() || currentPrompt
    ElMessage.success('提示词已丰富')
  } finally {
    enriching.value = false
  }
}

async function handleInspirePrompt() {
  if (!aiCode.value || !promptModel.value || inspiring.value) return

  inspiring.value = true
  try {
    const res = await chat({
      aiCode: aiCode.value,
      model: promptModel.value,
      messages: [
        {
          role: 'system',
          content: [
            '请生成一条可直接用于图像生成的中文提示词。',
            '提示词需要包含主体、场景、构图、光线、风格、细节与氛围。',
            '只输出提示词正文，不要解释，不要加标题。',
          ].join(''),
        },
        {
          role: 'user',
          content: prompt.value.trim() || '请给我一条高质量、细节丰富、适合直接生图的中文提示词。',
        },
      ],
    })

    prompt.value = (res.content || '').trim()
    ElMessage.success('已生成灵感提示词')
  } finally {
    inspiring.value = false
  }
}

async function generateOne(index: number, payload: Parameters<typeof generateImage>[0]) {
  try {
    const res = await generateImage(payload)
    const firstUrl = res.urls?.[0]

    if (res.status === 'success' && firstUrl) {
      setItem(index, { status: 'success', url: firstUrl, errorMessage: '' })
      return true
    }

    setItem(index, {
      status: 'error',
      url: '',
      errorMessage: res.errorMessage || '未返回图片',
    })
    return false
  } catch (error) {
    setItem(index, {
      status: 'error',
      url: '',
      errorMessage: error instanceof Error ? error.message : '生成失败',
    })
    return false
  }
}

async function submit() {
  if (!canSubmit.value) return

  const selectedCount = count.value
  const trimmedPrompt = prompt.value.trim()
  loading.value = true
  startTimer()
  items.value = Array.from({ length: selectedCount }, () => ({
    status: 'loading',
    url: '',
    errorMessage: '',
  }))

  try {
    const requests = Array.from({ length: selectedCount }, (_, index) =>
      generateOne(index, {
        aiCode: aiCode.value,
        model: model.value,
        prompt: trimmedPrompt,
        size: size.value,
        count: 1,
      }),
    )
    const results = await Promise.all(requests)
    const ok = results.filter(Boolean).length
    const failed = results.length - ok

    if (ok && failed) {
      ElMessage.warning(`成功 ${ok} 张，失败 ${failed} 次`)
    } else if (!ok) {
      ElMessage.error('全部生成失败')
    } else {
      ElMessage.success(`成功生成 ${ok} 张图片`)
    }
  } finally {
    loading.value = false
    stopTimer()
  }
}
</script>

<style scoped>
.image-workbench {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #1f2937;
  min-height: 100%;
  padding: 4px;
  background:
    radial-gradient(circle at top left, rgba(214, 247, 232, 0.6), transparent 20%),
    linear-gradient(180deg, #f4fbf7 0%, #eef6f2 100%);
  border-radius: 28px;
}

.panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #dfeee8;
  border-radius: 20px;
  box-shadow: 0 18px 45px rgba(28, 76, 62, 0.08);
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 18px;
  background:
    radial-gradient(circle at top left, rgba(213, 247, 232, 0.95), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 253, 251, 0.98));
}

.hero-main {
  flex: 1;
  min-width: 0;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 160px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #17a673;
  background: linear-gradient(135deg, #e7fff5, #f6fffc);
  font-size: 20px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
}

.brand-subtitle {
  margin-top: 4px;
  color: #6c7c75;
  font-size: 13px;
}

.workbench-grid {
  display: grid;
  grid-template-columns: 228px minmax(0, 1fr) 300px;
  gap: 14px;
  min-height: calc(100vh - 240px);
  flex: 1;
}

.mobile-panels {
  display: none;
}

.mobile-panel-btn {
  border: 1px solid #cfe4db;
  background: rgba(255, 255, 255, 0.94);
  color: #245443;
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 13px;
}

.conversation,
.side-card {
  padding: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 14px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conversation-empty {
  padding: 18px 12px;
  color: #7b8b84;
  font-size: 13px;
}

.conversation-item {
  width: 100%;
  padding: 14px 12px;
  border-radius: 14px;
  border: 1px solid #deebe6;
  background: #fff;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.conversation-item.active {
  background: linear-gradient(135deg, #eefcf6, #fbfffd);
  border-color: #9ad7bf;
}

.conversation-text {
  min-width: 0;
}

.conversation-name,
.conversation-desc {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.conversation-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
}

.conversation-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.conversation-side {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #a0a8b3;
}

.active-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #56c39b;
}

.trash-icon {
  font-size: 14px;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  overflow: hidden;
}

.prompt,
.workspace-panel {
  padding: 16px;
}

.prompt-header,
.workspace-header,
.side-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prompt-tags,
.prompt-tools,
.workspace-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag,
.stat-chip,
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.tag-accent {
  color: #169d6d;
  background: #eafaf3;
}

.tag-info,
.stat-info {
  color: #3b82f6;
  background: #ebf4ff;
}

.tag-muted,
.stat-chip {
  color: #6b7280;
  background: #f5f7f8;
}

.stat-running {
  color: #2b7fff;
  background: #edf5ff;
}

.stat-success,
.status-badge {
  color: #139f6d;
  background: #e8faf3;
}

.stat-error {
  color: #e05667;
  background: #fff0f3;
}

.prompt-box {
  margin-top: 12px;
  border: 1px solid #b7e0d0;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff, #fcfffd);
}

.prompt-box :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  min-height: 140px !important;
  padding: 18px 20px;
  font-size: 20px;
  line-height: 1.55;
  color: #2f3c46;
}

.prompt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 14px;
}

.upload-trigger {
  width: 34px;
  height: 34px;
  border: 1px solid #cfe4db;
  border-radius: 10px;
  background: #fff;
  color: #6f8d82;
  cursor: pointer;
}

.generate-btn {
  min-width: 128px;
}

.workspace-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
}

.empty-workspace {
  min-height: 320px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #70818b;
}

.empty-illustration {
  width: 170px;
  height: 120px;
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(129, 216, 183, 0.16), rgba(112, 179, 255, 0.14)),
    #f6fbf9;
  border: 1px dashed #d9ebe3;
}

.empty-title {
  margin-top: 18px;
  font-size: 18px;
  font-weight: 700;
  color: #364152;
}

.empty-text {
  margin-top: 8px;
  font-size: 13px;
}

.results-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.result-card {
  position: relative;
  min-height: 272px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #e7efeb;
  background: linear-gradient(180deg, #fbfffd, #f7faf9);
}

.result-loading,
.result-error-box {
  min-height: 272px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.loading-sheen {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(243, 247, 246, 0.9) 0%, rgba(230, 244, 236, 0.9) 34%, rgba(243, 247, 246, 0.9) 100%);
}

.loading-main,
.loading-time,
.cancel-btn,
.error-message {
  position: relative;
  z-index: 1;
}

.loading-main {
  align-self: center;
  margin-bottom: auto;
  margin-top: auto;
  font-size: 28px;
  font-weight: 700;
  color: #37594e;
}

.loading-time {
  font-size: 13px;
  color: #5b6f67;
}

.cancel-btn {
  align-self: flex-end;
  color: #4f7667;
}

.result-image {
  width: 100%;
  height: 272px;
  display: block;
}

.result-overlay {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  background: linear-gradient(180deg, rgba(18, 22, 25, 0.15), rgba(18, 22, 25, 0.58));
}

.result-error {
  border-color: #f1c5cc;
  background: linear-gradient(180deg, #fff8f8, #fff3f4);
}

.error-message {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #cb4d61;
  word-break: break-word;
}

.workspace-footer {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.pager {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #68757f;
  font-size: 13px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  margin-top: 14px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #5e6d78;
}

.readonly-box {
  width: 100%;
  min-height: 42px;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid #dbe8e2;
  background: #fff;
  color: #2f3d49;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-all;
}

.save-btn {
  width: 100%;
  margin-top: 16px;
}

.ratio-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.ratio-item,
.quality-item {
  height: 36px;
  border: 1px solid #dbe7e2;
  border-radius: 12px;
  background: #fff;
  color: #5e6d78;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ratio-item.active,
.quality-item.active {
  border-color: #9cd3be;
  color: #169d6d;
  background: #eefcf6;
  box-shadow: inset 0 0 0 1px rgba(22, 157, 109, 0.06);
}

.quality-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.side-card :deep(.el-select),
.side-card :deep(.el-input-number) {
  width: 100%;
}

@media (max-width: 1320px) {
  .workbench-grid {
    grid-template-columns: 200px minmax(0, 1fr);
  }

  .sidebar {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .hero,
  .hero-actions,
  .hero-brand,
  .prompt-header,
  .workspace-header,
  .side-card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .mobile-panels {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .conversation {
    order: 2;
  }

  .sidebar {
    order: 3;
    grid-template-columns: 1fr;
  }

  .prompt-box :deep(.el-textarea__inner) {
    font-size: 20px;
    min-height: 110px !important;
  }
}

@media (max-width: 640px) {
  .image-workbench {
    padding: 0;
    border-radius: 20px;
  }

  .hero,
  .conversation,
  .prompt,
  .workspace-panel,
  .side-card {
    padding: 12px;
  }

  .prompt-box :deep(.el-textarea__inner) {
    font-size: 16px;
    min-height: 96px !important;
    padding: 14px;
  }

  .prompt-footer,
  .workspace-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .generate-btn,
  .pager {
    width: 100%;
    justify-content: center;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .ratio-grid,
  .quality-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
