import type { Job, JobCreate, JobUpdate, JobStats } from '../types/job'

const API = ''

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/api/jobs`)
  return res.json()
}

export async function fetchJob(id: number): Promise<Job> {
  const res = await fetch(`${API}/api/jobs/${id}`)
  return res.json()
}

export async function createJob(data: JobCreate): Promise<Job> {
  const res = await fetch(`${API}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateJob(id: number, data: JobUpdate): Promise<Job> {
  const res = await fetch(`${API}/api/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteJob(id: number): Promise<void> {
  await fetch(`${API}/api/jobs/${id}`, { method: 'DELETE' })
}

export async function fetchStats(): Promise<JobStats> {
  const res = await fetch(`${API}/api/jobs/stats`)
  return res.json()
}

export function exportCSV() {
  window.open(`${API}/api/jobs/export/csv`, '_blank')
}
