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
import type { CustomLayout } from './resumeSectionPresets'

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

// --- Section array types ---
export type SectionType = 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'custom'

export interface ResumeSection {
  id: string              // 'summary', 'experience', 'custom-1', etc.
  type: SectionType
  order: number
  visible: boolean
  header: string          // editable section header
  layout?: CustomLayout   // only for type='custom'
}

export interface CustomSectionItem {
  id: number
  text: string
  label?: string        // key for keyvalue layout
  included: boolean
}

export interface CustomSectionData {
  items: CustomSectionItem[]
  dbId?: number         // DB primary key for CRUD
}

export const DEFAULT_SECTIONS: ResumeSection[] = [
  { id: 'summary',    type: 'summary',    order: 0, visible: true, header: 'Professional Summary' },
  { id: 'skills',     type: 'skills',     order: 1, visible: true, header: 'Technical Skills' },
  { id: 'experience', type: 'experience', order: 2, visible: true, header: 'Professional Experience' },
  { id: 'projects',   type: 'projects',   order: 3, visible: true, header: 'Key Projects' },
  { id: 'education',  type: 'education',  order: 4, visible: true, header: 'Education' },
]

export type EditorMode = 'form' | 'interactive'

/** Extract ResumeDocument props from the store (DRY helper used by preview, download, and page count). */
export function getDocumentProps(store: {
  contact: ContactInfo
  summary: string
  experiences: ExperienceItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  education: EducationItem[]
  styles: ResumeStyleConfig
  richContent: Record<string, any>
  elementStyles: Record<string, any>
  sectionHeaders: Record<string, string>
  sections: ResumeSection[]
  customSections: Record<string, any>
}) {
  return {
    contact: store.contact,
    summary: store.summary,
    experiences: store.experiences,
    projects: store.projects,
    skills: store.skills,
    education: store.education,
    styleConfig: store.styles,
    richContent: store.richContent,
    elementStyles: store.elementStyles,
    sectionHeaders: store.sectionHeaders,
    sections: store.sections,
    customSections: store.customSections,
  }
}

/**
 * Build plain-text representation of the resume from store state.
 * Mirrors what the PDF preview renders — respects section order, visibility, and included flags.
 */
export function buildResumeText(state: {
  contact: ContactInfo
  summary: string
  experiences: ExperienceItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  education: EducationItem[]
  sections: ResumeSection[]
  sectionHeaders: Record<string, string>
  customSections: Record<string, CustomSectionData>
}): string {
  const lines: string[] = []

  // Contact header
  lines.push(state.contact.fullName)
  const parts = [state.contact.email, state.contact.phone, state.contact.location,
    state.contact.linkedin, state.contact.github, state.contact.portfolio].filter(Boolean)
  if (parts.length) lines.push(parts.join(' | '))
  lines.push('')

  // Sections in order
  const sorted = [...state.sections].sort((a, b) => a.order - b.order)
  for (const sec of sorted) {
    if (!sec.visible) continue
    switch (sec.type) {
      case 'summary':
        if (state.summary) {
          lines.push(sec.header.toUpperCase())
          lines.push(state.summary)
          lines.push('')
        }
        break
      case 'experience': {
        const included = state.experiences.filter(e => e.included)
        if (included.length) {
          lines.push(sec.header.toUpperCase())
          for (const exp of included) {
            const dateRange = `${exp.dateStart} - ${exp.dateEnd || 'Present'}`
            lines.push(`${exp.title}, ${exp.company} (${dateRange})`)
            for (const b of exp.bullets) lines.push(`  - ${b}`)
            lines.push('')
          }
        }
        break
      }
      case 'projects': {
        const included = state.projects.filter(p => p.included)
        if (included.length) {
          lines.push(sec.header.toUpperCase())
          for (const proj of included) {
            lines.push(`${proj.name} | ${proj.techStack}`)
            for (const b of proj.bullets) lines.push(`  - ${b}`)
            lines.push('')
          }
        }
        break
      }
      case 'skills': {
        const included = state.skills.filter(s => s.included)
        if (included.length) {
          lines.push(sec.header.toUpperCase())
          for (const sk of included) {
            lines.push(`${sk.category}: ${sk.items}`)
          }
          lines.push('')
        }
        break
      }
      case 'education': {
        const included = state.education.filter(e => e.included)
        if (included.length) {
          lines.push(sec.header.toUpperCase())
          for (const edu of included) {
            const gpa = edu.gpa ? ` (GPA: ${edu.gpa})` : ''
            lines.push(`${edu.degree}, ${edu.institution}${gpa} (${edu.dateStart} - ${edu.dateEnd})`)
          }
          lines.push('')
        }
        break
      }
      case 'custom': {
        const data = state.customSections[sec.id]
        if (data) {
          const included = data.items.filter(i => i.included)
          if (included.length) {
            lines.push(sec.header.toUpperCase())
            for (const item of included) {
              if (item.label) {
                lines.push(`${item.label}: ${item.text}`)
              } else {
                lines.push(`  - ${item.text}`)
              }
            }
            lines.push('')
          }
        }
        break
      }
    }
  }

  return lines.join('\n')
}

