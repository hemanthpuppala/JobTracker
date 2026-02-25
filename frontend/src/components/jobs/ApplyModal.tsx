import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import type { Job } from '../../types/job'
import { useJobsStore } from '../../hooks/useJobs'

interface Props {
  open: boolean
  job: Job | null
  onClose: () => void
}

export default function ApplyModal({ open, job, onClose }: Props) {
  const updateJob = useJobsStore(s => s.updateJob)
  const [submitting, setSubmitting] = useState(false)

  if (!job) return null

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    await updateJob(job!.id, {
      status: 'applied',
      date_applied: (fd.get('date_applied') as string) || new Date().toISOString().slice(0, 10),
      resume_path: (fd.get('resume_path') as string) || null,
    })
    setSubmitting(false)
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block mb-1 text-xs text-text2 uppercase tracking-wide'

  return (
    <Modal open={open} onClose={onClose} title="Mark as Applied?">
      <p className="text-sm text-text2 mb-4">{job.company_name} — {job.role_name}</p>
      <form onSubmit={handleConfirm}>
        <label className={labelCls}>Resume Used (path)</label>
        <input
          name="resume_path"
          defaultValue={job.resume_path || ''}
          placeholder="/home/hemanth/resumes/my_resume_v2.pdf"
          className={inputCls}
        />
        <label className={labelCls}>Date Applied</label>
        <input
          name="date_applied"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => { window.open(job.apply_link, '_blank'); onClose() }}
          >
            Just Open Link
          </Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Applied!'}</Button>
        </div>
      </form>
    </Modal>
  )
}
