import { defineStore } from 'pinia'
import { fetchModels } from '@/api/models'

export const useModelsStore = defineStore('models', {
  state: () => ({
    // { [aiCode]: string[] }
    providers: {} as Record<string, string[]>,
    loaded: false,
    loading: false,
  }),
  getters: {
    aiCodes: (s) => Object.keys(s.providers),
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      try {
        const res = await fetchModels()
        this.providers = res.providers || {}
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    modelsOf(aiCode: string): string[] {
      return this.providers[aiCode] || []
    },
  },
})
