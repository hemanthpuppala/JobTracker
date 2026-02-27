import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { useResumeBuilderStore, buildResumeText, getDocumentProps } from '../lib/resumeStore'
import { FONT_OPTIONS, MARGIN_PRESETS } from '../lib/resumeStyles'
import { getProfile, experiencesApi, projectsApi, skillsApi, educationApi, customSectionsApi, updateProfile } from '../api/resume'
import { scoreResume, type ATSScoreResult } from '../api/ats'
import { tailorResumePipeline, type PipelineEvent } from '../api/ai'
import ResumeForm from '../components/resume/ResumeForm'
import InteractiveEditor from '../components/resume/InteractiveEditor'
import ResumePreview from '../components/resume/ResumePreview'
import ResizableSplit from '../components/resume/ResizableSplit'
import ResumeDocument from '../components/resume/ResumeDocument'
import JDPanel from '../components/resume/JDPanel'
import ATSModal from '../components/resume/ATSModal'
import Button from '../components/ui/Button'
import { cn } from '../lib/utils'

export default function ResumeBuilderPage() {
  const nav = useNavigate()
  const store = useResumeBuilderStore()

  // AI / ATS state
  const [jd, setJd] = useState('')
  const [resumeSource, setResumeSource] = useState<'db' | 'paste' | 'upload'>('db')
  const [pastedResume, setPastedResume] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>()
  const [tailoring, setTailoring] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [atsResult, setAtsResult] = useState<ATSScoreResult | null>(null)
  const [showATSModal, setShowATSModal] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [showJDPanel, setShowJDPanel] = useState(false)
  const [pipelineEvents, setPipelineEvents] = useState<PipelineEvent[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [cachedJdAnalysis, setCachedJdAnalysis] = useState<Record<string, any> | null>(null)
  const [lastJdText, setLastJdText] = useState('')

  // Load data from API on mount
  useEffect(() => {
    if (store.loaded) return
    async function load() {
      const [profile, experiences, projects, skills, education, customSections] = await Promise.all([
        getProfile(),
        experiencesApi.list(),
        projectsApi.list(),
        skillsApi.list(),
        educationApi.list(),
        customSectionsApi.list(),
      ])
      store.hydrateFromAPI({ profile, experiences, projects, skills, education, customSections })
    }
    load()
  }, [store.loaded])

  const handleTailor = useCallback(async () => {
    if (!jd.trim()) {
      alert('Please enter a job description first')
      return
    }
    setTailoring(true)
    setPipelineEvents([])

    // Clear cached JD analysis if JD text changed
    const jdChanged = jd !== lastJdText
    const jdAnalysisToSend = jdChanged ? undefined : cachedJdAnalysis ?? undefined
    if (jdChanged) setCachedJdAnalysis(null)
    setLastJdText(jd)

    // Get fresh store state for PDF generation and resume text
    const latest = useResumeBuilderStore.getState()

    // Detect PDF page count
    let pdfPageCount: number | undefined
    try {
      const blob = await pdf(<ResumeDocument {...getDocumentProps(latest)} />).toBlob()
      const buf = await blob.arrayBuffer()
      const text = new TextDecoder('latin1').decode(buf)
      const pageMatches = text.match(/\/Type\s*\/Page[^s]/g)
      pdfPageCount = pageMatches ? pageMatches.length : 1
    } catch {
      // Fallback — don't block tailoring if page count detection fails
    }

    try {
      const currentResumeText = buildResumeText(latest)
      const result = await tailorResumePipeline(
        {
          job_description: jd,
          resume_text: currentResumeText,
          resume_source: 'live',
          job_id: selectedJobId,
          session_id: currentSessionId ?? undefined,
          custom_prompt: customPrompt || undefined,
          jd_analysis: jdAnalysisToSend,
          pdf_page_count: pdfPageCount,
        },
        (event) => {
          setPipelineEvents(prev => [...prev, event])

          // Capture session_id from first event
          if (event.step === 'session' && event.data?.session_id) {
            setCurrentSessionId(event.data.session_id)
          }

          // Cache JD analysis for reuse on subsequent clicks
          if (event.step === 'analyze_jd' && event.status === 'done' && event.data) {
            setCachedJdAnalysis(event.data)
          }

          // Apply partial results incrementally — always read fresh state
          if (event.status === 'done' && event.data) {
            const s = useResumeBuilderStore.getState()
            if (event.step === 'tailor_summary' && event.data.summary) {
              s.setSummary(event.data.summary)
            }
            if (event.step.startsWith('tailor_exp_') && event.data.id) {
              s.setExperiences(
                s.experiences.map(exp =>
                  exp.id === event.data.id
                    ? { ...exp, bullets: event.data.bullets || exp.bullets, included: event.data.included ?? exp.included }
                    : exp
                )
              )
            }
            if (event.step.startsWith('tailor_proj_') && event.data.id) {
              s.setProjects(
                s.projects.map(proj =>
                  proj.id === event.data.id
                    ? { ...proj, bullets: event.data.bullets || proj.bullets, included: event.data.included ?? proj.included }
                    : proj
                )
              )
            }
            if (event.step === 'tailor_skills' && Array.isArray(event.data)) {
              s.setSkills(
                s.skills.map(sk => {
                  const ai = event.data.find((d: any) => d.id === sk.id)
                  if (!ai) return sk
                  return { ...sk, items: ai.items || sk.items, included: ai.included ?? sk.included }
                })
              )
            }
            if (event.step === 'rescore' && event.data.score !== undefined) {
              setAtsResult({
                id: 0,
                overall_score: event.data.score,
                category_scores: event.data.categories || {},
                suggestions: event.data.suggestions || [],
                created_at: new Date().toISOString(),
              })
            }
          }
        },
      )
    } catch (e: any) {
      alert(e?.message || 'AI tailoring failed')
    } finally {
      setTailoring(false)
    }
  }, [jd, selectedJobId, currentSessionId, customPrompt, cachedJdAnalysis, lastJdText])

  const handleCheckATS = useCallback(async () => {
    if (!jd.trim()) {
      alert('Please enter a job description first')
      return
    }
    setScoring(true)
    try {
      // Always score the current resume as shown in the PDF preview
      const latest = useResumeBuilderStore.getState()
      const currentResumeText = buildResumeText(latest)
      const result = await scoreResume({
        job_description: jd,
        resume_text: currentResumeText,
        job_id: selectedJobId,
      })
      setAtsResult(result)
      setShowATSModal(true)
    } catch (e: any) {
      alert(e?.message || 'ATS scoring failed')
    } finally {
      setScoring(false)
    }
  }, [jd, selectedJobId])

  const handleOptimize = useCallback(async () => {
    if (!jd.trim()) return
    setShowATSModal(false)
    handleTailor()
  }, [jd, handleTailor])

  // Save to DB
  const handleSave = useCallback(async () => {
    try {
      const { contact, summary, sectionHeaders, sections, customSections } = store

      // Build section_order for persistence
      const sortedSections = [...sections].sort((a, b) => a.order - b.order)
      const sectionOrder = sortedSections.map(s => ({ id: s.id, visible: s.visible }))

      await updateProfile({
        full_name: contact.fullName,
        location: contact.location,
        phone: contact.phone,
        email: contact.email,
        linkedin: contact.linkedin,
        github: contact.github,
        portfolio: contact.portfolio,
        summary,
        section_headers: sectionHeaders,
        section_order: sectionOrder,
      })
      await Promise.all(store.experiences.map(exp =>
        experiencesApi.update(exp.id, {
          company: exp.company,
          title: exp.title,
          date_start: exp.dateStart,
          date_end: exp.dateEnd || null,
          bullets: JSON.stringify(exp.bullets),
          sort_order: 0,
        })
      ))
      await Promise.all(store.projects.map(proj =>
        projectsApi.update(proj.id, {
          name: proj.name,
          tech_stack: proj.techStack,
          bullets: JSON.stringify(proj.bullets),
          sort_order: 0,
        })
      ))
      await Promise.all(store.skills.filter(sk => sk.id > 0).map(sk =>
        skillsApi.update(sk.id, {
          category: sk.category,
          items: sk.items,
          sort_order: 0,
        })
      ))
      await Promise.all(store.education.map(edu =>
        educationApi.update(edu.id, {
          degree: edu.degree,
          institution: edu.institution,
          gpa: edu.gpa || null,
          date_start: edu.dateStart,
          date_end: edu.dateEnd,
          sort_order: 0,
        })
      ))

      // Save custom sections
      const customSectionEntries = sections.filter(s => s.type === 'custom')
      for (const sec of customSectionEntries) {
        const data = customSections[sec.id]
        if (!data) continue
        const items = data.items.map((item, i) => ({
          text: item.text,
          label: item.label || null,
          sort_order: i,
        }))
        if (data.dbId) {
          await customSectionsApi.update(data.dbId, {
            header: sec.header,
            layout: sec.layout,
            sort_order: sec.order,
            items,
          } as any)
        } else {
          const created = await customSectionsApi.create({
            section_id: sec.id,
            header: sec.header,
            layout: sec.layout || 'bullets',
            sort_order: sec.order,
            items,
          } as any)
          // Update dbId in store
          data.dbId = (created as any).id
        }
      }

      store.markClean()
    } catch (err) {
      console.error('Failed to save resume data:', err)
      alert('Save failed. Please try again.')
    }
  }, [store])

  // Download PDF (client-side)
  const handleDownloadPDF = useCallback(async () => {
    const blob = await pdf(<ResumeDocument {...getDocumentProps(store)} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.contact.fullName.replace(/\s+/g, '_')}_Resume.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [store])

  // Download DOCX (backend)
  const handleDownloadDOCX = useCallback(async () => {
    const res = await fetch('/api/resume/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_summary: store.summary,
        selected_experience_ids: store.experiences.filter(e => e.included).map(e => e.id),
        selected_project_ids: store.projects.filter(p => p.included).map(p => p.id),
        selected_skill_ids: store.skills.filter(s => s.included).map(s => s.id),
        selected_education_ids: store.education.filter(e => e.included).map(e => e.id),
        style_config: {
          font: store.styles.font,
          base_font_size: store.styles.baseFontSize,
          margins: store.styles.margins,
        },
      }),
    })
    const data = await res.json()
    window.open(`/api/resume/generated/${data.id}/download`, '_blank')
  }, [store])

  // Global Ctrl+Z / Ctrl+Y keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Only intercept if not focused on a text input (let browser handle native text undo)
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        store.undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        store.redo()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [store])

  if (!store.loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg text-text2">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm">Loading resume data...</div>
        </div>
      </div>
    )
  }

  const leftPanel = (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* JD Panel toggle */}
      {store.mode === 'form' && (
        <div className="flex-shrink-0 px-3 pt-2">
          <button
            onClick={() => setShowJDPanel(!showJDPanel)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-all',
              showJDPanel
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-surface2 border-border text-text2 hover:text-text hover:border-accent/30',
            )}
          >
            {showJDPanel ? 'Hide AI Tailoring' : 'AI Tailoring & ATS'}
          </button>
        </div>
      )}
      {showJDPanel && store.mode === 'form' && (
        <div className="flex-shrink-0 px-3 pt-2">
          <JDPanel
            jd={jd} setJd={setJd}
            resumeSource={resumeSource} setResumeSource={setResumeSource}
            pastedResume={pastedResume} setPastedResume={setPastedResume}
            selectedJobId={selectedJobId} setSelectedJobId={setSelectedJobId}
            customPrompt={customPrompt} setCustomPrompt={setCustomPrompt}
            onTailor={handleTailor} onCheckATS={handleCheckATS}
            tailoring={tailoring} scoring={scoring}
            pipelineEvents={pipelineEvents}
          />
        </div>
      )}
      {/* Original form/editor */}
      <div className="flex-1 min-h-0">
        {store.mode === 'interactive' ? <InteractiveEditor /> : <ResumeForm />}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-bg text-text">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface border-b border-border flex-shrink-0">
        {/* Left: back + title */}
        <button
          onClick={() => nav(-1)}
          className="text-text2 hover:text-text bg-transparent border-none cursor-pointer text-sm transition-colors"
        >
          &larr; Back
        </button>
        <span className="text-sm font-semibold">Resume Builder</span>
        {store.dirty && <span className="text-[0.6rem] text-orange bg-orange/10 px-1.5 py-0.5 rounded">Unsaved</span>}

        {/* Mode toggle pill */}
        <div className="flex items-center bg-surface2 rounded-full p-0.5 border border-border">
          <button
            className={cn(
              'px-2.5 py-0.5 text-[0.6rem] font-medium rounded-full border-none cursor-pointer transition-all',
              store.mode === 'form' ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-text2 hover:text-text',
            )}
            onClick={() => store.setMode('form')}
          >
            Form
          </button>
          <button
            className={cn(
              'px-2.5 py-0.5 text-[0.6rem] font-medium rounded-full border-none cursor-pointer transition-all',
              store.mode === 'interactive' ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-text2 hover:text-text',
            )}
            onClick={() => store.setMode('interactive')}
          >
            Interactive
          </button>
        </div>

        <span className="flex-1" />

        {/* Format controls */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-text2">Font:</label>
          <select
            value={store.styles.font}
            onChange={e => store.setFont(e.target.value)}
            className="bg-surface2 border border-border rounded px-2 py-1 text-text text-xs focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <label className="text-text2 ml-1">Size:</label>
          <button
            onClick={() => store.setBaseFontSize(Math.max(8, store.styles.baseFontSize - 0.5))}
            className="w-5 h-5 flex items-center justify-center bg-surface2 border border-border rounded text-text2 hover:text-text hover:border-text2 cursor-pointer text-xs transition-colors"
          >
            &minus;
          </button>
          <input
            type="range"
            min={8}
            max={13}
            step={0.5}
            value={store.styles.baseFontSize}
            onChange={e => store.setBaseFontSize(Number(e.target.value))}
            className="w-16 accent-accent cursor-pointer"
          />
          <button
            onClick={() => store.setBaseFontSize(Math.min(13, store.styles.baseFontSize + 0.5))}
            className="w-5 h-5 flex items-center justify-center bg-surface2 border border-border rounded text-text2 hover:text-text hover:border-text2 cursor-pointer text-xs transition-colors"
          >
            +
          </button>
          <span className="text-text2 w-8">{store.styles.baseFontSize}pt</span>

          <label className="text-text2 ml-1">Margins:</label>
          <select
            value={Object.entries(MARGIN_PRESETS).find(([, v]) => v.top === store.styles.margins.top)?.[0] || 'Normal'}
            onChange={e => store.setMarginPreset(e.target.value as keyof typeof MARGIN_PRESETS)}
            className="bg-surface2 border border-border rounded px-2 py-1 text-text text-xs focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            {Object.keys(MARGIN_PRESETS).map(p => <option key={p}>{p}</option>)}
          </select>

          <label className="text-text2 ml-1">Page:</label>
          <select
            value={store.styles.page}
            onChange={e => store.setPageSize(e.target.value as 'A4' | 'LETTER')}
            className="bg-surface2 border border-border rounded px-2 py-1 text-text text-xs focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            <option value="LETTER">Letter</option>
            <option value="A4">A4</option>
          </select>
        </div>

        <span className="w-px h-5 bg-border mx-1" />

        {/* Undo / Redo / Reset */}
        <div className="flex items-center gap-1">
          <button
            onClick={store.undo}
            disabled={!store.canUndo()}
            className="w-7 h-7 flex items-center justify-center bg-surface2 border border-border rounded text-text2 hover:text-text hover:border-text2 cursor-pointer text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            &#8630;
          </button>
          <button
            onClick={store.redo}
            disabled={!store.canRedo()}
            className="w-7 h-7 flex items-center justify-center bg-surface2 border border-border rounded text-text2 hover:text-text hover:border-text2 cursor-pointer text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            &#8631;
          </button>
          <button
            onClick={() => {
              if (confirm('Reset all formatting to defaults? Text content will not be affected.')) {
                store.resetAllFormatting()
              }
            }}
            className="h-7 px-2 flex items-center justify-center bg-surface2 border border-border rounded text-text2 hover:text-text hover:border-text2 cursor-pointer text-[0.6rem] transition-colors"
            title="Reset all formatting to defaults"
          >
            Reset Format
          </button>
        </div>

        <span className="w-px h-5 bg-border mx-1" />

        {/* Actions */}
        <Button variant="outline" size="sm" onClick={handleSave}>
          {store.dirty ? 'Save' : 'Saved'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
          &#11015; PDF
        </Button>
        <Button size="sm" onClick={handleDownloadDOCX}>
          &#11015; DOCX
        </Button>
      </div>

      {/* Content — both modes use PDF preview as right pane (source of truth) */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplit
          left={leftPanel}
          right={<ResumePreview />}
          defaultLeftPercent={store.mode === 'interactive' ? 50 : 40}
        />
      </div>

      {/* ATS Modal */}
      {showATSModal && atsResult && (
        <ATSModal
          result={atsResult}
          onClose={() => setShowATSModal(false)}
          onOptimize={handleOptimize}
          optimizing={optimizing}
        />
      )}
    </div>
  )
}
