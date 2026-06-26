<template>
  <el-container class="layout">
    <el-aside v-if="!isMobile" width="210px" class="aside">
      <div class="logo">AI 控制台</div>
      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>对话</span>
        </el-menu-item>
        <el-menu-item index="/image">
          <el-icon><Picture /></el-icon>
          <span>生图</span>
        </el-menu-item>
        <el-menu-item index="/providers">
          <el-icon><Setting /></el-icon>
          <span>提供商管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <button v-if="isMobile" class="menu-toggle" type="button" @click="menuOpen = true">
            <el-icon><Operation /></el-icon>
          </button>
          <div class="title">{{ pageTitle }}</div>
        </div>
        <el-dropdown @command="onCommand">
          <span class="user">
            <el-icon><UserFilled /></el-icon>
            {{ auth.user?.nickname || auth.user?.username || '未登录' }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-drawer v-model="menuOpen" direction="ltr" size="210px" :with-header="false" class="mobile-drawer">
    <div class="logo">AI 控制台</div>
    <el-menu :default-active="activeMenu" router class="menu mobile-menu" @select="menuOpen = false">
      <el-menu-item index="/chat">
        <el-icon><ChatDotRound /></el-icon>
        <span>对话</span>
      </el-menu-item>
      <el-menu-item index="/image">
        <el-icon><Picture /></el-icon>
        <span>生图</span>
      </el-menu-item>
      <el-menu-item index="/providers">
        <el-icon><Setting /></el-icon>
        <span>提供商管理</span>
      </el-menu-item>
    </el-menu>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ChatDotRound, Operation, Picture, Setting, UserFilled } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => (route.meta.title as string) || '')
const isMobile = ref(false)
const menuOpen = ref(false)

function syncViewport() {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    menuOpen.value = false
  }
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

async function onCommand(cmd: string) {
  if (cmd === 'logout') {
    await ElMessageBox.confirm('确认退出登录？', '提示', { type: 'warning' })
    auth.logout()
    router.replace('/login')
  }
}
</script>

<style scoped>
.layout {
  height: 100%;
}
.aside {
  background: #1f2937;
  color: #fff;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.menu {
  flex: 1;
  border-right: none;
  background: #1f2937;
}
.menu :deep(.el-menu-item) {
  color: #cbd5e1;
}
.menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: #374151;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  gap: 12px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.menu-toggle {
  width: 38px;
  height: 38px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #fff;
  color: #303133;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.title {
  font-size: 16px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #303133;
  min-width: 0;
  white-space: nowrap;
}
.main {
  padding: 16px;
  height: calc(100vh - 60px);
  overflow: auto;
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }

  .title {
    font-size: 15px;
  }

  .user {
    max-width: 42vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .main {
    padding: 10px;
    height: calc(100vh - 60px);
  }
}
</style>
