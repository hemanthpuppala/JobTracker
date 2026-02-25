/**
 * Zustand store for the Resume Builder page.
 * Holds all form state + style config. The PDF preview reads from this store.
 */
import { create } from 'zustand'
import {
  DEFAULT_RESUME_STYLES,
  MARGIN_PRESETS,
  scaleStyles,
  type ResumeStyleConfig,
} from './resumeStyles'

// --- Data types for resume content ---

export interface ContactInfo {
  fullName: string
  location: string
  phone: string
  email: string
  linkedin: string
  github: string
  portfolio: string
}

export interface ExperienceItem {
  id: number
  company: string
  title: string
  dateStart: string
  dateEnd: string
  bullets: string[]
  included: boolean
}

export interface ProjectItem {
  id: number
  name: string
  techStack: string
  bullets: string[]
  included: boolean
}

export interface SkillItem {
  id: number
  category: string
  items: string
  included: boolean
}

export interface EducationItem {
  id: number
  degree: string
  institution: string
  gpa: string
  dateStart: string
  dateEnd: string
  included: boolean
}

export interface ResumeBuilderState {
  // Content
  contact: ContactInfo
  summary: string
  experiences: ExperienceItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  education: EducationItem[]

  // Style
  styles: ResumeStyleConfig

  // UI state
  loaded: boolean
  dirty: boolean

  // Actions — content
  setContact: (c: Partial<ContactInfo>) => void
  setSummary: (s: string) => void

  setExperiences: (exps: ExperienceItem[]) => void
  updateExperience: (id: number, data: Partial<ExperienceItem>) => void
  toggleExperience: (id: number) => void
  addExperienceBullet: (id: number) => void
  updateExperienceBullet: (id: number, bulletIdx: number, text: string) => void
  removeExperienceBullet: (id: number, bulletIdx: number) => void

  setProjects: (projs: ProjectItem[]) => void
  updateProject: (id: number, data: Partial<ProjectItem>) => void
  toggleProject: (id: number) => void
  addProjectBullet: (id: number) => void
  updateProjectBullet: (id: number, bulletIdx: number, text: string) => void
  removeProjectBullet: (id: number, bulletIdx: number) => void

  setSkills: (skills: SkillItem[]) => void
  updateSkill: (id: number, data: Partial<SkillItem>) => void
  toggleSkill: (id: number) => void
  addSkill: () => void
  removeSkill: (id: number) => void

  setEducation: (edu: EducationItem[]) => void
  updateEducation: (id: number, data: Partial<EducationItem>) => void
  toggleEducation: (id: number) => void

  // Actions — style
  setFont: (font: string) => void
  setBaseFontSize: (size: number) => void
  setMarginPreset: (preset: keyof typeof MARGIN_PRESETS) => void
  setPageSize: (page: 'A4' | 'LETTER') => void

  // Actions — lifecycle
  setLoaded: (v: boolean) => void
  markClean: () => void

  // Hydrate from API data
  hydrateFromAPI: (data: {
    profile: any
    experiences: any[]
    projects: any[]
    skills: any[]
    education: any[]
  }) => void
}

// Parse bullets from API: can be JSON string, array of strings, or array of {text} objects
function parseBullets(raw: any): string[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  if (Array.isArray(raw)) {
    return raw.map((b: any) => typeof b === 'string' ? b : b.text || '')
  }
  return []
}

// Parse skill items: can be comma-separated string or array of {item} objects
function parseSkillItems(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return raw.map((i: any) => typeof i === 'string' ? i : i.item || '').join(', ')
  }
  return ''
}

// Helper to update item in array by id
function updateById<T extends { id: number }>(arr: T[], id: number, data: Partial<T>): T[] {
  return arr.map(item => item.id === id ? { ...item, ...data } : item)
}

