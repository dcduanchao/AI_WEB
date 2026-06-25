<template>
  <div class="image-page">
    <el-card shadow="never" class="form-card">
      <div class="row">
        <el-select v-model="aiCode" placeholder="选择提供商" style="width: 200px" @change="onProviderChange">
          <el-option v-for="code in models.aiCodes" :key="code" :label="code" :value="code" />
        </el-select>
        <el-select v-model="model" placeholder="选择模型" style="width: 240px" filterable>
          <el-option v-for="m in models.modelsOf(aiCode)" :key="m" :label="m" :value="m" />
        </el-select>
        <el-select v-model="size" style="width: 220px">
          <el-option v-for="option in sizes" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input-number v-model="count" :min="1" :max="4" />
      </div>
      <el-input v-model="prompt" type="textarea" :rows="3" resize="none" placeholder="描述你想生成的图片"
        style="margin-top: 12px" />
      <div class="actions">
        <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="submit">
          生成
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="result-card">
      <el-empty v-if="!items.length" description="暂无图片" />
      <div v-else class="grid">
        <div v-for="(item, i) in items" :key="i" class="slot" :class="`slot-${item.status}`">
          <div v-if="item.status === 'loading'" class="slot-state">
            <div class="spinner" />
            <div class="slot-title">生成中...</div>
          </div>
          <el-image v-else-if="item.status === 'success'" :src="item.url" :preview-src-list="previewUrls"
            :initial-index="getPreviewIndex(item.url)" fit="cover" class="img" />
          <div v-else class="slot-state">
            <div class="slot-title">生成失败</div>
            <div class="slot-message">{{ item.errorMessage }}</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useModelsStore } from '@/stores/models'
import { generateImage } from '@/api/image'

const models = useModelsStore()
const aiCode = ref('')
const model = ref('grok-imagine-image-lite')
const prompt = ref('')
const size = ref('1024x1024')
const count = ref(1)
const sizes = [
  { value: '1024x1024', label: '1:1 (1024*1024)' },
  { value: '1536x1024', label: '3:2 (1536*1024)' },
  { value: '1024x1536', label: '2:3 (1024*1536)' },
  { value: '1024x768', label: '4:3 (1024*768)' },
  { value: '768x1024', label: '3:4 (768*1024)' },
  { value: '1792x1024', label: '16:9 (1792*1024)' },
  { value: '1024x1792', label: '9:16 (1024*1792)' },
  { value: '2048x2048', label: '1:1(2k) (2048*2048)' },
  { value: '2048x1152', label: '16:9(2k) (2048*1152)' },
  { value: '1152x2048', label: '9:16(2k) (1152*2048)' },
  { value: '4096x2304', label: '16:9(4k) (4096*2304)' },
  { value: '2304x4096', label: '9:16(4k) (2304*4096)' }
]

const loading = ref(false)
type ImageItem = {
  status: 'loading' | 'success' | 'error'
  url: string
  errorMessage: string
}

const items = ref<ImageItem[]>([])

const canSubmit = computed(() => !!aiCode.value && !!model.value && !!prompt.value.trim())
const previewUrls = computed(() => items.value.filter((item) => item.status === 'success').map((item) => item.url))

onMounted(async () => {
  await models.load()
  if (models.aiCodes.length) {
    aiCode.value = models.aiCodes[0]
    onProviderChange()
  }
})

function onProviderChange() {
  const providerModels = models.modelsOf(aiCode.value)
  const imageModel = providerModels.find((item) => item.toLowerCase().includes('image'))
  model.value = imageModel || providerModels[0] || ''
}

function getPreviewIndex(url: string) {
  return previewUrls.value.indexOf(url)
}

function setItem(index: number, item: ImageItem) {
  items.value[index] = item
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
    const successCount = results.filter(Boolean).length
    const failedCount = results.length - successCount

    if (successCount && failedCount) {
      ElMessage.warning(`成功 ${successCount} 张，失败 ${failedCount} 次`)
    } else if (!successCount) {
      ElMessage.error('全部生成失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.image-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.result-card {
  min-height: 300px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.slot {
  width: 100%;
  height: 220px;
  border-radius: 8px;
  overflow: hidden;
  background: #f4f4f5;
  border: 1px solid #e4e7ed;
}

.slot-state {
  width: 100%;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
}

.slot-loading {
  background: #f8fafc;
}

.slot-error {
  background: #fff5f5;
  border-color: #fbc4c4;
}

.slot-title {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.slot-message {
  font-size: 12px;
  line-height: 1.5;
  color: #f56c6c;
  word-break: break-word;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #dcdfe6;
  border-top-color: #409eff;
  animation: spin 0.8s linear infinite;
}

.img {
  width: 100%;
  height: 220px;
  background: #f4f4f5;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
