import { useState, useEffect } from 'react'
import { fetchJobs } from '../../api/jobs'
import type { Job } from '../../types/job'
import { uploadResume } from '../../api/ats'
import type { PipelineEvent } from '../../api/ai'
import Button from '../ui/Button'

interface Props {
  jd: string
  setJd: (v: string) => void
  resumeSource: 'db' | 'paste' | 'upload'
  setResumeSource: (v: 'db' | 'paste' | 'upload') => void
  pastedResume: string
  setPastedResume: (v: string) => void
  selectedJobId: number | undefined
  setSelectedJobId: (v: number | undefined) => void
  customPrompt: string
  setCustomPrompt: (v: string) => void
  onTailor: () => void
  onCheckATS: () => void
  tailoring: boolean
  scoring: boolean
  pipelineEvents: PipelineEvent[]
  showSessionWarning?: boolean
  onStartNewSession?: () => void
  onKeepCurrent?: () => void
  onSessionWarning?: (action: () => void) => void
  lastJdText?: string
}

const STEP_ICONS: Record<string, string> = {
  running: '...',
  done: 'ok',
  error: '!!',
}

export default function JDPanel({
  jd, setJd, resumeSource, setResumeSource,
  pastedResume, setPastedResume,
  selectedJobId, setSelectedJobId,
  customPrompt, setCustomPrompt,
  onTailor, onCheckATS, tailoring, scoring,
  pipelineEvents,
  showSessionWarning, onStartNewSession, onKeepCurrent,
  onSessionWarning, lastJdText,
}: Props) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJobs().then(setJobs).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedJobId) {
      const job = jobs.find(j => j.id === selectedJobId)
      if (job?.job_description) setJd(job.job_description)
    }
  }, [selectedJobId, jobs])

  // Deduplicate events by step — keep latest status per step
  const stepMap = new Map<string, PipelineEvent>()
  for (const e of pipelineEvents) {
    if (e.step !== 'session') stepMap.set(e.step, e)
  }
  const visibleSteps = Array.from(stepMap.values())

  return (
    <div className="space-y-3 p-3 bg-surface rounded-lg border border-border">
      <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider">AI Tailoring</h3>

      {/* Session Warning Banner */}
      {showSessionWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 space-y-2">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Changing the JD/resume will start a new session. Your current resume will be auto-saved.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onStartNewSession}
              className="px-2.5 py-1 text-[0.65rem] font-medium bg-amber-500 text-white rounded cursor-pointer border-none hover:bg-amber-600 transition-colors"
            >
              Start New Session
            </button>
            <button
              onClick={onKeepCurrent}
              className="px-2.5 py-1 text-[0.65rem] font-medium bg-surface2 text-text2 border border-border rounded cursor-pointer hover:text-text transition-colors"
            >
              Keep Current
            </button>
          </div>
        </div>
      )}

      {/* Job Description */}
      <div>
        <label className="block text-xs font-medium text-text2 mb-1">Job Description</label>
        <textarea
          value={jd}
          onChange={e => setJd(e.target.value)}
          onBlur={() => {
            if (onSessionWarning && lastJdText && jd !== lastJdText) {
              onSessionWarning(() => {})
            }
          }}
          placeholder="Paste the job description here..."
          rows={5}
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-text placeholder:text-text2/50 focus:outline-none focus:border-accent/50 resize-y"
        />
      </div>

      {/* Job Selector */}
      <div>
        <label className="block text-xs font-medium text-text2 mb-1">Or select from saved jobs</label>
        <select
          value={selectedJobId || ''}
          onChange={e => setSelectedJobId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent/50"
        >
          <option value="">-- Select a job --</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>{j.company_name} - {j.role_name}</option>
          ))}
        </select>
      </div>

      {/* Resume Source */}
      <div>
        <label className="block text-xs font-medium text-text2 mb-1">Resume Source</label>
        <div className="flex gap-3 mb-2">
          {(['db', 'upload', 'paste'] as const).map(src => (
            <label key={src} className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                checked={resumeSource === src}
                onChange={() => setResumeSource(src)}
                className="accent-accent"
              />
              {src === 'db' ? 'From DB' : src === 'upload' ? 'Upload' : 'Paste'}
            </label>
          ))}
        </div>
        {resumeSource === 'upload' && (
          <label className="flex items-center gap-2 px-3 py-2 bg-surface2 border border-border border-dashed rounded-lg cursor-pointer hover:border-accent/50 transition-colors text-xs">
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const doUpload = async () => {
                  setUploading(true)
                  setError('')
                  try {
                    const res = await uploadResume(file)
                    setPastedResume(res.text)
                    setUploadedFileName(res.filename)
                  } catch (err: any) {
                    setError(err?.message || 'Failed to parse file')
                  } finally {
                    setUploading(false)
                  }
                }
                if (onSessionWarning) {
                  onSessionWarning(doUpload)
                } else {
                  doUpload()
                }
              }}
            />
            <span className="text-text2">
              {uploading ? 'Parsing...' : uploadedFileName || 'Choose PDF or DOCX'}
            </span>
          </label>
        )}
        {resumeSource === 'paste' && (
          <textarea
            value={pastedResume}
            onChange={e => setPastedResume(e.target.value)}
            placeholder="Paste your resume text..."
            rows={4}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-text placeholder:text-text2/50 focus:outline-none focus:border-accent/50 resize-y"
          />
        )}
      </div>

      {error && <p className="text-red text-xs">{error}</p>}

      {/* Custom Prompt */}
      <div>
        <label className="block text-xs font-medium text-text2 mb-1">Instructions for AI (optional)</label>
        <textarea
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          placeholder="e.g. Keep the resume to a single page, emphasize leadership experience..."
          rows={2}
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-text placeholder:text-text2/50 focus:outline-none focus:border-accent/50 resize-y"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button size="sm" onClick={onTailor} disabled={tailoring || !jd.trim()} className="flex-1">
          {tailoring ? 'Tailoring...' : 'AI Tailor Resume'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCheckATS} disabled={scoring || !jd.trim()} className="flex-1">
          {scoring ? 'Scoring...' : 'Check ATS Score'}
        </Button>
      </div>

      {/* Pipeline Progress */}
      {visibleSteps.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          <h4 className="text-[0.6rem] font-semibold text-text2 uppercase">Pipeline Progress</h4>
          {visibleSteps.map((evt) => (
            <div key={evt.step} className="flex items-center gap-2 text-xs">
              <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[0.5rem] font-bold shrink-0 ${
                evt.status === 'done' ? 'bg-green/20 text-green' :
                evt.status === 'error' ? 'bg-red/20 text-red' :
                'bg-accent/20 text-accent animate-pulse'
              }`}>
                {STEP_ICONS[evt.status]}
              </span>
              <span className={`truncate ${evt.status === 'running' ? 'text-accent' : 'text-text2'}`}>
                {evt.message || evt.step}
              </span>
              {evt.status === 'done' && evt.data?.score !== undefined && (
                <span className="ml-auto text-xs font-bold text-green">{evt.data.score}</span>
              )}
              {evt.status === 'done' && evt.data?.improvement !== undefined && (
                <span className={`ml-1 text-xs font-medium ${evt.data.improvement > 0 ? 'text-green' : 'text-text2'}`}>
                  (+{evt.data.improvement})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