export const useResumeBuilderStore = create<ResumeBuilderState>((set, get) => ({
  contact: { fullName: '', location: '', phone: '', email: '', linkedin: '', github: '', portfolio: '' },
  summary: '',
  experiences: [],
  projects: [],
  skills: [],
  education: [],
  styles: { ...DEFAULT_RESUME_STYLES },
  loaded: false,
  dirty: false,

  // --- Contact ---
  setContact: (c) => set(s => ({ contact: { ...s.contact, ...c }, dirty: true })),
  setSummary: (summary) => set({ summary, dirty: true }),

  // --- Experiences ---
  setExperiences: (experiences) => set({ experiences }),
  updateExperience: (id, data) => set(s => ({
    experiences: updateById(s.experiences, id, data), dirty: true,
  })),
  toggleExperience: (id) => set(s => ({
    experiences: s.experiences.map(e => e.id === id ? { ...e, included: !e.included } : e), dirty: true,
  })),
  addExperienceBullet: (id) => set(s => ({
    experiences: s.experiences.map(e =>
      e.id === id ? { ...e, bullets: [...e.bullets, ''] } : e
    ), dirty: true,
  })),
  updateExperienceBullet: (id, bulletIdx, text) => set(s => ({
    experiences: s.experiences.map(e =>
      e.id === id ? { ...e, bullets: e.bullets.map((b, i) => i === bulletIdx ? text : b) } : e
    ), dirty: true,
  })),
  removeExperienceBullet: (id, bulletIdx) => set(s => ({
    experiences: s.experiences.map(e =>
      e.id === id ? { ...e, bullets: e.bullets.filter((_, i) => i !== bulletIdx) } : e
    ), dirty: true,
  })),

  // --- Projects ---
  setProjects: (projects) => set({ projects }),
  updateProject: (id, data) => set(s => ({
    projects: updateById(s.projects, id, data), dirty: true,
  })),
  toggleProject: (id) => set(s => ({
    projects: s.projects.map(p => p.id === id ? { ...p, included: !p.included } : p), dirty: true,
  })),
  addProjectBullet: (id) => set(s => ({
    projects: s.projects.map(p =>
      p.id === id ? { ...p, bullets: [...p.bullets, ''] } : p
    ), dirty: true,
  })),
  updateProjectBullet: (id, bulletIdx, text) => set(s => ({
    projects: s.projects.map(p =>
      p.id === id ? { ...p, bullets: p.bullets.map((b, i) => i === bulletIdx ? text : b) } : p
    ), dirty: true,
  })),
  removeProjectBullet: (id, bulletIdx) => set(s => ({
    projects: s.projects.map(p =>
      p.id === id ? { ...p, bullets: p.bullets.filter((_, i) => i !== bulletIdx) } : p
    ), dirty: true,
  })),

  // --- Skills ---
  setSkills: (skills) => set({ skills }),
  updateSkill: (id, data) => set(s => ({
    skills: updateById(s.skills, id, data), dirty: true,
  })),
  toggleSkill: (id) => set(s => ({
    skills: s.skills.map(sk => sk.id === id ? { ...sk, included: !sk.included } : sk), dirty: true,
  })),
  addSkill: () => set(s => {
    const maxId = s.skills.reduce((max, sk) => Math.max(max, sk.id), 0)
    return {
      skills: [...s.skills, { id: maxId + 1, category: '', items: '', included: true }],
      dirty: true,
    }
  }),
  removeSkill: (id) => set(s => ({
    skills: s.skills.filter(sk => sk.id !== id), dirty: true,
  })),

  // --- Education ---
  setEducation: (education) => set({ education }),
  updateEducation: (id, data) => set(s => ({
    education: updateById(s.education, id, data), dirty: true,
  })),
  toggleEducation: (id) => set(s => ({
    education: s.education.map(e => e.id === id ? { ...e, included: !e.included } : e), dirty: true,
  })),

  // --- Styles ---
  setFont: (font) => set(s => ({ styles: { ...s.styles, font }, dirty: true })),
  setBaseFontSize: (size) => set(s => ({ styles: scaleStyles(s.styles, size), dirty: true })),
  setMarginPreset: (preset) => set(s => ({
    styles: { ...s.styles, margins: { ...MARGIN_PRESETS[preset] } }, dirty: true,
  })),
  setPageSize: (page) => set(s => ({ styles: { ...s.styles, page }, dirty: true })),

  // --- Lifecycle ---
  setLoaded: (loaded) => set({ loaded }),
  markClean: () => set({ dirty: false }),

  // --- Hydrate from API ---
  hydrateFromAPI: ({ profile, experiences, projects, skills, education }) => {
    set({
      contact: {
        fullName: profile.full_name || '',
        location: profile.location || '',
        phone: profile.phone || '',
        email: profile.email || '',
        linkedin: profile.linkedin || '',
        github: profile.github || '',
        portfolio: profile.portfolio || '',
      },
      summary: profile.summary || '',
      experiences: experiences.map(e => ({
        id: e.id,
        company: e.company,
        title: e.title,
        dateStart: e.date_start,
        dateEnd: e.date_end || '',
        bullets: parseBullets(e.bullets),
        included: true,
      })),
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        techStack: p.tech_stack,
        bullets: parseBullets(p.bullets),
        included: true,
      })),
      skills: skills.map(s => ({
        id: s.id,
        category: s.category,
        items: parseSkillItems(s.items),
        included: true,
      })),
      education: education.map(e => ({
        id: e.id,
        degree: e.degree,
        institution: e.institution,
        gpa: e.gpa || '',
        dateStart: e.date_start,
        dateEnd: e.date_end,
        included: e.is_default ?? true,
      })),
      loaded: true,
      dirty: false,
    })
  },
}))
