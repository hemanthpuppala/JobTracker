import { cn } from '../../lib/utils'

const filters = [
  { key: 'all', label: 'All' },
  { key: 'bookmarked', label: 'Favorites' },
  { key: 'applied', label: 'Applied' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
]

interface Props {
  active: string
  search: string
  onFilter: (f: string) => void
  onSearch: (s: string) => void
}

export default function Filters({ active, search, onFilter, onSearch }: Props) {
  return (
    <div className="flex gap-2 px-5 py-3 flex-wrap items-center border-b border-border">
      <input
        type="text"
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search roles, companies, skills..."
        className="bg-surface2 border border-border rounded-md px-3 py-1.5 text-sm text-text w-56 focus:outline-none focus:border-accent/50 transition-colors"
      />
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onFilter(f.key)}
          className={cn(
            'px-3 py-1 rounded-full text-xs border transition-all duration-150 select-none',
            active === f.key
              ? 'bg-accent border-accent text-white'
              : 'bg-surface2 border-border text-text2 hover:border-text2 hover:text-text'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
