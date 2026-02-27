import { useResumeBuilderStore, type ResumeSection, type CustomSectionData } from '../../lib/resumeStore'
import Accordion from './Accordion'
import FormatPopover from './FormatPopover'
import SectionToolbar from './SectionToolbar'
import AddSectionMenu from './AddSectionMenu'
import { useDragReorder } from '../../lib/useDragReorder'
import { cn } from '../../lib/utils'
import { useRef, useEffect, useCallback } from 'react'

const inputCls = 'w-full px-2.5 py-1.5 bg-surface2 border border-border rounded-md text-text text-xs focus:outline-none focus:border-accent/50 transition-colors'
const labelCls = 'block mb-0.5 text-[0.65rem] text-text2 uppercase tracking-wider'
const checkCls = 'accent-accent w-3.5 h-3.5 cursor-pointer'

/** Inline trash icon (Lucide-style, stroke 1.5) */
function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

/** Auto-expanding textarea — grows/shrinks with content, no manual resize needed */
function AutoTextarea({ value, onChange, className, placeholder, minRows = 1 }: {
  value: string
  onChange: (val: string) => void
  className?: string
  placeholder?: string
  minRows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  // Resize on mount and whenever value changes externally
  useEffect(() => { resize() }, [value, resize])

  return (
    <textarea
      ref={ref}
      className={cn(inputCls, 'resize-none', className)}
      value={value}
      rows={minRows}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onInput={resize}
    />
  )
}

/**
 * Wrapper that places action buttons (format + optional delete) beside a form field.
 */
function Field({ elementId, section, children, className, onDelete, hasLabel = true }: {
  elementId: string
  section: string
  children: React.ReactNode
  className?: string
  onDelete?: () => void
  hasLabel?: boolean
}) {
  return (
    <div className={cn('group group/field relative flex items-start gap-0.5', className)}>
      <div className="flex-1 min-w-0">{children}</div>
      <div className={cn(
        'flex items-center shrink-0',
        hasLabel ? 'mt-3.5' : 'mt-0.5',
      )}>
        <FormatPopover elementId={elementId} section={section} />
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-text2/40 hover:text-red hover:bg-red/10 bg-transparent border-none cursor-pointer opacity-0 group-hover/field:opacity-100 transition-all"
            title="Remove"
          >
            <TrashIcon size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function ResumeForm() {
  const store = useResumeBuilderStore()
  const sortedSections = [...store.sections].sort((a, b) => a.order - b.order)

  const { dragHandleProps, dropTargetProps, dragOverId } = useDragReorder({
    items: sortedSections,
    getId: s => s.id,
    onReorder: ids => store.reorderSections(ids),
  })

  function renderSectionContent(section: ResumeSection) {
    switch (section.type) {
      case 'summary': return <SummaryContent />
      case 'skills': return <SkillsContent />
      case 'experience': return <ExperienceContent />
      case 'projects': return <ProjectsContent />
      case 'education': return <EducationContent />
      case 'custom': return <CustomContent sectionId={section.id} section={section} />
      default: return null
    }
  }

  function getBadge(section: ResumeSection): number | undefined {
    switch (section.type) {
      case 'skills': return store.skills.filter(s => s.included).length
      case 'experience': return store.experiences.filter(e => e.included).length
      case 'projects': return store.projects.filter(p => p.included).length
      case 'education': return store.education.filter(e => e.included).length
      case 'custom': {
        const cs = store.customSections[section.id]
        return cs ? cs.items.filter(i => i.included).length : 0
      }
      default: return undefined
    }
  }

  return (
    <div className="h-full bg-surface flex flex-col">
      <div className="overflow-y-auto flex-1">
        {/* Contact Info — always first, not reorderable */}
        <Accordion title="Contact Info" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            <Field elementId="contact-name" section="contact" className="col-span-2">
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={store.contact.fullName}
                onChange={e => store.setContact({ fullName: e.target.value })} />
            </Field>
            <Field elementId="contact-email" section="contact">
              <label className={labelCls}>Email</label>
              <input className={inputCls} value={store.contact.email}
                onChange={e => store.setContact({ email: e.target.value })} />
            </Field>
            <Field elementId="contact-phone" section="contact">
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={store.contact.phone}
                onChange={e => store.setContact({ phone: e.target.value })} />
            </Field>
            <Field elementId="contact-location" section="contact">
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={store.contact.location}
                onChange={e => store.setContact({ location: e.target.value })} />
            </Field>
            <Field elementId="contact-linkedin" section="contact">
              <label className={labelCls}>LinkedIn</label>
              <input className={inputCls} value={store.contact.linkedin}
                onChange={e => store.setContact({ linkedin: e.target.value })} />
            </Field>
            <Field elementId="contact-github" section="contact">
              <label className={labelCls}>GitHub</label>
              <input className={inputCls} value={store.contact.github}
                onChange={e => store.setContact({ github: e.target.value })} />
            </Field>
            <Field elementId="contact-portfolio" section="contact">
              <label className={labelCls}>Portfolio</label>
              <input className={inputCls} value={store.contact.portfolio}
                onChange={e => store.setContact({ portfolio: e.target.value })} />
            </Field>
          </div>
        </Accordion>

        {/* Dynamic sections */}
        {sortedSections.map((section, idx) => (
          <div
            key={section.id}
            {...dropTargetProps(section.id)}
            className={cn(dragOverId === section.id && 'ring-2 ring-accent/30 rounded')}
          >
            <Accordion
              title={section.header}
              badge={getBadge(section)}
              defaultOpen={section.type === 'summary'}
              dimmed={!section.visible}
              titleRight={
                <SectionToolbar
                  section={section}
                  mode="form"
                  onMoveUp={() => store.moveSection(section.id, 'up')}
                  onMoveDown={() => store.moveSection(section.id, 'down')}
                  onToggleVisible={() => store.toggleSectionVisible(section.id)}
                  onDelete={section.type === 'custom' ? () => store.removeSection(section.id) : undefined}
                  isFirst={idx === 0}
                  isLast={idx === sortedSections.length - 1}
                  dragHandleProps={dragHandleProps(section.id)}
                />
              }
            >
              {renderSectionContent(section)}
            </Accordion>
          </div>
        ))}

        {/* Add Section button */}
        <div className="p-3">
          <AddSectionMenu />
        </div>
      </div>
    </div>
  )
}

// --- Section content components ---

function SummaryContent() {
  const store = useResumeBuilderStore()
  return (
    <Field elementId="summary" section="summary">
      <AutoTextarea
        value={store.summary}
        onChange={val => store.setSummary(val)}
        className="font-sans text-xs leading-relaxed"
        minRows={3}
      />
    </Field>
  )
}

/** Reusable left-side controls: checkbox + move up/down arrows. */
function ItemControls({ included, onToggle, onMoveUp, onMoveDown, isFirst, isLast, onRemove }: {
  included: boolean; onToggle: () => void
  onMoveUp: () => void; onMoveDown: () => void
  isFirst: boolean; isLast: boolean; onRemove: () => void
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-0.5 mt-0.5">
        <input type="checkbox" checked={included} onChange={onToggle} className={checkCls} />
        <div className="flex flex-col opacity-0 group-hover/card:opacity-100 transition-opacity">
          <button type="button" onClick={onMoveUp} disabled={isFirst}
            className="text-text2/60 hover:text-text bg-transparent border-none cursor-pointer text-[0.6rem] leading-none disabled:opacity-20 disabled:cursor-not-allowed p-0"
            title="Move up">&#9650;</button>
          <button type="button" onClick={onMoveDown} disabled={isLast}
            className="text-text2/60 hover:text-text bg-transparent border-none cursor-pointer text-[0.6rem] leading-none disabled:opacity-20 disabled:cursor-not-allowed p-0"
            title="Move down">&#9660;</button>
        </div>
      </div>
    </>
  )
}

const removeBtnCls = "text-text2/40 hover:text-red-400 bg-transparent border-none cursor-pointer text-sm mt-1 opacity-0 group-hover/card:opacity-100 transition-all"
const addBtnCls = "text-xs text-accent hover:text-accent2 bg-transparent border border-dashed border-border hover:border-accent rounded-md px-3 py-1.5 cursor-pointer transition-all w-full"

function SkillsContent() {
  const store = useResumeBuilderStore()
  return (
    <div className="space-y-2">
      {store.skills.map((sk, i) => (
        <div key={sk.id} className="group/card flex items-start gap-2">
          <ItemControls
            included={sk.included} onToggle={() => store.toggleSkill(sk.id)}
            onMoveUp={() => store.moveSkill(sk.id, 'up')} onMoveDown={() => store.moveSkill(sk.id, 'down')}
            isFirst={i === 0} isLast={i === store.skills.length - 1} onRemove={() => store.removeSkill(sk.id)}
          />
          <div className="flex-1 space-y-1">
            <Field elementId={`skill-${sk.id}-category`} section="skill" hasLabel={false} onDelete={() => store.removeSkill(sk.id)}>
              <input className={inputCls} placeholder="Category" value={sk.category}
                onChange={e => store.updateSkill(sk.id, { category: e.target.value })} />
            </Field>
            <Field elementId={`skill-${sk.id}-items`} section="skill" hasLabel={false}>
              <input className={inputCls} placeholder="Items (comma-separated)" value={sk.items}
                onChange={e => store.updateSkill(sk.id, { items: e.target.value })} />
            </Field>
          </div>
          <button type="button" onClick={() => store.removeSkill(sk.id)} className={removeBtnCls} title="Remove">&times;</button>
        </div>
      ))}
      <button type="button" onClick={store.addSkill} className={addBtnCls}>+ Add Skill Category</button>
    </div>
  )
}

function ExperienceContent() {
  const store = useResumeBuilderStore()
  return (
    <div className="space-y-3">
      {store.experiences.map((exp, i) => (
        <ExperienceCard key={exp.id} exp={exp} index={i} total={store.experiences.length} />
      ))}
      <button
        type="button"
        onClick={() => store.addExperience()}
        className="text-xs text-accent hover:text-accent2 bg-transparent border border-dashed border-border hover:border-accent rounded-md px-3 py-1.5 cursor-pointer transition-all w-full">
        + Add Experience
      </button>
    </div>
  )
}

function ProjectsContent() {
  const store = useResumeBuilderStore()
  return (
    <div className="space-y-3">
      {store.projects.map((proj, i) => (
        <ProjectCard key={proj.id} proj={proj} index={i} total={store.projects.length} />
      ))}
      <button
        type="button"
        onClick={() => store.addProject()}
        className="text-xs text-accent hover:text-accent2 bg-transparent border border-dashed border-border hover:border-accent rounded-md px-3 py-1.5 cursor-pointer transition-all w-full">
        + Add Project
      </button>
    </div>
  )
}

function EducationContent() {
  const store = useResumeBuilderStore()
  return (
    <div className="space-y-3">
      {store.education.map((edu, i) => (
        <div key={edu.id} className="group/card flex items-start gap-2 p-2 rounded-lg bg-surface2/50 border border-border/50">
          <ItemControls
            included={edu.included} onToggle={() => store.toggleEducation(edu.id)}
            onMoveUp={() => store.moveEducation(edu.id, 'up')} onMoveDown={() => store.moveEducation(edu.id, 'down')}
            isFirst={i === 0} isLast={i === store.education.length - 1} onRemove={() => store.removeEducation(edu.id)}
          />
          <div className="flex-1 space-y-1">
            <Field elementId={`edu-${edu.id}-institution`} section="edu">
              <input className={inputCls} placeholder="Institution" value={edu.institution}
                onChange={e => store.updateEducation(edu.id, { institution: e.target.value })} />
            </Field>
            <Field elementId={`edu-${edu.id}-degree`} section="edu">
              <input className={inputCls} placeholder="Degree" value={edu.degree}
                onChange={e => store.updateEducation(edu.id, { degree: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-1">
              <input className={inputCls} placeholder="GPA" value={edu.gpa}
                onChange={e => store.updateEducation(edu.id, { gpa: e.target.value })} />
              <Field elementId={`edu-${edu.id}-date`} section="edu">
                <input className={inputCls} placeholder="Start" value={edu.dateStart}
                  onChange={e => store.updateEducation(edu.id, { dateStart: e.target.value })} />
              </Field>
              <input className={inputCls} placeholder="End" value={edu.dateEnd}
                onChange={e => store.updateEducation(edu.id, { dateEnd: e.target.value })} />
            </div>
          </div>
          <button type="button" onClick={() => store.removeEducation(edu.id)} className={removeBtnCls} title="Remove">&times;</button>
        </div>
      ))}
      <button type="button" onClick={() => store.addEducation()} className={addBtnCls}>+ Add Education</button>
    </div>
  )
}

function CustomContent({ sectionId, section }: { sectionId: string; section: ResumeSection }) {
  const store = useResumeBuilderStore()
  const customData = store.customSections[sectionId]
  if (!customData) return null

  const layout = section.layout || 'bullets'

  if (layout === 'text') {
    const item = customData.items[0]
    return (
      <div>
        {item ? (
          <AutoTextarea
            value={item.text}
            onChange={val => store.updateCustomItem(sectionId, item.id, { text: val })}
            className="font-sans text-xs leading-relaxed"
            minRows={3}
          />
        ) : (
          <button type="button" onClick={() => store.addCustomItem(sectionId)}
            className="text-xs text-accent hover:text-accent2 bg-transparent border border-dashed border-border hover:border-accent rounded-md px-3 py-1.5 cursor-pointer transition-all w-full">
            + Add Content
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {customData.items.map(item => (
        <div key={item.id} className="flex items-start gap-2 group/custom-item">
          <input type="checkbox" checked={item.included} onChange={() => store.toggleCustomItem(sectionId, item.id)} className={`${checkCls} mt-1.5`} />
          <div className="flex-1 space-y-1">
            {layout === 'keyvalue' && (
              <input className={inputCls} placeholder="Label (e.g. English)" value={item.label || ''}
                onChange={e => store.updateCustomItem(sectionId, item.id, { label: e.target.value })} />
            )}
            <div className="flex items-start gap-1">
              <AutoTextarea
                value={item.text}
                onChange={val => store.updateCustomItem(sectionId, item.id, { text: val })}
                placeholder={layout === 'keyvalue' ? 'Value (e.g. Native)' : 'Enter text...'}
                className="text-[0.7rem] leading-snug py-1 flex-1"
              />
              <button type="button" onClick={() => store.removeCustomItem(sectionId, item.id)}
                className="p-1 rounded text-text2/40 hover:text-red hover:bg-red/10 bg-transparent border-none cursor-pointer opacity-0 group-hover/custom-item:opacity-100 transition-all mt-0.5">
                <TrashIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => store.addCustomItem(sectionId)}
        className="text-xs text-accent hover:text-accent2 bg-transparent border border-dashed border-border hover:border-accent rounded-md px-3 py-1.5 cursor-pointer transition-all w-full">
        + Add Item
      </button>
    </div>
  )
}

// --- Sub-components ---

function ExperienceCard({ exp, index, total }: { exp: ReturnType<typeof useResumeBuilderStore.getState>['experiences'][0]; index: number; total: number }) {
  const { updateExperience, toggleExperience, removeExperience, moveExperience, addExperienceBullet, updateExperienceBullet, removeExperienceBullet } = useResumeBuilderStore()

  return (
    <div className={cn(
      'group/card p-2.5 rounded-lg border transition-all',
      exp.included ? 'bg-surface2/50 border-border/50' : 'bg-surface2/20 border-border/20 opacity-60'
    )}>
      <div className="flex items-start gap-2">
        <ItemControls
          included={exp.included} onToggle={() => toggleExperience(exp.id)}
          onMoveUp={() => moveExperience(exp.id, 'up')} onMoveDown={() => moveExperience(exp.id, 'down')}
          isFirst={index === 0} isLast={index === total - 1} onRemove={() => removeExperience(exp.id)}
        />
        <div className="flex-1 space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <Field elementId={`exp-${exp.id}-title`} section="exp">
              <input className={inputCls} placeholder="Title" value={exp.title}
                onChange={e => updateExperience(exp.id, { title: e.target.value })} />
            </Field>
            <Field elementId={`exp-${exp.id}-company`} section="exp">
              <input className={inputCls} placeholder="Company" value={exp.company}
                onChange={e => updateExperience(exp.id, { company: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Field elementId={`exp-${exp.id}-date`} section="exp">
              <input className={inputCls} placeholder="Start date" value={exp.dateStart}
                onChange={e => updateExperience(exp.id, { dateStart: e.target.value })} />
            </Field>
            <input className={inputCls} placeholder="End date (or Present)" value={exp.dateEnd}
              onChange={e => updateExperience(exp.id, { dateEnd: e.target.value })} />
          </div>

          {/* Bullet points */}
          <div className="space-y-1 mt-1">
            {exp.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-1 group/bullet">
                <span className="text-text2 text-xs mt-1.5 select-none">&bull;</span>
                <Field
                  elementId={`exp-${exp.id}-bullet-${i}`}
                  section="exp"
                  hasLabel={false}
                  onDelete={() => removeExperienceBullet(exp.id, i)}
                  className="flex-1"
                >
                  <AutoTextarea
                    value={b}
                    onChange={val => updateExperienceBullet(exp.id, i, val)}
                    className="text-[0.7rem] leading-snug py-1"
                  />
                </Field>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addExperienceBullet(exp.id)}
              className="text-[0.65rem] text-accent/70 hover:text-accent bg-transparent border-none cursor-pointer transition-colors"
            >
              + Add Bullet
            </button>
          </div>
        </div>
        <button type="button" onClick={() => removeExperience(exp.id)} className={removeBtnCls} title="Remove">&times;</button>
      </div>
    </div>
  )
}

function ProjectCard({ proj, index, total }: { proj: ReturnType<typeof useResumeBuilderStore.getState>['projects'][0]; index: number; total: number }) {
  const { updateProject, toggleProject, removeProject, moveProject, addProjectBullet, updateProjectBullet, removeProjectBullet } = useResumeBuilderStore()

  return (
    <div className={cn(
      'group/card p-2.5 rounded-lg border transition-all',
      proj.included ? 'bg-surface2/50 border-border/50' : 'bg-surface2/20 border-border/20 opacity-60'
    )}>
      <div className="flex items-start gap-2">
        <ItemControls
          included={proj.included} onToggle={() => toggleProject(proj.id)}
          onMoveUp={() => moveProject(proj.id, 'up')} onMoveDown={() => moveProject(proj.id, 'down')}
          isFirst={index === 0} isLast={index === total - 1} onRemove={() => removeProject(proj.id)}
        />
        <div className="flex-1 space-y-1">
          <Field elementId={`proj-${proj.id}-name`} section="proj">
            <input className={inputCls} placeholder="Project Name" value={proj.name}
              onChange={e => updateProject(proj.id, { name: e.target.value })} />
          </Field>
          <Field elementId={`proj-${proj.id}-tech`} section="proj">
            <input className={inputCls} placeholder="Tech Stack" value={proj.techStack}
              onChange={e => updateProject(proj.id, { techStack: e.target.value })} />
          </Field>

          <div className="space-y-1 mt-1">
            {proj.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-1 group/bullet">
                <span className="text-text2 text-xs mt-1.5 select-none">&bull;</span>
                <Field
                  elementId={`proj-${proj.id}-bullet-${i}`}
                  section="proj"
                  hasLabel={false}
                  onDelete={() => removeProjectBullet(proj.id, i)}
                  className="flex-1"
                >
                  <AutoTextarea
                    value={b}
                    onChange={val => updateProjectBullet(proj.id, i, val)}
                    className="text-[0.7rem] leading-snug py-1"
                  />
                </Field>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addProjectBullet(proj.id)}
              className="text-[0.65rem] text-accent/70 hover:text-accent bg-transparent border-none cursor-pointer transition-colors"
            >
              + Add Bullet
            </button>
          </div>
        </div>
        <button type="button" onClick={() => removeProject(proj.id)} className={removeBtnCls} title="Remove">&times;</button>
      </div>
    </div>
  )
}
