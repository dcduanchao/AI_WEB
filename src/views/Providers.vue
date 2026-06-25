<template>
  <div class="providers">
    <el-alert
      title="提供商的新增 / 编辑 / 删除需后端补充 CRUD 接口（见 FRONTEND.md）。当前为只读 + 同步模式。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    />

    <el-card shadow="never">
      <div class="bar">
        <span class="count">共 {{ rows.length }} 个已启用提供商</span>
        <div class="spacer" />
        <el-button :disabled="true" title="需后端支持">新增</el-button>
        <el-button type="primary" :loading="syncingAll" @click="onSyncAll">同步全部</el-button>
        <el-button :loading="models.loading" @click="reload">刷新</el-button>
      </div>

      <el-table :data="rows" v-loading="models.loading" border style="width: 100%">
        <el-table-column prop="aiCode" label="提供商 (aiCode)" min-width="180" />
        <el-table-column label="模型数" width="100" align="center">
          <template #default="{ row }">
            <el-tag>{{ row.modelCount }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="模型列表" min-width="320">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag v-for="m in row.models" :key="m" type="info" size="small">{{ m }}</el-tag>
              <span v-if="!row.models.length" class="muted">—</span>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              :loading="syncing === row.aiCode"
              @click="onSync(row.aiCode)"
            >
              同步模型
            </el-button>
            <el-button size="small" :disabled="true" title="需后端支持">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useModelsStore } from '@/stores/models'
import { syncProvider, syncAll } from '@/api/provider'

const models = useModelsStore()
const syncing = ref('')
const syncingAll = ref(false)

const rows = computed(() =>
  models.aiCodes.map((aiCode) => {
    const list = models.modelsOf(aiCode)
    return { aiCode, modelCount: list.length, models: list }
  }),
)

onMounted(() => models.load())

function reload() {
  return models.load(true)
}

async function onSync(aiCode: string) {
  syncing.value = aiCode
  try {
    const res = await syncProvider(aiCode)
    ElMessage.success(`同步完成：${res.aiCode} 共 ${res.modelCount} 个模型`)
    await models.load(true)
  } finally {
    syncing.value = ''
  }
}

async function onSyncAll() {
  syncingAll.value = true
  try {
    const res = await syncAll()
    const total = Array.isArray(res) ? res.reduce((s, r) => s + (r.modelCount || 0), 0) : 0
    ElMessage.success(`已同步全部，合计 ${total} 个模型`)
    await models.load(true)
  } finally {
    syncingAll.value = false
  }
}
</script>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.count {
  color: #606266;
  font-size: 13px;
}
.spacer {
  flex: 1;
}
.muted {
  color: #c0c4cc;
}
</style>
