import { useState, useEffect } from 'react'
import { useResumeBuilderStore } from '../../lib/resumeStore'
import {
  parseResumeFile, parseResumeText,
  listSavedResumes, getSavedResume,
  type ParsedResume, type SavedResumeSummary,
} from '../../api/ai'
import { getProfile, experiencesApi, projectsApi, skillsApi, educationApi, customSectionsApi } from '../../api/resume'
import Button from '../ui/Button'

interface Props {
  onSourceSelected: () => void
}

export default function SourcePicker({ onSourceSelected }: Props) {
  const store = useResumeBuilderStore()
  const [mode, setMode] = useState<'pick' | 'paste'>('pick')
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedResumes, setSavedResumes] = useState<SavedResumeSummary[]>([])
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)

  useEffect(() => {
    listSavedResumes().then(setSavedResumes).catch(() => {})
    getProfile().then(p => setHasProfile(!!p?.full_name)).catch(() => setHasProfile(false))
  }, [])

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const parsed = await parseResumeFile(file)
      store.hydrateFromParsed(parsed)
      onSourceSelected()
    } catch (e: any) {
      setError(e?.message || 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    if (!pasteText.trim()) return
    setLoading(true)
    setError('')
    try {
      const parsed = await parseResumeText(pasteText)
      store.hydrateFromParsed(parsed)
      onSourceSelected()
    } catch (e: any) {
      setError(e?.message || 'Failed to parse text')
    } finally {
      setLoading(false)
    }
  }

  const handleSavedResume = async (id: number) => {
    setLoading(true)
    setError('')
    try {
      const detail = await getSavedResume(id)
      // detail.data is a full store snapshot — apply it directly
      const d = detail.data
      store.hydrateFromParsed({
        contact: d.contact || { fullName: '', email: '', phone: '', location: '', linkedin: '', github: '' },
        summary: d.summary || '',
        experiences: (d.experiences || []).map((e: any) => ({
          company: e.company || '', title: e.title || '',
          dateStart: e.dateStart || '', dateEnd: e.dateEnd || '',
          bullets: e.bullets || [],
        })),
        projects: (d.projects || []).map((p: any) => ({
          name: p.name || '', techStack: p.techStack || '',
          bullets: p.bullets || [],
        })),
        skills: (d.skills || []).map((s: any) => ({
          category: s.category || '', items: s.items || '',
        })),
        education: (d.education || []).map((e: any) => ({
          degree: e.degree || '', institution: e.institution || '',
          dateStart: e.dateStart || '', dateEnd: e.dateEnd || '',
          gpa: e.gpa || '',
        })),
      })
      onSourceSelected()
    } catch (e: any) {
      setError(e?.message || 'Failed to load saved resume')
    } finally {
      setLoading(false)
    }
  }

  const handleMasterResume = async () => {
    setLoading(true)
    setError('')
    try {
      const [profile, experiences, projects, skills, education, customSections] = await Promise.all([
        getProfile(),
        experiencesApi.list(),
        projectsApi.list(),
        skillsApi.list(),
        educationApi.list(),
        customSectionsApi.list(),
      ])
      store.hydrateFromAPI({ profile, experiences, projects, skills, education, customSections })
      onSourceSelected()
    } catch (e: any) {
      setError(e?.message || 'Failed to load master resume')
    } finally {
      setLoading(false)
    }
  }

  const handleBlank = () => {
    store.resetToEmpty()
    onSourceSelected()
  }

  if (mode === 'paste') {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Paste Resume Text</h2>
            <button
              onClick={() => setMode('pick')}
              className="text-xs text-text2 hover:text-text cursor-pointer bg-transparent border-none"
            >
              &larr; Back
            </button>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Paste your full resume text here..."
            rows={12}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-text placeholder:text-text2/50 focus:outline-none focus:border-accent/50 resize-y"
          />
          {error && <p className="text-red text-xs">{error}</p>}
          <Button size="sm" onClick={handlePaste} disabled={loading || !pasteText.trim()} className="w-full">
            {loading ? 'Parsing...' : 'Parse & Load'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text text-center">Start Building Your Resume</h2>
        <p className="text-xs text-text2 text-center">Choose a source to get started</p>

        {error && <p className="text-red text-xs text-center">{error}</p>}

        <div className="space-y-2">
          {/* Upload */}
          <label className={`flex items-center gap-3 px-4 py-3 bg-surface2 border border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <span className="text-base">&#128196;</span>
            <div>
              <div className="text-xs font-medium text-text">Upload PDF / DOCX</div>
              <div className="text-[0.65rem] text-text2">Auto-parse into structured fields</div>
            </div>
          </label>

          {/* Paste */}
          <button
            onClick={() => setMode('paste')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-surface2 border border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors text-left"
            disabled={loading}
          >
            <span className="text-base">&#128203;</span>
            <div>
              <div className="text-xs font-medium text-text">Paste Resume Text</div>
              <div className="text-[0.65rem] text-text2">Copy-paste and auto-parse</div>
            </div>
          </button>

          {/* Saved Resumes */}
          {savedResumes.length > 0 && (
            <div className="bg-surface2 border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-base">&#128190;</span>
                <div className="text-xs font-medium text-text">Saved Resumes</div>
              </div>
              <select
                onChange={e => {
                  const id = Number(e.target.value)
                  if (id) handleSavedResume(id)
                }}
                defaultValue=""
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent/50 cursor-pointer"
                disabled={loading}
              >
                <option value="">Select a saved resume...</option>
                {savedResumes.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Master Resume */}
          {hasProfile && (
            <button
              onClick={handleMasterResume}
              className="w-full flex items-center gap-3 px-4 py-3 bg-surface2 border border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors text-left"
              disabled={loading}
            >
              <span className="text-base">&#11088;</span>
              <div>
                <div className="text-xs font-medium text-text">Master Resume</div>
                <div className="text-[0.65rem] text-text2">Load from your profile data</div>
              </div>
            </button>
          )}

          {/* Start Blank */}
          <button
            onClick={handleBlank}
            className="w-full flex items-center gap-3 px-4 py-3 bg-surface2 border border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors text-left"
            disabled={loading}
          >
            <span className="text-base">&#9999;&#65039;</span>
            <div>
              <div className="text-xs font-medium text-text">Start Blank</div>
              <div className="text-[0.65rem] text-text2">Empty form, fill in manually</div>
            </div>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-text2">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>
    </div>
  )
}
