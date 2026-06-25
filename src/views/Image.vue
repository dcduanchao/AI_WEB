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
        <el-select v-model="size" style="width: 150px">
          <el-option v-for="s in sizes" :key="s" :label="s" :value="s" />
        </el-select>
        <el-input-number v-model="count" :min="1" :max="4" />
      </div>
      <el-input
        v-model="prompt"
        type="textarea"
        :rows="3"
        resize="none"
        placeholder="描述你想生成的图片"
        style="margin-top: 12px"
      />
      <div class="actions">
        <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="submit">
          生成
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="result-card" v-loading="loading">
      <el-empty v-if="!urls.length" description="暂无图片" />
      <div v-else class="grid">
        <el-image
          v-for="(u, i) in urls"
          :key="i"
          :src="u"
          :preview-src-list="urls"
          :initial-index="i"
          fit="cover"
          class="img"
        />
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
const model = ref('')
const prompt = ref('')
const size = ref('1024x1024')
const count = ref(1)
const sizes = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']

const loading = ref(false)
const urls = ref<string[]>([])

const canSubmit = computed(() => !!aiCode.value && !!model.value && !!prompt.value.trim())

onMounted(async () => {
  await models.load()
  if (models.aiCodes.length) {
    aiCode.value = models.aiCodes[0]
    onProviderChange()
  }
})

function onProviderChange() {
  model.value = models.modelsOf(aiCode.value)[0] || ''
}

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  urls.value = []
  try {
    const res = await generateImage({
      aiCode: aiCode.value,
      model: model.value,
      prompt: prompt.value.trim(),
      size: size.value,
      count: count.value,
    })
    if (res.status === 'success') {
      urls.value = res.urls || []
      if (!urls.value.length) ElMessage.warning('未返回图片')
    } else {
      ElMessage.error(res.errorMessage || '生成失败')
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
.img {
  width: 100%;
  height: 220px;
  border-radius: 8px;
  background: #f4f4f5;
}
</style>
