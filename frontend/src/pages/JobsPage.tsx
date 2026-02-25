import { useEffect, useState, useMemo } from 'react'
import { useJobsStore } from '../hooks/useJobs'
import Dashboard from '../components/jobs/Dashboard'
import Filters from '../components/jobs/Filters'
import BulkBar from '../components/jobs/BulkBar'
import JobCard from '../components/jobs/JobCard'
import AddJobModal from '../components/jobs/AddJobModal'
import ApplyModal from '../components/jobs/ApplyModal'
import type { Job } from '../types/job'

interface Props {
  addModalOpen: boolean
  setAddModalOpen: (v: boolean) => void
}

export default function JobsPage({ addModalOpen, setAddModalOpen }: Props) {
  const {
    jobs, stats, filter, search, selectMode, selectedIds,
    load, loadStats, setFilter, setSearch,
    toggleBookmark, toggleSelect, selectAll, deselectAll,
    deleteSelected, setSelectMode,
  } = useJobsStore()

  const [applyJob, setApplyJob] = useState<Job | null>(null)

  useEffect(() => { load(); loadStats() }, [])

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (filter === 'all') {
        if (j.status !== 'new') return false
      } else if (filter === 'bookmarked') {
        if (!j.bookmarked) return false
      } else if (j.status !== filter) return false

      if (search) {
        const hay = [j.role_name, j.company_name, j.job_description, j.location, j.skills, j.department, j.source]
          .filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [jobs, filter, search])

  function handleApply(job: Job) {
    window.open(job.apply_link, '_blank')
    setApplyJob(job)
  }

  return (
    <>
      <Dashboard stats={stats} />
      <Filters active={filter} search={search} onFilter={setFilter} onSearch={setSearch} />

      {selectMode && (
        <BulkBar
          count={selectedIds.size}
          onSelectAll={() => selectAll(filtered.map(j => j.id))}
          onDeselectAll={deselectAll}
          onDelete={() => { if (confirm(`Delete ${selectedIds.size} job(s)?`)) deleteSelected() }}
          onCancel={() => setSelectMode(false)}
        />
      )}

      <div className="p-4 px-5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text2">
            <p className="text-base mb-1">No jobs found</p>
            <p className="text-sm">Try a different filter or add a new job</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-3">
            {filtered.map(j => (
              <JobCard
                key={j.id}
                job={j}
                selectMode={selectMode}
                selected={selectedIds.has(j.id)}
                onToggleSelect={toggleSelect}
                onToggleBookmark={toggleBookmark}
                onApply={handleApply}
              />
            ))}
          </div>
        )}
      </div>

      <AddJobModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <ApplyModal open={!!applyJob} job={applyJob} onClose={() => setApplyJob(null)} />
    </>
  )
}
