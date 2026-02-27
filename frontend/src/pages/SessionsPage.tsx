import { useState, useEffect } from 'react'
import { listSessions, deleteSession, type Session } from '../api/ai'
import Button from '../components/ui/Button'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface3 text-text2',
  tailoring: 'bg-accent/15 text-accent',
  scored: 'bg-orange/15 text-orange',
  finalized: 'bg-green/15 text-green',
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSessions().then(s => { setSessions(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session?')) return
    await deleteSession(id)
    setSessions(s => s.filter(x => x.id !== id))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center text-text2 text-sm py-12">Loading sessions...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Tailoring Sessions</h1>
        <a href="/resume-builder" target="_blank" rel="noopener">
          <Button size="sm">Open Resume Builder</Button>
        </a>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center text-text2 text-sm py-12 bg-surface rounded-lg border border-border">
          No sessions yet. Start tailoring from the Resume Builder.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border hover:border-accent/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.draft}`}>
                    {s.status}
                  </span>
                  <span className="text-xs text-text2">
                    {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-text truncate">
                  {s.job_description.slice(0, 120)}...
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-text2">
                  <span>Source: {s.resume_source}</span>
                  {s.events.length > 0 && <span>{s.events.length} event(s)</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="ml-3 text-text2 hover:text-red text-sm bg-transparent border-none cursor-pointer shrink-0"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
