import type { JobStats } from '../../types/job'

const cards = [
  { key: 'total', label: 'Total', color: 'text-text', getValue: (s: JobStats) => s.total },
  { key: 'new', label: 'New', color: 'text-accent', getValue: (s: JobStats) => s.by_status?.new || 0 },
  { key: 'applied', label: 'Applied', color: 'text-blue', getValue: (s: JobStats) => s.by_status?.applied || 0 },
  { key: 'interviewing', label: 'Interviewing', color: 'text-orange', getValue: (s: JobStats) => s.by_status?.interviewing || 0 },
  { key: 'offer', label: 'Offers', color: 'text-green', getValue: (s: JobStats) => s.by_status?.offer || 0 },
  { key: 'rejected', label: 'Rejected', color: 'text-red', getValue: (s: JobStats) => s.by_status?.rejected || 0 },
  { key: 'week', label: 'This Week', color: 'text-blue', getValue: (s: JobStats) => s.applied_this_week },
]

export default function Dashboard({ stats }: { stats: JobStats | null }) {
  if (!stats) return null

  return (
    <div className="flex gap-2 px-5 py-3 flex-wrap border-b border-border">
      {cards.map(c => (
        <div key={c.key} className="bg-surface border border-border rounded-lg px-4 py-2 min-w-[90px] text-center hover:border-surface3 transition-colors">
          <div className={`text-xl font-bold ${c.color}`}>{c.getValue(stats)}</div>
          <div className="text-[0.7rem] text-text2 uppercase tracking-wide">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
