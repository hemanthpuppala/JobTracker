import { useResumeBuilderStore } from '../../lib/resumeStore'
import Accordion from './Accordion'
import FormatPopover from './FormatPopover'
import { cn } from '../../lib/utils'

const inputCls = 'w-full px-2.5 py-1.5 bg-surface2 border border-border rounded-md text-text text-xs focus:outline-none focus:border-accent/50 transition-colors'
const labelCls = 'block mb-0.5 text-[0.65rem] text-text2 uppercase tracking-wider'
const checkCls = 'accent-accent w-3.5 h-3.5 cursor-pointer'

/** Wrapper that places a FormatPopover beside a form field */
function Field({ elementId, section, children, className }: {
  elementId: string
  section: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('group relative flex items-start gap-1', className)}>
      <div className="flex-1">{children}</div>
      <div className="mt-4">
        <FormatPopover elementId={elementId} section={section} />
      </div>
    </div>
  )
}

export default function ResumeForm() {
  const store = useResumeBuilderStore()

  return (
    <div className="h-full bg-surface flex flex-col">
      <div className="overflow-y-auto flex-1">
        {/* Contact Info */}
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

        {/* Summary */}
        <Accordion title="Summary" defaultOpen>
          <Field elementId="summary" section="summary">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y font-sans text-xs leading-relaxed`}
              value={store.summary}
              onChange={e => store.setSummary(e.target.value)}
            />
          </Field>
        </Accordion>

        {/* Skills */}
        <Accordion title="Technical Skills" badge={store.skills.filter(s => s.included).length}>
          <div className="space-y-2">
            {store.skills.map(sk => (
              <div key={sk.id} className="flex items-start gap-2 group/skill">
                <input type="checkbox" checked={sk.included} onChange={() => store.toggleSkill(sk.id)} className={`${checkCls} mt-1.5`} />
                <div className="flex-1 space-y-1">
                  <Field elementId={`skill-${sk.id}-category`} section="skill">
                    <input
                      className={inputCls}
                      placeholder="Category"
                      value={sk.category}
                      onChange={e => store.updateSkill(sk.id, { category: e.target.value })}
                    />
                  </Field>
                  <Field elementId={`skill-${sk.id}-items`} section="skill">
                    <input
                      className={inputCls}
                      placeholder="Items (comma-separated)"
                      value={sk.items}
                      onChange={e => store.updateSkill(sk.id, { items: e.target.value })}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => store.removeSkill(sk.id)}
                  className="text-red/60 hover:text-red text-xs bg-transparent border-none cursor-pointer opacity-0 group-hover/skill:opacity-100 transition-opacity mt-1.5"
                  title="Remove"
                >
                  &#10005;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={store.addSkill}
              className="text-xs text-accent hover:text-accent2 bg-transparent border border-dashed border-border hover:border-accent rounded-md px-3 py-1.5 cursor-pointer transition-all w-full"
            >
              + Add Skill Category
            </button>
          </div>
        </Accordion>

        {/* Experience */}
        <Accordion title="Experience" badge={store.experiences.filter(e => e.included).length}>
          <div className="space-y-3">
            {store.experiences.map(exp => (
              <ExperienceCard key={exp.id} exp={exp} />
            ))}
          </div>
        </Accordion>

        {/* Projects */}
        <Accordion title="Projects" badge={store.projects.filter(p => p.included).length}>
          <div className="space-y-3">
            {store.projects.map(proj => (
              <ProjectCard key={proj.id} proj={proj} />
            ))}
          </div>
        </Accordion>

        {/* Education */}
        <Accordion title="Education" badge={store.education.filter(e => e.included).length}>
          <div className="space-y-3">
            {store.education.map(edu => (
              <div key={edu.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface2/50 border border-border/50">
                <input type="checkbox" checked={edu.included} onChange={() => store.toggleEducation(edu.id)} className={`${checkCls} mt-1`} />
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
              </div>
            ))}
          </div>
        </Accordion>
      </div>
    </div>
  )
}

// --- Sub-components ---

function ExperienceCard({ exp }: { exp: ReturnType<typeof useResumeBuilderStore.getState>['experiences'][0] }) {
  const { updateExperience, toggleExperience, addExperienceBullet, updateExperienceBullet, removeExperienceBullet } = useResumeBuilderStore()

  return (
    <div className={cn(
      'p-2.5 rounded-lg border transition-all',
      exp.included ? 'bg-surface2/50 border-border/50' : 'bg-surface2/20 border-border/20 opacity-60'
    )}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={exp.included} onChange={() => toggleExperience(exp.id)} className={`${checkCls} mt-1`} />
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
                <div className="flex-1 flex items-start gap-1 group">
                  <textarea
                    className={`${inputCls} flex-1 min-h-[28px] resize-y text-[0.7rem] leading-snug py-1`}
                    value={b}
                    rows={1}
                    onChange={e => updateExperienceBullet(exp.id, i, e.target.value)}
                    onInput={e => {
                      const el = e.target as HTMLTextAreaElement
                      el.style.height = 'auto'
                      el.style.height = el.scrollHeight + 'px'
                    }}
                  />
                  <div className="mt-0.5">
                    <FormatPopover elementId={`exp-${exp.id}-bullet-${i}`} section="exp" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeExperienceBullet(exp.id, i)}
                  className="text-red/50 hover:text-red text-[0.6rem] bg-transparent border-none cursor-pointer opacity-0 group-hover/bullet:opacity-100 transition-opacity mt-1.5"
                >
                  &#10005;
                </button>
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
      </div>
    </div>
  )
}

function ProjectCard({ proj }: { proj: ReturnType<typeof useResumeBuilderStore.getState>['projects'][0] }) {
  const { updateProject, toggleProject, addProjectBullet, updateProjectBullet, removeProjectBullet } = useResumeBuilderStore()

  return (
    <div className={cn(
      'p-2.5 rounded-lg border transition-all',
      proj.included ? 'bg-surface2/50 border-border/50' : 'bg-surface2/20 border-border/20 opacity-60'
    )}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={proj.included} onChange={() => toggleProject(proj.id)} className={`${checkCls} mt-1`} />
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
                <div className="flex-1 flex items-start gap-1 group">
                  <textarea
                    className={`${inputCls} flex-1 min-h-[28px] resize-y text-[0.7rem] leading-snug py-1`}
                    value={b}
                    rows={1}
                    onChange={e => updateProjectBullet(proj.id, i, e.target.value)}
                    onInput={e => {
                      const el = e.target as HTMLTextAreaElement
                      el.style.height = 'auto'
                      el.style.height = el.scrollHeight + 'px'
                    }}
                  />
                  <div className="mt-0.5">
                    <FormatPopover elementId={`proj-${proj.id}-bullet-${i}`} section="proj" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeProjectBullet(proj.id, i)}
                  className="text-red/50 hover:text-red text-[0.6rem] bg-transparent border-none cursor-pointer opacity-0 group-hover/bullet:opacity-100 transition-opacity mt-1.5"
                >
                  &#10005;
                </button>
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
      </div>
    </div>
  )
}
