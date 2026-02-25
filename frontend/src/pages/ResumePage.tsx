import { useEffect, useState } from 'react'
import { useResumeStore } from '../hooks/useResume'

function parseBullets(raw: any): string[] {
  if (!raw) return []
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  if (Array.isArray(raw)) return raw.map((b: any) => typeof b === 'string' ? b : b.text || '')
  return []
}
import { downloadResume, deleteGenerated } from '../api/resume'
import Button from '../components/ui/Button'

type Tab = 'profile' | 'experience' | 'projects' | 'skills' | 'education' | 'generated'

const tabs: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
  { key: 'skills', label: 'Skills' },
  { key: 'education', label: 'Education' },
  { key: 'generated', label: 'Generated' },
]

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const store = useResumeStore()

  useEffect(() => { store.loadAll(); store.loadGenerated() }, [])

  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block mb-1 text-xs text-text2 uppercase tracking-wide'
  const sectionCls = 'bg-surface border border-border rounded-[10px] p-5 mb-4 animate-fadeIn'

  return (
    <div className="max-w-4xl mx-auto p-5">
      <h1 className="text-xl font-bold mb-4">Resume Manager</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border pb-px">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition-all duration-150 bg-transparent cursor-pointer ${
              activeTab === t.key
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-text2 hover:text-text hover:bg-surface2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && store.profile && (
        <div className={sectionCls}>
          <form onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            await store.updateProfile(Object.fromEntries(fd))
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input name="full_name" defaultValue={store.profile.full_name} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input name="location" defaultValue={store.profile.location || ''} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input name="phone" defaultValue={store.profile.phone || ''} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input name="email" defaultValue={store.profile.email || ''} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>LinkedIn</label>
                <input name="linkedin" defaultValue={store.profile.linkedin || ''} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>GitHub</label>
                <input name="github" defaultValue={store.profile.github || ''} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Portfolio</label>
                <input name="portfolio" defaultValue={store.profile.portfolio || ''} className={inputCls} />
              </div>
            </div>
            <label className={labelCls}>Summary</label>
            <textarea name="summary" defaultValue={store.profile.summary || ''} className={`${inputCls} min-h-[100px] resize-y font-sans`} />
            <Button type="submit" size="sm">Save Profile</Button>
          </form>
        </div>
      )}

      {/* Experience */}
      {activeTab === 'experience' && (
        <div>
          {store.experiences.map(exp => (
            <div key={exp.id} className={sectionCls}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold">{exp.title}</div>
                  <div className="text-sm text-accent">{exp.company}</div>
                  <div className="text-xs text-text2">{exp.date_start} — {exp.date_end || 'Present'}</div>
                </div>
                <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete?')) store.deleteExperience(exp.id) }}>Delete</Button>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-text2">
                {(parseBullets(exp.bullets)).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
          <AddExperienceForm onCreate={store.createExperience} />
        </div>
      )}

      {/* Projects */}
      {activeTab === 'projects' && (
        <div>
          {store.projects.map(p => (
            <div key={p.id} className={sectionCls}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-text2 italic">{p.tech_stack}</div>
                </div>
                <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete?')) store.deleteProject(p.id) }}>Delete</Button>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-text2">
                {(parseBullets(p.bullets)).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
          <AddProjectForm onCreate={store.createProject} />
        </div>
      )}

      {/* Skills */}
      {activeTab === 'skills' && (
        <div>
          {store.skills.map(s => (
            <div key={s.id} className={`${sectionCls} flex justify-between items-start`}>
              <div>
                <div className="font-semibold text-sm">{s.category}</div>
                <div className="text-xs text-text2 mt-1">{Array.isArray(s.items) ? s.items.map((i: any) => typeof i === 'string' ? i : i.item).join(', ') : s.items}</div>
              </div>
              <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete?')) store.deleteSkill(s.id) }}>Delete</Button>
            </div>
          ))}
          <AddSkillForm onCreate={store.createSkill} />
        </div>
      )}

      {/* Education */}
      {activeTab === 'education' && (
        <div>
          {store.education.map(edu => (
            <div key={edu.id} className={`${sectionCls} flex justify-between items-start`}>
              <div>
                <div className="font-semibold">{edu.degree}{edu.gpa ? ` (GPA: ${edu.gpa})` : ''}</div>
                <div className="text-sm text-accent">{edu.institution}</div>
                <div className="text-xs text-text2">{edu.date_start} — {edu.date_end}</div>
              </div>
              <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete?')) store.deleteEducation(edu.id) }}>Delete</Button>
            </div>
          ))}
          <AddEducationForm onCreate={store.createEducation} />
        </div>
      )}

      {/* Generated Resumes */}
      {activeTab === 'generated' && (
        <div>
          {store.generated.length === 0 ? (
            <div className="text-center py-8 text-text2">No resumes generated yet</div>
          ) : (
            store.generated.map(r => (
              <div key={r.id} className={`${sectionCls} flex items-center justify-between`}>
                <div>
                  <div className="font-medium text-sm">{r.filename}</div>
                  <div className="text-xs text-text2">{new Date(r.created_at).toLocaleString()}</div>
                  {r.tailoring_notes && <div className="text-xs text-text2 mt-1 italic">{r.tailoring_notes}</div>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadResume(r.id)}>Download</Button>
                  <Button size="sm" variant="danger" onClick={async () => {
                    if (!confirm('Delete?')) return
                    await deleteGenerated(r.id)
                    store.loadGenerated()
                  }}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// --- Inline add forms ---

function AddExperienceForm({ onCreate }: { onCreate: (d: any) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block mb-1 text-xs text-text2 uppercase tracking-wide'

  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Add Experience</Button>

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 mb-4 animate-fadeIn">
      <form onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        await onCreate({
          company: fd.get('company'),
          title: fd.get('title'),
          date_start: fd.get('date_start'),
          date_end: (fd.get('date_end') as string) || null,
          bullets: JSON.stringify((fd.get('bullets') as string).split('\n').filter(Boolean)),
          sort_order: 0,
        })
        setOpen(false)
      }}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Company</label><input name="company" required className={inputCls} /></div>
          <div><label className={labelCls}>Title</label><input name="title" required className={inputCls} /></div>
          <div><label className={labelCls}>Start Date</label><input name="date_start" required placeholder="e.g. Jan 2024" className={inputCls} /></div>
          <div><label className={labelCls}>End Date</label><input name="date_end" placeholder="Leave empty for Present" className={inputCls} /></div>
        </div>
        <label className={labelCls}>Bullets (one per line)</label>
        <textarea name="bullets" required className={`${inputCls} min-h-[100px] resize-y font-sans`} />
        <div className="flex gap-2">
          <Button type="submit" size="sm">Save</Button>
          <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

function AddProjectForm({ onCreate }: { onCreate: (d: any) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block mb-1 text-xs text-text2 uppercase tracking-wide'

  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Add Project</Button>

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 mb-4 animate-fadeIn">
      <form onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        await onCreate({
          name: fd.get('name'),
          tech_stack: fd.get('tech_stack'),
          bullets: JSON.stringify((fd.get('bullets') as string).split('\n').filter(Boolean)),
          sort_order: 0,
        })
        setOpen(false)
      }}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Project Name</label><input name="name" required className={inputCls} /></div>
          <div><label className={labelCls}>Tech Stack</label><input name="tech_stack" required className={inputCls} /></div>
        </div>
        <label className={labelCls}>Bullets (one per line)</label>
        <textarea name="bullets" required className={`${inputCls} min-h-[100px] resize-y font-sans`} />
        <div className="flex gap-2">
          <Button type="submit" size="sm">Save</Button>
          <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

function AddSkillForm({ onCreate }: { onCreate: (d: any) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block mb-1 text-xs text-text2 uppercase tracking-wide'

  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Add Skill Category</Button>

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 mb-4 animate-fadeIn">
      <form onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        await onCreate({ category: fd.get('category'), items: fd.get('items'), sort_order: 0 })
        setOpen(false)
      }}>
        <label className={labelCls}>Category</label>
        <input name="category" required placeholder="e.g. Languages" className={inputCls} />
        <label className={labelCls}>Items (comma-separated)</label>
        <input name="items" required placeholder="e.g. Python, TypeScript, Go" className={inputCls} />
        <div className="flex gap-2">
          <Button type="submit" size="sm">Save</Button>
          <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

function AddEducationForm({ onCreate }: { onCreate: (d: any) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const inputCls = 'w-full px-3 py-2 mb-3 bg-surface2 border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block mb-1 text-xs text-text2 uppercase tracking-wide'

  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Add Education</Button>

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 mb-4 animate-fadeIn">
      <form onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        await onCreate({
          degree: fd.get('degree'),
          institution: fd.get('institution'),
          gpa: (fd.get('gpa') as string) || null,
          date_start: fd.get('date_start'),
          date_end: fd.get('date_end'),
          is_default: true,
          sort_order: 0,
        })
        setOpen(false)
      }}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Degree</label><input name="degree" required className={inputCls} /></div>
          <div><label className={labelCls}>Institution</label><input name="institution" required className={inputCls} /></div>
          <div><label className={labelCls}>GPA</label><input name="gpa" placeholder="e.g. 3.8/4.0" className={inputCls} /></div>
          <div><label className={labelCls}>Start Date</label><input name="date_start" required placeholder="e.g. Aug 2020" className={inputCls} /></div>
          <div><label className={labelCls}>End Date</label><input name="date_end" required placeholder="e.g. May 2024" className={inputCls} /></div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">Save</Button>
          <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
