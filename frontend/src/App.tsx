import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/layout/Header'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import ResumePage from './pages/ResumePage'
import ResumeBuilderPage from './pages/ResumeBuilderPage'
import { useWebSocket } from './hooks/useWebSocket'
import { useJobsStore } from './hooks/useJobs'
import { exportCSV } from './api/jobs'

export default function App() {
  const wsConnected = useWebSocket()
  const { load, selectMode, setSelectMode } = useJobsStore()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const location = useLocation()

  // Resume builder gets its own full-screen layout (no header)
  if (location.pathname === '/resume-builder') {
    return (
      <Routes>
        <Route path="/resume-builder" element={<ResumeBuilderPage />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header
        wsConnected={wsConnected}
        onAddJob={() => setAddModalOpen(true)}
        onExport={exportCSV}
        onRefresh={load}
        onSelect={() => setSelectMode(true)}
        selectMode={selectMode}
      />
      <Routes>
        <Route path="/" element={<JobsPage addModalOpen={addModalOpen} setAddModalOpen={setAddModalOpen} />} />
        <Route path="/job/:id" element={<JobDetailPage />} />
        <Route path="/resume" element={<ResumePage />} />
      </Routes>
    </div>
  )
}
