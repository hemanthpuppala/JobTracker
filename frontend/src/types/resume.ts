export interface Profile {
  id: number
  full_name: string
  location: string | null
  phone: string | null
  email: string | null
  linkedin: string | null
  github: string | null
  portfolio: string | null
  summary: string | null
  section_headers: Record<string, string> | null
  section_order: Array<{ id: string; visible: boolean }> | null
}

export interface Experience {
  id: number
  company: string
  title: string
  date_start: string
  date_end: string | null
  bullets: string // JSON array
  sort_order: number
}

export interface Project {
  id: number
  name: string
  tech_stack: string
  bullets: string // JSON array
  sort_order: number
}

export interface Skill {
  id: number
  category: string
  items: string
  sort_order: number
}

export interface Education {
  id: number
  degree: string
  institution: string
  gpa: string | null
  date_start: string
  date_end: string
  is_default: boolean
  sort_order: number
}

export interface GeneratedResume {
  id: number
  job_id: number | null
  filename: string
  file_path: string
  custom_summary: string | null
  selected_experience_ids: string | null
  selected_project_ids: string | null
  tailoring_notes: string | null
  created_at: string
}

export interface CustomSectionItem {
  id: number
  section_id: number
  text: string
  label: string | null
  sort_order: number
}

export interface CustomSection {
  id: number
  section_id: string
  header: string
  layout: string
  sort_order: number
  items: CustomSectionItem[]
}

export interface DocxStyleConfig {
  font?: string
  base_font_size?: number
  margins?: { top: number; bottom: number; left: number; right: number }
}

export interface ResumeGenerateRequest {
  job_id?: number | null
  custom_summary?: string | null
  selected_experience_ids?: number[] | null
  selected_project_ids?: number[] | null
  selected_skill_ids?: number[] | null
  selected_education_ids?: number[] | null
  tailoring_notes?: string | null
  style_config?: DocxStyleConfig | null
}