export interface ElementStyleOverride {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontSize?: number
}

/** Resolve element overrides into a flat CSS-compatible style object. */
export function resolveElementStyle(
  overrides: ElementStyleOverride | undefined,
): React.CSSProperties {
  if (!overrides) return {}
  const s: React.CSSProperties = {}
  if (overrides.fontSize) s.fontSize = `${overrides.fontSize}pt`
  if (overrides.bold) s.fontWeight = 'bold'
  if (overrides.italic) s.fontStyle = 'italic'
  if (overrides.underline) s.textDecoration = 'underline'
  return s
}

/** Resolve element overrides into react-pdf style props. */
export function resolveElementStylePdf(
  overrides: ElementStyleOverride | undefined,
): Record<string, any> {
  if (!overrides) return {}
  const s: Record<string, any> = {}
  if (overrides.fontSize) s.fontSize = overrides.fontSize
  if (overrides.bold) s.fontWeight = 'bold'
  if (overrides.italic) s.fontStyle = 'italic'
  if (overrides.underline) s.textDecoration = 'underline'
  return s
}

/** Snapshot of undoable state (content + formatting, not UI) */
export interface UndoableSnapshot {
  contact: ContactInfo
  summary: string
  experiences: ExperienceItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  education: EducationItem[]
  sectionHeaders: Record<string, string>
  sections: ResumeSection[]
  customSections: Record<string, CustomSectionData>
  styles: ResumeStyleConfig
  elementStyles: Record<string, ElementStyleOverride>
  richContent: Record<string, any>
}

export interface ResumeBuilderState {
  // Content
  contact: ContactInfo
  summary: string
  experiences: ExperienceItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  education: EducationItem[]
  sectionHeaders: Record<string, string>
  sections: ResumeSection[]
  customSections: Record<string, CustomSectionData>

  // Style
  styles: ResumeStyleConfig

  // UI state
  loaded: boolean
  dirty: boolean
  mode: EditorMode
  selectedElementId: string | null
  elementStyles: Record<string, ElementStyleOverride>

  // Rich text content — TipTap JSON per element ID (e.g. 'exp-3-bullet-1')
  richContent: Record<string, any>

  // Undo / redo history
  _history: UndoableSnapshot[]
  _future: UndoableSnapshot[]
  _lastSnapshotTime: number

  // Actions — content
  setContact: (c: Partial<ContactInfo>) => void
  setSummary: (s: string) => void
  setSectionHeader: (key: string, value: string) => void

  // Actions — sections
  moveSection: (id: string, direction: 'up' | 'down') => void
  reorderSections: (ids: string[]) => void
  toggleSectionVisible: (id: string) => void
  removeSection: (id: string) => void
  addSection: (preset: { id: string; header: string; layout: CustomLayout }) => void
  addCustomItem: (sectionId: string) => void
  updateCustomItem: (sectionId: string, itemId: number, data: Partial<CustomSectionItem>) => void
  removeCustomItem: (sectionId: string, itemId: number) => void
  toggleCustomItem: (sectionId: string, itemId: number) => void

