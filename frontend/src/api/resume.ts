import type { Profile, Experience, Project, Skill, Education, GeneratedResume, ResumeGenerateRequest, CustomSection } from '../types/resume'

const API = ''

// Profile
export const getProfile = (): Promise<Profile> => fetch(`${API}/api/resume/profile`).then(r => r.json())
export const updateProfile = (data: Partial<Profile>): Promise<Profile> =>
  fetch(`${API}/api/resume/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())

// Generic CRUD factory
function crud<T>(path: string) {
  return {
    list: (): Promise<T[]> => fetch(`${API}${path}`).then(r => r.json()),
    create: (data: Partial<T>): Promise<T> =>
      fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: number, data: Partial<T>): Promise<T> =>
      fetch(`${API}${path}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    remove: (id: number): Promise<void> => fetch(`${API}${path}/${id}`, { method: 'DELETE' }).then(() => {}),
  }
}

export const experiencesApi = crud<Experience>('/api/resume/experiences')
export const projectsApi = crud<Project>('/api/resume/projects')
export const skillsApi = crud<Skill>('/api/resume/skills')
export const educationApi = crud<Education>('/api/resume/education')
export const customSectionsApi = crud<CustomSection>('/api/resume/custom-sections')

// Resume generation
export const generateResume = (data: ResumeGenerateRequest): Promise<GeneratedResume> =>
  fetch(`${API}/api/resume/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())

export const listGenerated = (): Promise<GeneratedResume[]> => fetch(`${API}/api/resume/generated`).then(r => r.json())

export const downloadResume = (id: number) => window.open(`${API}/api/resume/generated/${id}/download`, '_blank')

export const deleteGenerated = (id: number): Promise<void> => fetch(`${API}/api/resume/generated/${id}`, { method: 'DELETE' }).then(() => {})

export const getJobResumes = (jobId: number): Promise<GeneratedResume[]> => fetch(`${API}/api/jobs/${jobId}/resumes`).then(r => r.json())
