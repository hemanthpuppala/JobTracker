const API = ''

export interface TailorRequest {
  job_description: string
  resume_text?: string
  resume_source?: string
  job_id?: number
  session_id?: number
  ats_result?: Record<string, any>
}

export interface TailorResponse {
  summary: string
  experiences: Array<{ id: number; bullets: string[]; included: boolean }>
  projects: Array<{ id: number; bullets: string[]; included: boolean }>
  skills: Array<{ id: number; items: string; included: boolean }>
  session_id?: number
}

export interface PipelineEvent {
  step: string
  status: 'running' | 'done' | 'error'
  message?: string
  data?: any
}

export interface Session {
  id: number
  job_id?: number
  job_description: string
  resume_source: string
  status: string
  created_at: string
  updated_at: string
  events: Array<{
    id: number
    event_type: string
    data: any
    created_at: string
  }>
}

/** Legacy single-shot tailoring */
export const tailorResume = (data: TailorRequest): Promise<TailorResponse> =>
  fetch(`${API}/api/ai/tailor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Tailoring failed') })
    return r.json()
  })

/**
 * Multi-step pipeline via SSE.
 * Calls onEvent for each step, including partial results.
 * Returns the final complete TailorResponse.
 */
export async function tailorResumePipeline(
  params: {
    job_description: string
    resume_source?: string
    resume_text?: string
    resume_structured?: Record<string, any>
    job_id?: number
    session_id?: number
    custom_prompt?: string
    jd_analysis?: Record<string, any>
    pdf_page_count?: number
  },
  onEvent: (event: PipelineEvent) => void,
  signal?: AbortSignal,
): Promise<TailorResponse | null> {
  const res = await fetch(`${API}/api/ai/tailor/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Stream failed' }))
    throw new Error(err.detail || 'Pipeline failed')
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: TailorResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event: PipelineEvent = JSON.parse(line.slice(6))
        onEvent(event)

        if (event.step === 'complete' && event.status === 'done' && event.data) {
          finalResult = event.data as TailorResponse
        }
      } catch {
        // skip malformed events
      }
    }
  }

  return finalResult
}

export const createSession = (data: { job_description: string; job_id?: number; resume_source?: string }): Promise<Session> =>
  fetch(`${API}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json())

export const listSessions = (): Promise<Session[]> =>
  fetch(`${API}/api/sessions`).then(r => r.json())

export const getSession = (id: number): Promise<Session> =>
  fetch(`${API}/api/sessions/${id}`).then(r => r.json())

export const updateSession = (id: number, data: { status?: string }): Promise<Session> =>
  fetch(`${API}/api/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json())

export const deleteSession = (id: number): Promise<void> =>
  fetch(`${API}/api/sessions/${id}`, { method: 'DELETE' }).then(() => {})

// --- Resume Parsing ---

export interface ParsedResume {
  contact: {
    fullName: string
    email: string
    phone: string
    location: string
    linkedin: string
    github: string
  }
  summary: string
  experiences: Array<{
    company: string
    title: string
    dateStart: string
    dateEnd: string
    bullets: string[]
  }>
  projects: Array<{
    name: string
    techStack: string
    bullets: string[]
  }>
  skills: Array<{
    category: string
    items: string
  }>
  education: Array<{
    degree: string
    institution: string
    dateStart: string
    dateEnd: string
    gpa: string
  }>
}

export const parseResumeFile = (file: File): Promise<ParsedResume> => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${API}/api/resumes/parse`, { method: 'POST', body: form })
    .then(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Parse failed') })
      return r.json()
    })
}

export const parseResumeText = (text: string): Promise<ParsedResume> =>
  fetch(`${API}/api/resumes/parse-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Parse failed') })
    return r.json()
  })

// --- Saved Resumes ---

export interface SavedResumeSummary {
  id: number
  label: string
  session_id?: number
  created_at: string
}

export interface SavedResumeDetail extends SavedResumeSummary {
  data: Record<string, any>
}

export interface SavedResumeCreatePayload {
  label: string
  data: Record<string, any>
  session_id?: number
}

export const listSavedResumes = (): Promise<SavedResumeSummary[]> =>
  fetch(`${API}/api/saved-resumes`).then(r => r.json())

export const getSavedResume = (id: number): Promise<SavedResumeDetail> =>
  fetch(`${API}/api/saved-resumes/${id}`).then(r => r.json())

export const saveResume = (data: SavedResumeCreatePayload): Promise<SavedResumeSummary> =>
  fetch(`${API}/api/saved-resumes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json())

export const deleteSavedResume = (id: number): Promise<void> =>
  fetch(`${API}/api/saved-resumes/${id}`, { method: 'DELETE' }).then(() => {})
