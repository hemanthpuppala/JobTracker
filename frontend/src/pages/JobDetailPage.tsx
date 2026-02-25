import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchJob } from '../api/jobs'
import { getJobResumes, generateResume, downloadResume } from '../api/resume'
import { useJobsStore } from '../hooks/useJobs'
import type { Job } from '../types/job'
import type { GeneratedResume } from '../types/resume'
import Badge from '../components/ui/Badge'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { cn } from '../lib/utils'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { toggleBookmark, updateJob, deleteJob: removeJob } = useJobsStore()

  const [job, setJob] = useState<Job | null>(null)
  const [resumes, setResumes] = useState<GeneratedResume[]>([])
  const [notes, setNotes] = useState('')
  const [genOpen, setGenOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchJob(+id).then(j => { setJob(j); setNotes(j.notes || '') })
    getJobResumes(+id).then(setResumes)
  }, [id])

  if (!job) return <div className="p-8 text-center text-text2">Loading...</div>

  const locParts = [job.location, job.remote_type].filter(Boolean)
  const locText = [...new Set(locParts)].join(' · ')
  const skills = job.skills ? job.skills.split(',').map(s => s.trim()) : []

  async function handleStatusChange(status: string) {
    const updated = await updateJob(job!.id, { status })
    setJob(updated)
  }

  async function handleBookmark() {
    await toggleBookmark(job!.id)
    const j = await fetchJob(job!.id)
    setJob(j)
  }

  async function handleSaveNotes() {
    const updated = await updateJob(job!.id, { notes })
    setJob(updated)
  }

  async function handleDelete() {
    if (!confirm('Delete this job?')) return
    await removeJob(job!.id)
    nav('/')
  }

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGenerating(true)
    const fd = new FormData(e.currentTarget)
    const res = await generateResume({
      job_id: job!.id,
      custom_summary: (fd.get('custom_summary') as string) || null,
      tailoring_notes: (fd.get('tailoring_notes') as string) || null,
    })
    setResumes(prev => [res, ...prev])
    setGenerating(false)
    setGenOpen(false)
  }

  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'

  return (
    <div className="max-w-3xl mx-auto p-5">
      <button
        onClick={() => nav('/')}
        className="flex items-center gap-1 text-text2 text-sm mb-4 bg-transparent border-none cursor-pointer hover:text-text transition-colors"
      >
        &larr; Back to jobs
      </button>

      {/* Header */}
      <div className="mb-5">
        <div className="text-accent text-lg">
          {job.company_website ? (
            <a href={job.company_website} target="_blank" className="text-accent no-underline hover:underline">{job.company_name} &#8599;</a>
          ) : job.company_name}
        </div>
        <div className="text-2xl font-bold mt-0.5">{job.role_name}</div>
        {job.date_posted && <div className="text-sm text-text2 mt-1">Posted: {job.date_posted}</div>}
        {job.date_applied && (
          <div className="text-sm text-text2">
            Applied: {job.date_applied}
            {job.resume_path && <span> · Resume: {job.resume_path}</span>}
          </div>
        )}
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant={job.h1b_sponsorship ? 'h1b' : 'no-h1b'}>
          {job.h1b_sponsorship ? 'H1B Sponsorship' : 'No H1B'}
        </Badge>
        {locText && <Badge variant="location">{locText}</Badge>}
        {job.salary && <Badge variant="salary">{job.salary}</Badge>}
        {job.job_type && <Badge variant="experience">{job.job_type}</Badge>}
        {job.experience_level && <Badge variant="experience">{job.experience_level}</Badge>}
        {job.source && <Badge variant="source">via {job.source}</Badge>}
        {job.external_job_id && <Badge variant="source">ID: {job.external_job_id}</Badge>}
      </div>

      {/* Status + bookmark */}
      <div className="flex items-center gap-3 mb-4">
        <button
          className={cn(
            'bg-transparent border-none text-xl cursor-pointer transition-all opacity-50 hover:opacity-100',
            job.bookmarked && 'text-orange opacity-100'
          )}
          onClick={handleBookmark}
        >
          &#9733;
        </button>
        <label className="text-sm text-text2">Status:</label>
        <select
          value={job.status}
          onChange={e => handleStatusChange(e.target.value)}
          className="bg-surface2 border border-border rounded-md px-3 py-1.5 text-text text-sm focus:outline-none focus:border-accent/50 transition-colors"
        >
          {['new', 'applied', 'interviewing', 'offer', 'rejected'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap mb-4">
        <Button onClick={() => {
          window.open(job.apply_link, '_blank')
        }}>
          Apply &#8599;
        </Button>
        {job.recruiter_linkedin && (
          <a
            href={job.recruiter_linkedin}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-surface2 border border-border text-text text-sm no-underline font-medium hover:border-text2 transition-all"
          >
            Recruiter LinkedIn &#8599;
          </a>
        )}
        <Button variant="outline" onClick={() => window.open('/resume-builder', '_blank')}>Generate Resume</Button>
      </div>

      {job.recruiter_name && (
        <div className="text-sm text-text2 mb-4">Recruiter: <span className="text-text">{job.recruiter_name}</span></div>
      )}

      {/* Skills */}
      <div className="bg-surface border border-border rounded-[10px] p-5 mb-4">
        <h3 className="text-sm text-text2 uppercase tracking-wide mb-3">Skills</h3>
        <div className="flex flex-wrap gap-1.5">
          {skills.length > 0
            ? skills.map((s, i) => <Badge key={i} variant="skill">{s}</Badge>)
            : <span className="text-text2">--</span>
          }
        </div>
      </div>

      {/* Benefits */}
      {job.benefits && (
        <div className="bg-surface border border-border rounded-[10px] p-5 mb-4">
          <h3 className="text-sm text-text2 uppercase tracking-wide mb-3">Benefits</h3>
          <div className="text-sm leading-relaxed">{job.benefits}</div>
        </div>
      )}

      {job.department && (
        <div className="text-sm text-text2 mb-4">Department: <span className="text-text">{job.department}</span></div>
      )}

      {/* Job Description */}
      <div className="bg-surface border border-border rounded-[10px] p-5 mb-4">
        <h3 className="text-sm text-text2 uppercase tracking-wide mb-3">Job Description</h3>
        <div className="text-sm leading-[1.7] whitespace-pre-wrap">{job.job_description}</div>
      </div>

      {/* Notes */}
      <div className="bg-surface border border-border rounded-[10px] p-5 mb-4">
        <h3 className="text-sm text-text2 uppercase tracking-wide mb-3">Notes</h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add your notes..."
          className={`${inputCls} min-h-[80px] resize-y font-sans`}
        />
        <Button size="sm" onClick={handleSaveNotes}>Save Notes</Button>
      </div>

      {/* Generated Resumes */}
      {resumes.length > 0 && (
        <div className="bg-surface border border-border rounded-[10px] p-5 mb-4">
          <h3 className="text-sm text-text2 uppercase tracking-wide mb-3">Generated Resumes</h3>
          <div className="space-y-2">
            {resumes.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 bg-surface2 rounded-md">
                <div>
                  <div className="text-sm font-medium">{r.filename}</div>
                  <div className="text-xs text-text2">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadResume(r.id)}>Download</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Button variant="danger" size="sm" onClick={handleDelete}>Delete Job</Button>
      </div>

      {/* Generate Resume Modal */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate Resume">
        <form onSubmit={handleGenerate}>
          <label className="block mb-1 text-xs text-text2 uppercase">Custom Summary (optional)</label>
          <textarea name="custom_summary" placeholder="Tailored summary for this role..." className={`${inputCls} min-h-[80px] resize-y font-sans`} />
          <label className="block mb-1 text-xs text-text2 uppercase">Tailoring Notes (optional)</label>
          <textarea name="tailoring_notes" placeholder="Notes about what to emphasize..." className={`${inputCls} min-h-[60px] resize-y font-sans`} />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" type="button" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={generating}>{generating ? 'Generating...' : 'Generate .docx'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
