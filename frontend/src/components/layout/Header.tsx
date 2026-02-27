import { Link, useLocation } from 'react-router-dom'
import Button from '../ui/Button'

interface Props {
  wsConnected: boolean
  onAddJob: () => void
  onExport: () => void
  onRefresh: () => void
  onSelect: () => void
  selectMode: boolean
}

export default function Header({ wsConnected, onAddJob, onExport, onRefresh, onSelect, selectMode }: Props) {
  const location = useLocation()

  return (
    <header className="flex justify-between items-center px-5 py-3 bg-surface border-b border-border sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-bold hover:opacity-80 transition-opacity">
          Job<span className="text-accent">Tracker</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
              location.pathname === '/' || location.pathname.startsWith('/job/')
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`}
          >
            Jobs
          </Link>
          <Link
            to="/resume"
            className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
              location.pathname === '/resume'
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`}
          >
            Resume Data
          </Link>
          <a
            href="/resume-builder"
            target="_blank"
            rel="noopener"
            className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150 text-text2 hover:text-text hover:bg-surface2"
          >
            Resume Builder
          </a>
          <Link
            to="/sessions"
            className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
              location.pathname === '/sessions'
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`}
          >
            Sessions
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${wsConnected ? 'bg-green' : 'bg-red'}`}
          title={wsConnected ? 'Connected' : 'Reconnecting...'}
        />
        {location.pathname === '/' && (
          <>
            {!selectMode && (
              <Button variant="outline" size="sm" onClick={onSelect}>Select</Button>
            )}
            <Button variant="outline" size="sm" onClick={onExport}>Export</Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>Refresh</Button>
            <Button size="sm" onClick={onAddJob}>+ Add Job</Button>
          </>
        )}
      </div>
    </header>
  )
}