  setExperiences: (exps: ExperienceItem[]) => void
  addExperience: () => void
  removeExperience: (id: number) => void
  moveExperience: (id: number, direction: 'up' | 'down') => void
  updateExperience: (id: number, data: Partial<ExperienceItem>) => void
  toggleExperience: (id: number) => void
  addExperienceBullet: (id: number) => void
  updateExperienceBullet: (id: number, bulletIdx: number, text: string) => void
  removeExperienceBullet: (id: number, bulletIdx: number) => void

  setProjects: (projs: ProjectItem[]) => void
  addProject: () => void
  removeProject: (id: number) => void
  moveProject: (id: number, direction: 'up' | 'down') => void
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
  moveSkill: (id: number, direction: 'up' | 'down') => void

  setEducation: (edu: EducationItem[]) => void
  addEducation: () => void
  removeEducation: (id: number) => void
  moveEducation: (id: number, direction: 'up' | 'down') => void
  updateEducation: (id: number, data: Partial<EducationItem>) => void
  toggleEducation: (id: number) => void

  // Actions — mode
  setMode: (mode: EditorMode) => void
  setSelectedElement: (id: string | null) => void
  setElementStyle: (id: string, style: Partial<ElementStyleOverride>) => void
  setRichContent: (elementId: string, json: any) => void

  // Actions — style
  setFont: (font: string) => void
  setBaseFontSize: (size: number) => void
  setMarginPreset: (preset: keyof typeof MARGIN_PRESETS) => void
  setPageSize: (page: 'A4' | 'LETTER') => void
  updateStyleKey: <K extends keyof ResumeStyleConfig>(key: K, value: Partial<ResumeStyleConfig[K]>) => void

  // Actions — undo / redo / reset
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  resetSectionStyles: (section: string) => void
  resetAllFormatting: () => void

  // Actions — lifecycle
  setLoaded: (v: boolean) => void
  markClean: () => void

  // Reset to empty state
  resetToEmpty: () => void

  // Hydrate from parsed resume (heuristic parser output)
  hydrateFromParsed: (parsed: {
    contact: { fullName: string; email: string; phone: string; location: string; linkedin: string; github: string }
    summary: string
    experiences: Array<{ company: string; title: string; dateStart: string; dateEnd: string; bullets: string[] }>
    projects: Array<{ name: string; techStack: string; bullets: string[] }>
    skills: Array<{ category: string; items: string }>
    education: Array<{ degree: string; institution: string; dateStart: string; dateEnd: string; gpa: string }>
  }) => void

