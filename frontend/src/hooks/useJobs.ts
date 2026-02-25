import { create } from 'zustand'
import type { Job, JobStats } from '../types/job'
import * as api from '../api/jobs'

interface JobsState {
  jobs: Job[]
  stats: JobStats | null
  loading: boolean
  filter: string
  search: string
  selectedIds: Set<number>
  selectMode: boolean

  load: () => Promise<void>
  loadStats: () => Promise<void>
  setFilter: (f: string) => void
  setSearch: (s: string) => void
  toggleBookmark: (id: number) => Promise<void>
  updateJob: (id: number, data: Record<string, unknown>) => Promise<Job>
  deleteJob: (id: number) => Promise<void>
  deleteSelected: () => Promise<void>
  toggleSelect: (id: number) => void
  selectAll: (ids: number[]) => void
  deselectAll: () => void
  setSelectMode: (v: boolean) => void
  addJob: (job: Job) => void
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  stats: null,
  loading: false,
  filter: 'all',
  search: '',
  selectedIds: new Set(),
  selectMode: false,

  load: async () => {
    set({ loading: true })
    const jobs = await api.fetchJobs()
    set({ jobs, loading: false })
  },

  loadStats: async () => {
    const stats = await api.fetchStats()
    set({ stats })
  },

  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),

  toggleBookmark: async (id) => {
    const job = get().jobs.find(j => j.id === id)
    if (!job) return
    const updated = await api.updateJob(id, { bookmarked: !job.bookmarked })
    set({ jobs: get().jobs.map(j => j.id === id ? updated : j) })
    get().loadStats()
  },

  updateJob: async (id, data) => {
    const updated = await api.updateJob(id, data)
    set({ jobs: get().jobs.map(j => j.id === id ? updated : j) })
    get().loadStats()
    return updated
  },

  deleteJob: async (id) => {
    await api.deleteJob(id)
    set({ jobs: get().jobs.filter(j => j.id !== id) })
    get().loadStats()
  },

  deleteSelected: async () => {
    const ids = [...get().selectedIds]
    await Promise.all(ids.map(id => api.deleteJob(id)))
    set({
      jobs: get().jobs.filter(j => !get().selectedIds.has(j.id)),
      selectedIds: new Set(),
      selectMode: false,
    })
    get().loadStats()
  },

  toggleSelect: (id) => {
    const s = new Set(get().selectedIds)
    if (s.has(id)) s.delete(id); else s.add(id)
    set({ selectedIds: s })
  },

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  deselectAll: () => set({ selectedIds: new Set() }),
  setSelectMode: (v) => set({ selectMode: v, selectedIds: new Set() }),

  addJob: (job) => set({ jobs: [job, ...get().jobs] }),
}))
