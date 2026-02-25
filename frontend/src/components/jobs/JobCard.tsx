import { useNavigate } from 'react-router-dom'
import type { Job } from '../../types/job'
import Badge from '../ui/Badge'
import StatusBadge from '../ui/StatusBadge'
import { cn } from '../../lib/utils'

interface Props {
  job: Job
  selectMode: boolean
  selected: boolean
  onToggleSelect: (id: number) => void
  onToggleBookmark: (id: number) => void
  onApply: (job: Job) => void
}

export default function JobCard({ job, selectMode, selected, onToggleSelect, onToggleBookmark, onApply }: Props) {
  const nav = useNavigate()
  const j = job

  const locParts = [j.location, j.remote_type].filter(Boolean)
  const locText = [...new Set(locParts)].join(' · ')

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[10px] p-4 flex flex-col gap-2 cursor-pointer transition-all duration-150 animate-fadeIn relative group',
        'hover:border-[#444] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
        selected && 'border-accent bg-accent/5'
      )}
      onClick={() => {
        if (selectMode) { onToggleSelect(j.id); return }
        nav(`/job/${j.id}`)
      }}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(j.id)}
          onClick={e => e.stopPropagation()}
          className="absolute top-2.5 right-2.5 w-4 h-4 accent-accent cursor-pointer"
        />
      )}

      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="text-accent text-sm font-medium truncate">{j.company_name}</div>
          <div className="text-base font-semibold leading-snug">{j.role_name}</div>
        </div>
        <StatusBadge status={j.status} />
      </div>

      <div className="text-text2 text-xs leading-relaxed line-clamp-2">{j.job_description}</div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <Badge variant={j.h1b_sponsorship ? 'h1b' : 'no-h1b'}>
          {j.h1b_sponsorship ? 'H1B' : 'No H1B'}
        </Badge>
        {locText && <Badge variant="location">{locText}</Badge>}
        {j.salary && <Badge variant="salary">{j.salary}</Badge>}
        {j.experience_level && <Badge variant="experience">{j.experience_level}</Badge>}
        {j.source && <Badge variant="source">{j.source}</Badge>}
      </div>

      {j.date_posted && (
        <div className="text-[0.7rem] text-text2">Posted {j.date_posted}</div>
      )}

      <div className="flex items-center gap-1.5 mt-auto pt-1.5 border-t border-border" onClick={e => e.stopPropagation()}>
        <button
          className={cn(
            'bg-transparent border-none p-1 text-base cursor-pointer opacity-50 transition-all duration-150 rounded hover:opacity-100 hover:bg-surface2',
            j.bookmarked && 'text-orange opacity-100'
          )}
          onClick={() => onToggleBookmark(j.id)}
          title={j.bookmarked ? 'Remove favorite' : 'Add favorite'}
        >
          &#9733;
        </button>
        <span className="flex-1" />
        {j.recruiter_linkedin && (
          <a
            href={j.recruiter_linkedin}
            target="_blank"
            rel="noopener"
            className="text-xs px-2 py-1 rounded-[5px] bg-surface2 border border-border text-text2 no-underline font-medium hover:border-text2 hover:text-text transition-all"
          >
            in
          </a>
        )}
        <button
          className="text-xs px-2.5 py-1 rounded-[5px] bg-accent text-white font-medium hover:bg-accent2 transition-all active:scale-95"
          onClick={() => onApply(j)}
        >
          Apply &#8599;
        </button>
      </div>
    </div>
  )
}
