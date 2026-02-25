import { create } from 'zustand'
import type { Profile, Experience, Project, Skill, Education, GeneratedResume } from '../types/resume'
import * as api from '../api/resume'

interface ResumeState {
  profile: Profile | null
  experiences: Experience[]
  projects: Project[]
  skills: Skill[]
  education: Education[]
  generated: GeneratedResume[]
  loading: boolean

  loadAll: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
  loadGenerated: () => Promise<void>

  // Experience CRUD
  createExperience: (data: Partial<Experience>) => Promise<void>
  updateExperience: (id: number, data: Partial<Experience>) => Promise<void>
  deleteExperience: (id: number) => Promise<void>

  // Project CRUD
  createProject: (data: Partial<Project>) => Promise<void>
  updateProject: (id: number, data: Partial<Project>) => Promise<void>
  deleteProject: (id: number) => Promise<void>

  // Skill CRUD
  createSkill: (data: Partial<Skill>) => Promise<void>
  updateSkill: (id: number, data: Partial<Skill>) => Promise<void>
  deleteSkill: (id: number) => Promise<void>

  // Education CRUD
  createEducation: (data: Partial<Education>) => Promise<void>
  updateEducation: (id: number, data: Partial<Education>) => Promise<void>
  deleteEducation: (id: number) => Promise<void>
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  profile: null,
  experiences: [],
  projects: [],
  skills: [],
  education: [],
  generated: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const [profile, experiences, projects, skills, education] = await Promise.all([
      api.getProfile(),
      api.experiencesApi.list(),
      api.projectsApi.list(),
      api.skillsApi.list(),
      api.educationApi.list(),
    ])
    set({ profile, experiences, projects, skills, education, loading: false })
  },

  updateProfile: async (data) => {
    const profile = await api.updateProfile(data)
    set({ profile })
  },

  loadGenerated: async () => {
    const generated = await api.listGenerated()
    set({ generated })
  },

  createExperience: async (data) => {
    await api.experiencesApi.create(data)
    set({ experiences: await api.experiencesApi.list() })
  },
  updateExperience: async (id, data) => {
    await api.experiencesApi.update(id, data)
    set({ experiences: await api.experiencesApi.list() })
  },
  deleteExperience: async (id) => {
    await api.experiencesApi.remove(id)
    set({ experiences: await api.experiencesApi.list() })
  },

  createProject: async (data) => {
    await api.projectsApi.create(data)
    set({ projects: await api.projectsApi.list() })
  },
  updateProject: async (id, data) => {
    await api.projectsApi.update(id, data)
    set({ projects: await api.projectsApi.list() })
  },
  deleteProject: async (id) => {
    await api.projectsApi.remove(id)
    set({ projects: await api.projectsApi.list() })
  },

  createSkill: async (data) => {
    await api.skillsApi.create(data)
    set({ skills: await api.skillsApi.list() })
  },
  updateSkill: async (id, data) => {
    await api.skillsApi.update(id, data)
    set({ skills: await api.skillsApi.list() })
  },
  deleteSkill: async (id) => {
    await api.skillsApi.remove(id)
    set({ skills: await api.skillsApi.list() })
  },

  createEducation: async (data) => {
    await api.educationApi.create(data)
    set({ education: await api.educationApi.list() })
  },
  updateEducation: async (id, data) => {
    await api.educationApi.update(id, data)
    set({ education: await api.educationApi.list() })
  },
  deleteEducation: async (id) => {
    await api.educationApi.remove(id)
    set({ education: await api.educationApi.list() })
  },
}))
