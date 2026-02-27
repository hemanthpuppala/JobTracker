const API = ''

export interface ATSScoreRequest {
  job_description: string
  resume_text?: string
  job_id?: number
}

export interface ATSCategoryScore {
  score: number
  weight: number
  matched?: string[]
  missing?: string[]
  details?: string
  present?: string[]
  quantified_count?: number
  total_bullets?: number
  strong_verbs?: string[]
  weak_verbs?: string[]
}

export interface ATSScoreResult {
  id: number
  job_id?: number
  overall_score: number
  category_scores: Record<string, ATSCategoryScore>
  suggestions: string[]
  created_at: string
  job_description?: string
  resume_snapshot?: string
}

export const scoreResume = (data: ATSScoreRequest): Promise<ATSScoreResult> =>
  fetch(`${API}/api/ats/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(async r => {
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: `Server error (${r.status})` }))
      throw new Error(err.detail || `Scoring failed (${r.status})`)
    }
    return r.json()
  })

export const listATSScores = (jobId?: number): Promise<ATSScoreResult[]> => {
  const url = jobId ? `${API}/api/ats/scores?job_id=${jobId}` : `${API}/api/ats/scores`
  return fetch(url).then(r => r.json())
}

export const getATSScore = (id: number): Promise<ATSScoreResult> =>
  fetch(`${API}/api/ats/scores/${id}`).then(r => r.json())

export const deleteATSScore = (id: number): Promise<void> =>
  fetch(`${API}/api/ats/scores/${id}`, { method: 'DELETE' }).then(() => {})

export const uploadResume = (file: File): Promise<{ text: string; filename: string }> => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${API}/api/ats/upload-resume`, { method: 'POST', body: form }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Upload failed') })
    return r.json()
  })
}
