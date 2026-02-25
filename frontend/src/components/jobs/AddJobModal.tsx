import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { createJob } from '../../api/jobs'
import { useJobsStore } from '../../hooks/useJobs'

interface Props {
  open: boolean
  onClose: () => void
}

export default function AddJobModal({ open, onClose }: Props) {
  const loadStats = useJobsStore(s => s.loadStats)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    await createJob({
      company_name: fd.get('company_name') as string,
      role_name: fd.get('role_name') as string,
      job_description: fd.get('job_description') as string,
      apply_link: fd.get('apply_link') as string,
      h1b_sponsorship: !!fd.get('h1b_sponsorship'),
      location: (fd.get('location') as string) || null,
      remote_type: (fd.get('remote_type') as string) || null,
      salary: (fd.get('salary') as string) || null,
      date_posted: (fd.get('date_posted') as string) || null,
      job_type: (fd.get('job_type') as string) || null,
      experience_level: (fd.get('experience_level') as string) || null,
      skills: (fd.get('skills') as string) || null,
      department: (fd.get('department') as string) || null,
      source: (fd.get('source') as string) || null,
      company_website: (fd.get('company_website') as string) || null,
      external_job_id: (fd.get('external_job_id') as string) || null,
      benefits: (fd.get('benefits') as string) || null,
      notes: (fd.get('notes') as string) || null,
      recruiter_name: (fd.get('recruiter_name') as string) || null,
      recruiter_linkedin: (fd.get('recruiter_linkedin') as string) || null,
      bookmarked: false,
      status: 'new',
      date_applied: null,
      resume_path: null,
    })
    loadStats()
    setSubmitting(false)
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block mb-1 text-xs text-text2 uppercase tracking-wide'
  const selectCls = inputCls

  return (
    <Modal open={open} onClose={onClose} title="Add Job" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Company *</label>
            <input name="company_name" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role *</label>
            <input name="role_name" required className={inputCls} />
          </div>
        </div>

        <label className={labelCls}>Job Description *</label>
        <textarea name="job_description" required placeholder="Paste the full JD here..." className={`${inputCls} min-h-[80px] resize-y font-sans`} />

        <label className={labelCls}>Apply Link *</label>
        <input name="apply_link" type="url" required placeholder="https://..." className={inputCls} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Location</label>
            <input name="location" placeholder="e.g. San Francisco, CA" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Remote Type</label>
            <select name="remote_type" className={selectCls}>
              <option value="">--</option>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>Onsite</option>
              <option>Remote OK</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Salary</label>
            <input name="salary" placeholder="e.g. $120k-$150k" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date Posted</label>
            <input name="date_posted" type="date" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Job Type</label>
            <select name="job_type" className={selectCls}>
              <option value="">--</option>
              <option>Full-time</option>
              <option>Contract</option>
              <option>Part-time</option>
              <option>Internship</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Experience Level</label>
            <select name="experience_level" className={selectCls}>
              <option value="">--</option>
              <option>Entry-level</option>
              <option>Mid-level</option>
              <option>Senior</option>
              <option>Staff</option>
              <option>Manager</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center mb-3">
          <input type="checkbox" name="h1b_sponsorship" id="h1b" className="accent-accent" />
          <label htmlFor="h1b" className="text-sm text-text">H1B Sponsorship Available</label>
        </div>

        <label className={labelCls}>Skills</label>
        <input name="skills" placeholder="e.g. Python, React, AWS (comma-separated)" className={inputCls} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Department</label>
            <input name="department" placeholder="e.g. Engineering" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Source</label>
            <select name="source" className={selectCls}>
              <option value="">--</option>
              <option>LinkedIn</option>
              <option>Indeed</option>
              <option>Company Website</option>
              <option>Referral</option>
              <option>Twitter</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Company Website</label>
            <input name="company_website" type="url" placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>External Job ID</label>
            <input name="external_job_id" placeholder="e.g. JOB-12345" className={inputCls} />
          </div>
        </div>

        <label className={labelCls}>Benefits</label>
        <input name="benefits" placeholder="e.g. 401k, Health, RSUs" className={inputCls} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Recruiter Name</label>
            <input name="recruiter_name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Recruiter LinkedIn</label>
            <input name="recruiter_linkedin" type="url" placeholder="https://linkedin.com/in/..." className={inputCls} />
          </div>
        </div>

        <label className={labelCls}>Notes</label>
        <textarea name="notes" placeholder="Any personal notes..." className={`${inputCls} min-h-[50px] resize-y font-sans`} />

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Job'}</Button>
        </div>
      </form>
    </Modal>
  )
}
