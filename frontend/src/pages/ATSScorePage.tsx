import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { scoreResume, listATSScores, getATSScore, deleteATSScore, uploadResume, type ATSScoreResult, type ATSCategoryScore } from '../api/ats'
import { fetchJobs } from '../api/jobs'
import type { Job } from '../types/job'
import Button from '../components/ui/Button'

const CATEGORY_LABELS: Record<string, string> = {
  keyword_match: 'Keyword Match',
  skills_match: 'Skills Match',
  experience_relevance: 'Experience Relevance',
  education_match: 'Education Match',
  section_completeness: 'Section Completeness',
  quantification: 'Quantification & Impact',
  action_verbs: 'Action Verbs',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green'
  if (score >= 60) return 'text-orange'
  return 'text-red'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green'
  if (score >= 60) return 'bg-orange'
  return 'bg-red'
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface3" />
        <circle
          cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <div className="absolute mt-10 flex flex-col items-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-xs text-text2">/100</span>
      </div>
    </div>
  )
}

function CategoryBar({ name, cat }: { name: string; cat: ATSCategoryScore }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-text2">{CATEGORY_LABELS[name] || name}</span>
        <span className={`font-medium ${scoreColor(cat.score)}`}>{cat.score}%</span>
      </div>
      <div className="h-2 bg-surface3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBg(cat.score)}`}
          style={{ width: `${cat.score}%` }}
        />
      </div>
    </div>
  )
}

export default function ATSScorePage() {
  const [searchParams] = useSearchParams()
  const [jd, setJd] = useState('')
  const [resumeSource, setResumeSource] = useState<'db' | 'paste' | 'upload'>('db')
  const [pastedResume, setPastedResume] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(
    searchParams.get('job_id') ? Number(searchParams.get('job_id')) : undefined,
  )
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ATSScoreResult | null>(null)
  const [history, setHistory] = useState<ATSScoreResult[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJobs().then(setJobs).catch(() => {})
    listATSScores().then(setHistory).catch(() => {})
  }, [])

  // If a job is selected, prefill JD
  useEffect(() => {
    if (selectedJobId) {
      const job = jobs.find(j => j.id === selectedJobId)
      if (job?.job_description) setJd(job.job_description)
    }
  }, [selectedJobId, jobs])

  const handleAnalyze = async () => {
    if (!jd.trim()) {
      setError('Please enter a job description')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await scoreResume({
        job_description: jd,
        resume_text: resumeSource !== 'db' ? pastedResume : undefined,
        job_id: selectedJobId,
      })
      setResult(res)
      // Refresh history
      listATSScores().then(setHistory).catch(() => {})
    } catch (e: any) {
      setError(e?.message || 'Scoring failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    await deleteATSScore(id)
    setHistory(h => h.filter(s => s.id !== id))
    if (result?.id === id) setResult(null)
  }

  const handleHistoryClick = async (item: ATSScoreResult) => {
    try {
      const full = await getATSScore(item.id)
      setResult(full)
      if (full.job_description) setJd(full.job_description)
    } catch {
      setResult(item)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">ATS Score Analyzer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Job Description Input */}
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">Job Description</label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="Paste the job description here..."
              rows={8}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text2/50 focus:outline-none focus:border-accent/50 resize-y"
            />
          </div>

          {/* Job Selector */}
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">Or select from saved jobs</label>
            <select
              value={selectedJobId || ''}
              onChange={e => setSelectedJobId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50"
            >
              <option value="">-- Select a job --</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.company_name} - {j.role_name}</option>
              ))}
            </select>
          </div>

          {/* Resume Source */}
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">Resume Source</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={resumeSource === 'db'}
                  onChange={() => setResumeSource('db')}
                  className="accent-accent"
                />
                From Resume Builder
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={resumeSource === 'upload'}
                  onChange={() => setResumeSource('upload')}
                  className="accent-accent"
                />
                Upload PDF/DOCX
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={resumeSource === 'paste'}
                  onChange={() => setResumeSource('paste')}
                  className="accent-accent"
                />
                Paste manually
              </label>
            </div>
            {resumeSource === 'upload' && (
              <div>
                <label className="flex items-center gap-2 px-3 py-2 bg-surface2 border border-border border-dashed rounded-lg cursor-pointer hover:border-accent/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
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
                    }}
                  />
                  <svg className="w-4 h-4 text-text2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="text-sm text-text2">
                    {uploading ? 'Parsing...' : uploadedFileName ? uploadedFileName : 'Choose PDF or DOCX file'}
                  </span>
                </label>
                {uploadedFileName && !uploading && (
                  <p className="text-xs text-green mt-1">Extracted text from {uploadedFileName}</p>
                )}
              </div>
            )}
            {resumeSource === 'paste' && (
              <textarea
                value={pastedResume}
                onChange={e => setPastedResume(e.target.value)}
                placeholder="Paste your resume text here..."
                rows={6}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text2/50 focus:outline-none focus:border-accent/50 resize-y"
              />
            )}
          </div>

          {error && <p className="text-red text-sm">{error}</p>}

          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? 'Analyzing...' : 'Analyze ATS Score'}
          </Button>

          {/* Score History */}
          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text2 mb-2">Score History</h3>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {history.map(h => (
                  <div
                    key={h.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      result?.id === h.id ? 'bg-accent/10 border border-accent/30' : 'bg-surface2 hover:bg-surface3'
                    }`}
                    onClick={() => handleHistoryClick(h)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm font-bold ${scoreColor(h.overall_score)}`}>{h.overall_score}</span>
                      <span className="text-xs text-text2 truncate">
                        {new Date(h.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(h.id) }}
                      className="text-text2 hover:text-red text-xs bg-transparent border-none cursor-pointer"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Results */}
        <div>
          {result ? (
            <div className="space-y-5">
              {/* Overall Score */}
              <div className="flex justify-center relative">
                <ScoreRing score={result.overall_score} />
              </div>

              {/* Category Breakdown */}
              <div className="bg-surface rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-3">Category Breakdown</h3>
                {Object.entries(result.category_scores).map(([name, cat]) => (
                  <CategoryBar key={name} name={name} cat={cat as ATSCategoryScore} />
                ))}
              </div>

              {/* Missing Keywords */}
              {(result.category_scores.keyword_match?.missing?.length ?? 0) > 0 && (
                <div className="bg-surface rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold mb-2">Missing Keywords</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.category_scores.keyword_match?.missing?.map((kw: string) => (
                      <span key={kw} className="inline-block px-2 py-0.5 rounded text-xs bg-red/10 text-red">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {(result.category_scores.skills_match?.missing?.length ?? 0) > 0 && (
                <div className="bg-surface rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold mb-2">Missing Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.category_scores.skills_match?.missing?.map((sk: string) => (
                      <span key={sk} className="inline-block px-2 py-0.5 rounded text-xs bg-orange/10 text-orange">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="bg-surface rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold mb-2">Suggestions</h3>
                  <ul className="space-y-1.5">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-text2 flex gap-2">
                        <span className="text-accent shrink-0">-</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-text2 text-sm">
              Paste a job description and click "Analyze ATS Score" to see results
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
