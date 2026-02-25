export interface Job {
  id: number
  company_name: string
  role_name: string
  job_description: string
  apply_link: string
  h1b_sponsorship: boolean
  salary: string | null
  location: string | null
  remote_type: string | null
  job_type: string | null
  experience_level: string | null
  bookmarked: boolean
  status: string
  date_posted: string | null
  date_applied: string | null
  resume_path: string | null
  notes: string | null
  recruiter_name: string | null
  recruiter_linkedin: string | null
  company_website: string | null
  source: string | null
  external_job_id: string | null
  skills: string | null
  department: string | null
  benefits: string | null
  created_at: string
}

export interface JobStats {
  total: number
  by_status: Record<string, number>
  by_source: Record<string, number>
  applied_this_week: number
  bookmarked: number
}

export type JobCreate = Omit<Job, 'id' | 'created_at'>
export type JobUpdate = Partial<Pick<Job, 'bookmarked' | 'status' | 'notes' | 'date_applied' | 'resume_path'>>