  // Hydrate from API data
  hydrateFromAPI: (data: {
    profile: any
    experiences: any[]
    projects: any[]
    skills: any[]
    education: any[]
    customSections?: any[]
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

function moveItem<T extends { id: number }>(arr: T[], id: number, direction: 'up' | 'down'): T[] {
  const idx = arr.findIndex(item => item.id === id)
  if (idx < 0) return arr
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= arr.length) return arr
  const result = [...arr]
  ;[result[idx], result[targetIdx]] = [result[targetIdx], result[idx]]
  return result
}

// --- Snapshot helpers for undo/redo ---

const HISTORY_LIMIT = 50
const DEBOUNCE_MS = 500

function extractSnapshot(s: ResumeBuilderState): UndoableSnapshot {
  return {
    contact: s.contact,
    summary: s.summary,
    experiences: s.experiences,
    projects: s.projects,
    skills: s.skills,
    education: s.education,
    sectionHeaders: s.sectionHeaders,
    sections: s.sections,
    customSections: s.customSections,
    styles: s.styles,
    elementStyles: s.elementStyles,
    richContent: s.richContent,
  }
}

function applySnapshot(snapshot: UndoableSnapshot): Partial<ResumeBuilderState> {
  return { ...snapshot, dirty: true }
}

/** Maps section prefix → style keys that belong to that section */
const SECTION_STYLE_KEYS: Record<string, (keyof ResumeStyleConfig)[]> = {
  contact: ['name', 'contact'],
  summary: ['summaryText'],
  skill: ['skillLabel', 'skillValue'],
  exp: ['jobTitle', 'expBullet', 'dates'],
  proj: ['projectTitle', 'projectTech', 'projBullet'],
  edu: ['education', 'eduDate'],
  header: ['sectionHeader'],
}

export const useResumeBuilderStore = create<ResumeBuilderState>((set, get) => {
  /** Push current state to history (debounced — skips if < DEBOUNCE_MS since last push) */
  function pushHistory(force?: boolean) {
    const s = get()
    const now = Date.now()
    if (!force && now - s._lastSnapshotTime < DEBOUNCE_MS) return
    set({
      _history: [...s._history.slice(-(HISTORY_LIMIT - 1)), extractSnapshot(s)],
      _future: [],
      _lastSnapshotTime: now,
    })
  }

  return {
  contact: { fullName: '', location: '', phone: '', email: '', linkedin: '', github: '', portfolio: '' },
  summary: '',
  experiences: [],
  projects: [],
  skills: [],
  education: [],
  sectionHeaders: {
    summary: 'Professional Summary',
    skills: 'Technical Skills',
    experience: 'Professional Experience',
    projects: 'Key Projects',
    education: 'Education',
  },
  sections: [...DEFAULT_SECTIONS],
  customSections: {},
  styles: { ...DEFAULT_RESUME_STYLES },
  loaded: false,
  dirty: false,
  mode: 'form' as EditorMode,
  selectedElementId: null,
  elementStyles: {},
  richContent: {},
  _history: [],
  _future: [],
  _lastSnapshotTime: 0,

  // --- Contact ---
  setContact: (c) => { pushHistory(); set(s => ({ contact: { ...s.contact, ...c }, dirty: true })) },
  setSummary: (summary) => { pushHistory(); set({ summary, dirty: true }) },
  setSectionHeader: (key, value) => { pushHistory(); set(s => ({
    sectionHeaders: { ...s.sectionHeaders, [key]: value },
    sections: s.sections.map(sec => sec.id === key ? { ...sec, header: value } : sec),
    dirty: true,
  })) },

  // --- Sections ---
  moveSection: (id, direction) => { pushHistory(true); set(s => {
    const sorted = [...s.sections].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(sec => sec.id === id)
    if (idx < 0) return s
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return s
    const newSections = sorted.map((sec, i) => {
      if (i === idx) return { ...sec, order: swapIdx }
      if (i === swapIdx) return { ...sec, order: idx }
      return { ...sec, order: i }
    })
    return { sections: newSections, dirty: true }
  }) },
  reorderSections: (ids) => { pushHistory(true); set(s => ({
    sections: s.sections.map(sec => {
      const newOrder = ids.indexOf(sec.id)
      return newOrder >= 0 ? { ...sec, order: newOrder } : sec
    }),
    dirty: true,
  })) },
  toggleSectionVisible: (id) => { pushHistory(true); set(s => ({
    sections: s.sections.map(sec => sec.id === id ? { ...sec, visible: !sec.visible } : sec),
    dirty: true,
  })) },
  removeSection: (id) => { pushHistory(true); set(s => {
    const newSections = s.sections.filter(sec => sec.id !== id)
    const newCustom = { ...s.customSections }
    delete newCustom[id]
    return { sections: newSections, customSections: newCustom, dirty: true }
  }) },
  addSection: (preset) => { pushHistory(true); set(s => {
    // Generate unique id for custom sections
    const existingCustomIds = s.sections.filter(sec => sec.type === 'custom').map(sec => sec.id)
    let sectionId = preset.id
    if (existingCustomIds.includes(sectionId) || s.sections.some(sec => sec.id === sectionId)) {
      let counter = 1
      while (s.sections.some(sec => sec.id === `${preset.id}-${counter}`)) counter++
      sectionId = `${preset.id}-${counter}`
    }
    const maxOrder = Math.max(...s.sections.map(sec => sec.order), -1)
    const newSection: ResumeSection = {
      id: sectionId,
      type: 'custom',
      order: maxOrder + 1,
      visible: true,
      header: preset.header,
      layout: preset.layout,
    }
    return {
      sections: [...s.sections, newSection],
      customSections: { ...s.customSections, [sectionId]: { items: [] } },
      dirty: true,
    }
  }) },
  addCustomItem: (sectionId) => { pushHistory(true); set(s => {
    const section = s.customSections[sectionId]
    if (!section) return s
    const maxId = section.items.reduce((max, it) => Math.max(max, it.id), 0)
    return {
      customSections: {
        ...s.customSections,
        [sectionId]: { ...section, items: [...section.items, { id: maxId + 1, text: '', included: true }] },
      },
      dirty: true,
    }
  }) },
  updateCustomItem: (sectionId, itemId, data) => { pushHistory(); set(s => {
    const section = s.customSections[sectionId]
    if (!section) return s
    return {
      customSections: {
        ...s.customSections,
        [sectionId]: { ...section, items: section.items.map(it => it.id === itemId ? { ...it, ...data } : it) },
      },
      dirty: true,
    }
  }) },
  removeCustomItem: (sectionId, itemId) => { pushHistory(true); set(s => {
    const section = s.customSections[sectionId]
    if (!section) return s
    return {
      customSections: {
        ...s.customSections,
        [sectionId]: { ...section, items: section.items.filter(it => it.id !== itemId) },
      },
      dirty: true,
    }
  }) },
  toggleCustomItem: (sectionId, itemId) => { pushHistory(true); set(s => {
    const section = s.customSections[sectionId]
    if (!section) return s
    return {
      customSections: {
        ...s.customSections,
        [sectionId]: { ...section, items: section.items.map(it => it.id === itemId ? { ...it, included: !it.included } : it) },
      },
      dirty: true,
    }
  }) },

  // --- Experiences ---
  setExperiences: (experiences) => set({ experiences }),
  addExperience: () => { pushHistory(true); set(s => {
    const maxId = s.experiences.reduce((max, e) => Math.max(max, e.id), 0)
    return {
      experiences: [...s.experiences, { id: maxId + 1, company: '', title: '', dateStart: '', dateEnd: '', bullets: [''], included: true }],
      dirty: true,
    }
  }) },
  removeExperience: (id) => { pushHistory(true); set(s => ({
    experiences: s.experiences.filter(e => e.id !== id), dirty: true,
  })) },
  moveExperience: (id, direction) => { pushHistory(true); set(s => ({
    experiences: moveItem(s.experiences, id, direction), dirty: true,
  })) },
  updateExperience: (id, data) => { pushHistory(); set(s => ({
    experiences: updateById(s.experiences, id, data), dirty: true,
  })) },
  toggleExperience: (id) => { pushHistory(true); set(s => ({
    experiences: s.experiences.map(e => e.id === id ? { ...e, included: !e.included } : e), dirty: true,
  })) },
  addExperienceBullet: (id) => { pushHistory(true); set(s => ({
    experiences: s.experiences.map(e =>
      e.id === id ? { ...e, bullets: [...e.bullets, ''] } : e
    ), dirty: true,
  })) },
  updateExperienceBullet: (id, bulletIdx, text) => { pushHistory(); set(s => ({
    experiences: s.experiences.map(e =>
      e.id === id ? { ...e, bullets: e.bullets.map((b, i) => i === bulletIdx ? text : b) } : e
    ), dirty: true,
  })) },
  removeExperienceBullet: (id, bulletIdx) => { pushHistory(true); set(s => ({
    experiences: s.experiences.map(e =>
      e.id === id ? { ...e, bullets: e.bullets.filter((_, i) => i !== bulletIdx) } : e
    ), dirty: true,
  })) },

  // --- Projects ---
  setProjects: (projects) => set({ projects }),
  addProject: () => { pushHistory(true); set(s => {
    const maxId = s.projects.reduce((max, p) => Math.max(max, p.id), 0)
    return {
      projects: [...s.projects, { id: maxId + 1, name: '', techStack: '', bullets: [''], included: true }],
      dirty: true,
    }
  }) },
  removeProject: (id) => { pushHistory(true); set(s => ({
    projects: s.projects.filter(p => p.id !== id), dirty: true,
  })) },
  moveProject: (id, direction) => { pushHistory(true); set(s => ({
    projects: moveItem(s.projects, id, direction), dirty: true,
  })) },
  updateProject: (id, data) => { pushHistory(); set(s => ({
    projects: updateById(s.projects, id, data), dirty: true,
  })) },
  toggleProject: (id) => { pushHistory(true); set(s => ({
    projects: s.projects.map(p => p.id === id ? { ...p, included: !p.included } : p), dirty: true,
  })) },
  addProjectBullet: (id) => { pushHistory(true); set(s => ({
    projects: s.projects.map(p =>
      p.id === id ? { ...p, bullets: [...p.bullets, ''] } : p
    ), dirty: true,
  })) },
  updateProjectBullet: (id, bulletIdx, text) => { pushHistory(); set(s => ({
    projects: s.projects.map(p =>
      p.id === id ? { ...p, bullets: p.bullets.map((b, i) => i === bulletIdx ? text : b) } : p
    ), dirty: true,
  })) },
  removeProjectBullet: (id, bulletIdx) => { pushHistory(true); set(s => ({
    projects: s.projects.map(p =>
      p.id === id ? { ...p, bullets: p.bullets.filter((_, i) => i !== bulletIdx) } : p
    ), dirty: true,
  })) },

  // --- Skills ---
  setSkills: (skills) => set({ skills }),
  updateSkill: (id, data) => { pushHistory(); set(s => ({
    skills: updateById(s.skills, id, data), dirty: true,
  })) },
  toggleSkill: (id) => { pushHistory(true); set(s => ({
    skills: s.skills.map(sk => sk.id === id ? { ...sk, included: !sk.included } : sk), dirty: true,
  })) },
  addSkill: () => { pushHistory(true); set(s => {
    const maxId = s.skills.reduce((max, sk) => Math.max(max, sk.id), 0)
    return {
      skills: [...s.skills, { id: maxId + 1, category: '', items: '', included: true }],
      dirty: true,
    }
  }) },
  removeSkill: (id) => { pushHistory(true); set(s => ({
    skills: s.skills.filter(sk => sk.id !== id), dirty: true,
  })) },
  moveSkill: (id, direction) => { pushHistory(true); set(s => ({
    skills: moveItem(s.skills, id, direction), dirty: true,
  })) },

  // --- Education ---
  setEducation: (education) => set({ education }),
  addEducation: () => { pushHistory(true); set(s => {
    const maxId = s.education.reduce((max, e) => Math.max(max, e.id), 0)
    return {
      education: [...s.education, { id: maxId + 1, degree: '', institution: '', gpa: '', dateStart: '', dateEnd: '', included: true }],
      dirty: true,
    }
  }) },
  removeEducation: (id) => { pushHistory(true); set(s => ({
    education: s.education.filter(e => e.id !== id), dirty: true,
  })) },
  moveEducation: (id, direction) => { pushHistory(true); set(s => ({
    education: moveItem(s.education, id, direction), dirty: true,
  })) },
  updateEducation: (id, data) => { pushHistory(); set(s => ({
    education: updateById(s.education, id, data), dirty: true,
  })) },
  toggleEducation: (id) => { pushHistory(true); set(s => ({
    education: s.education.map(e => e.id === id ? { ...e, included: !e.included } : e), dirty: true,
  })) },

  // --- Mode ---
  setMode: (mode) => set({ mode }),
  setSelectedElement: (selectedElementId) => set({ selectedElementId }),
  setElementStyle: (id, style) => { pushHistory(); set(s => ({
    elementStyles: { ...s.elementStyles, [id]: { ...s.elementStyles[id], ...style } },
    dirty: true,
  })) },
  setRichContent: (elementId, json) => set(s => ({
    richContent: { ...s.richContent, [elementId]: json },
  })),

  // --- Styles ---
  setFont: (font) => { pushHistory(true); set(s => ({ styles: { ...s.styles, font }, dirty: true })) },
  setBaseFontSize: (size) => { pushHistory(true); set(s => ({ styles: scaleStyles(s.styles, size), dirty: true })) },
  setMarginPreset: (preset) => { pushHistory(true); set(s => ({
    styles: { ...s.styles, margins: { ...MARGIN_PRESETS[preset] } }, dirty: true,
  })) },
  setPageSize: (page) => { pushHistory(true); set(s => ({ styles: { ...s.styles, page }, dirty: true })) },
  updateStyleKey: (key, value) => { pushHistory(); set(s => ({
    styles: {
      ...s.styles,
      [key]: typeof s.styles[key] === 'object' && typeof value === 'object'
        ? { ...s.styles[key], ...value }
        : value,
    },
    dirty: true,
  })) },

  // --- Undo / Redo ---
  undo: () => {
    const s = get()
    if (s._history.length === 0) return
    const prev = s._history[s._history.length - 1]
    set({
      ...applySnapshot(prev),
      _history: s._history.slice(0, -1),
      _future: [extractSnapshot(s), ...s._future.slice(0, HISTORY_LIMIT - 1)],
      _lastSnapshotTime: Date.now(),
    })
  },
  redo: () => {
    const s = get()
    if (s._future.length === 0) return
    const next = s._future[0]
    set({
      ...applySnapshot(next),
      _history: [...s._history.slice(-(HISTORY_LIMIT - 1)), extractSnapshot(s)],
      _future: s._future.slice(1),
      _lastSnapshotTime: Date.now(),
    })
  },
  canUndo: () => get()._history.length > 0,
  canRedo: () => get()._future.length > 0,

  // --- Reset ---
  resetSectionStyles: (section) => {
    pushHistory(true)
    const keys = SECTION_STYLE_KEYS[section]
    if (!keys) return
    set(s => {
      const newStyles = { ...s.styles }
      for (const k of keys) {
        (newStyles as any)[k] = { ...(DEFAULT_RESUME_STYLES as any)[k] }
      }
      // Also clear element-level overrides for this section
      const newElementStyles = { ...s.elementStyles }
      for (const elId of Object.keys(newElementStyles)) {
        if (elId.startsWith(section + '-') || elId === section) {
          delete newElementStyles[elId]
        }
      }
      return { styles: newStyles, elementStyles: newElementStyles, dirty: true }
    })
  },
  resetAllFormatting: () => {
    pushHistory(true)
    set({ styles: { ...DEFAULT_RESUME_STYLES }, elementStyles: {}, dirty: true })
  },

  // --- Lifecycle ---
  setLoaded: (loaded) => set({ loaded }),
  markClean: () => set({ dirty: false }),

  // --- Reset to empty ---
  resetToEmpty: () => {
    set({
      contact: { fullName: '', location: '', phone: '', email: '', linkedin: '', github: '', portfolio: '' },
      summary: '',
      experiences: [],
      projects: [],
      skills: [],
      education: [],
      sectionHeaders: {
        summary: 'Professional Summary',
        skills: 'Technical Skills',
        experience: 'Professional Experience',
        projects: 'Key Projects',
        education: 'Education',
      },
      sections: [...DEFAULT_SECTIONS],
      customSections: {},
      loaded: true,
      dirty: false,
      _history: [],
      _future: [],
      _lastSnapshotTime: 0,
    })
  },

  // --- Hydrate from parsed resume ---
  hydrateFromParsed: (parsed) => {
    let nextId = 1
    set({
      contact: {
        fullName: parsed.contact.fullName || '',
        location: parsed.contact.location || '',
        phone: parsed.contact.phone || '',
        email: parsed.contact.email || '',
        linkedin: parsed.contact.linkedin || '',
        github: parsed.contact.github || '',
        portfolio: '',
      },
      summary: parsed.summary || '',
      experiences: parsed.experiences.map(e => ({
        id: nextId++,
        company: e.company,
        title: e.title,
        dateStart: e.dateStart,
        dateEnd: e.dateEnd,
        bullets: e.bullets,
        included: true,
      })),
      projects: parsed.projects.map(p => ({
        id: nextId++,
        name: p.name,
        techStack: p.techStack,
        bullets: p.bullets,
        included: true,
      })),
      skills: parsed.skills.map(s => ({
        id: nextId++,
        category: s.category,
        items: s.items,
        included: true,
      })),
      education: parsed.education.map(e => ({
        id: nextId++,
        degree: e.degree,
        institution: e.institution,
        gpa: e.gpa || '',
        dateStart: e.dateStart,
        dateEnd: e.dateEnd,
        included: true,
      })),
      sectionHeaders: {
        summary: 'Professional Summary',
        skills: 'Technical Skills',
        experience: 'Professional Experience',
        projects: 'Key Projects',
        education: 'Education',
      },
      sections: [...DEFAULT_SECTIONS],
      customSections: {},
      loaded: true,
      dirty: true,
      _history: [],
      _future: [],
      _lastSnapshotTime: 0,
    })
  },

  // --- Hydrate from API ---
  hydrateFromAPI: ({ profile, experiences, projects, skills, education, customSections: apiCustomSections }) => {
    const sectionHeaders: Record<string, string> = {
      summary: 'Professional Summary',
      skills: 'Technical Skills',
      experience: 'Professional Experience',
      projects: 'Key Projects',
      education: 'Education',
      ...(profile.section_headers || {}),
    }

    // Build sections array from section_order or defaults
    let sections: ResumeSection[]
    const sectionOrder: Array<{ id: string; visible: boolean }> | null = profile.section_order || null
    if (sectionOrder && sectionOrder.length > 0) {
      sections = sectionOrder.map((entry, i) => {
        const defaultSec = DEFAULT_SECTIONS.find(d => d.id === entry.id)
        if (defaultSec) {
          return { ...defaultSec, order: i, visible: entry.visible, header: sectionHeaders[entry.id] || defaultSec.header }
        }
        // Custom section
        const apiCs = apiCustomSections?.find((cs: any) => cs.section_id === entry.id)
        return {
          id: entry.id,
          type: 'custom' as SectionType,
          order: i,
          visible: entry.visible,
          header: apiCs?.header || entry.id,
          layout: (apiCs?.layout || 'bullets') as CustomLayout,
        }
      })
      // Add any default sections missing from section_order
      for (const def of DEFAULT_SECTIONS) {
        if (!sections.find(s => s.id === def.id)) {
          sections.push({ ...def, order: sections.length, header: sectionHeaders[def.id] || def.header })
        }
      }
    } else {
      sections = DEFAULT_SECTIONS.map(d => ({ ...d, header: sectionHeaders[d.id] || d.header }))
      // Add custom sections from DB
      if (apiCustomSections) {
        for (const cs of apiCustomSections) {
          sections.push({
            id: cs.section_id,
            type: 'custom',
            order: sections.length,
            visible: true,
            header: cs.header,
            layout: cs.layout as CustomLayout,
          })
        }
      }
    }

    // Build customSections data
    const customSections: Record<string, CustomSectionData> = {}
    if (apiCustomSections) {
      for (const cs of apiCustomSections) {
        customSections[cs.section_id] = {
          dbId: cs.id,
          items: (cs.items || []).map((item: any) => ({
            id: item.id,
            text: item.text,
            label: item.label || undefined,
            included: true,
          })),
        }
      }
    }

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
      sectionHeaders,
      sections,
      customSections,
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
      _history: [],
      _future: [],
      _lastSnapshotTime: 0,
    })
  },
}
})
