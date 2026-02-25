/**
 * Interactive resume editor — renders the resume as live, editable HTML.
 * Uses TipTap for rich text editing. All edits sync to the shared Zustand store.
 *
 * Layout and sizes are driven exclusively by buildHtmlStyles() from resumeStyles.ts —
 * the same ResumeStyleConfig that drives the PDF renderer.
 */
import { useRef, useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useResumeBuilderStore, resolveElementStyle, type ResumeSection } from '../../lib/resumeStore'
import { buildHtmlStyles } from '../../lib/resumeStyles'
import { useDragReorder } from '../../lib/useDragReorder'
import SectionToolbar from './SectionToolbar'
import AddSectionMenu from './AddSectionMenu'
import { cn } from '../../lib/utils'
import FormatPanel from './FormatPanel'

// Shared TipTap extensions — created once, reused by all InlineField instances
const tiptapExtensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
  }),
  Underline,
]

/** Normalize TipTap getText() — strips trailing newlines that TipTap adds for paragraphs */
function normalizeText(text: string): string {
  return text.replace(/\n+$/, '')
}

// --- Inline TipTap field ---

function InlineField({
  value,
  onChange,
  elementId,
  className,
  style,
}: {
  value: string
  onChange: (text: string) => void
  elementId: string
  className?: string
  style?: React.CSSProperties
}) {
  // Granular selectors — only re-render when THIS field's data changes
  const selectedElementId = useResumeBuilderStore(s => s.selectedElementId)
  const setSelectedElement = useResumeBuilderStore(s => s.setSelectedElement)
  const setRichContent = useResumeBuilderStore(s => s.setRichContent)
  const elStyleOverride = useResumeBuilderStore(s => s.elementStyles[elementId])
  const hasRichContent = useResumeBuilderStore(s => !!s.richContent[elementId])
  const richJson = useResumeBuilderStore(s => s.richContent[elementId])

  const isSelected = selectedElementId === elementId
  const elOverrides = resolveElementStyle(elStyleOverride)

  // Track whether we're currently pushing a change TO the store,
  // so the sync effect doesn't try to push it back into the editor.
  const isLocalUpdate = useRef(false)

  // Keep a ref to always have the latest onChange — avoids stale closure in TipTap
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: richJson || value || '',
    editorProps: {
      attributes: {
        class: cn('outline-none min-w-[20px]', className),
      },
    },
    onUpdate: ({ editor: ed }) => {
      isLocalUpdate.current = true
      const plainText = normalizeText(ed.getText())
      onChangeRef.current(plainText)

      // Persist rich content only when formatting marks exist
      const json = ed.getJSON()
      const hasMark = JSON.stringify(json).includes('"marks"')
      if (hasMark) {
        setRichContent(elementId, json)
      } else if (hasRichContent) {
        setRichContent(elementId, null)
      }

      // Allow sync effect to run again on next external change
      requestAnimationFrame(() => { isLocalUpdate.current = false })
    },
    onFocus: () => {
      setSelectedElement(elementId)
    },
  })

  // Sync external value changes INTO the editor (e.g. from Form mode edits)
  const prevValue = useRef(value)
  useEffect(() => {
    if (!editor || isLocalUpdate.current) {
      prevValue.current = value
      return
    }
    if (value !== prevValue.current) {
      const editorText = normalizeText(editor.getText())
      if (value !== editorText) {
        editor.commands.setContent(value || '', { emitUpdate: false })
      }
    }
    prevValue.current = value
  }, [value, editor])

  if (!editor) return null

  return (
    <div
      className={cn(
        'group/field relative rounded-sm',
        isSelected ? 'ring-1 ring-blue-400/60 bg-blue-50/20' : 'hover:ring-1 hover:ring-gray-300/50',
      )}
      style={{ ...style, ...elOverrides }}
    >
      {editor && (
        <BubbleMenu editor={editor}>
          <FloatingBar editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

// --- Floating toolbar ---

function FloatingBar({ editor }: { editor: any }) {
  const btn = (active: boolean) =>
    cn(
      'px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer border-none',
      active ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100',
    )

  return (
    <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg p-0.5">
      <button className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </button>
      <button className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </button>
      <button className={btn(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </button>
    </div>
  )
}

// --- Section renderers ---

function SummarySectionContent({ h, store }: { h: any; store: any }) {
  const { summary, sectionHeaders } = store
  if (!summary) return null
  return (
    <>
      <InlineField
        value={sectionHeaders.summary}
        onChange={(text) => store.setSectionHeader('summary', text)}
        elementId="header-summary"
        style={h.sectionHeader}
      />
      <InlineField
        value={summary}
        onChange={(text) => store.setSummary(text)}
        elementId="summary"
        style={h.summary}
      />
    </>
  )
}

function SkillsSectionContent({ h, store }: { h: any; store: any }) {
  const incSkill = store.skills.filter((sk: any) => sk.included)
  if (incSkill.length === 0) return null
  return (
    <>
      <InlineField
        value={store.sectionHeaders.skills}
        onChange={(text) => store.setSectionHeader('skills', text)}
        elementId="header-skills"
        style={h.sectionHeader}
      />
      {incSkill.map((sk: any) => (
        <div key={sk.id} style={h.skillParagraph}>
          <InlineField
            value={sk.category}
            onChange={(text) => store.updateSkill(sk.id, { category: text })}
            elementId={`skill-${sk.id}-category`}
            style={{ ...h.skillLabel, display: 'inline-block' }}
          />
          <span style={h.skillLabel}>: </span>
          <InlineField
            value={sk.items}
            onChange={(text) => store.updateSkill(sk.id, { items: text })}
            elementId={`skill-${sk.id}-items`}
            style={{ ...h.skillValue, display: 'inline-block' }}
          />
        </div>
      ))}
    </>
  )
}

function ExperienceSectionContent({ h, store }: { h: any; store: any }) {
  const incExp = store.experiences.filter((e: any) => e.included)
  if (incExp.length === 0) return null
  return (
    <>
      <InlineField
        value={store.sectionHeaders.experience}
        onChange={(text) => store.setSectionHeader('experience', text)}
        elementId="header-experience"
        style={h.sectionHeader}
      />
      {incExp.map((exp: any) => (
        <div key={exp.id}>
          <div style={h.expTitleDateRow}>
            <div style={h.expTitleCol}>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <InlineField
                  value={exp.company}
                  onChange={(text) => store.updateExperience(exp.id, { company: text })}
                  elementId={`exp-${exp.id}-company`}
                  style={h.expCompany}
                />
                <span style={h.expTitle}> | </span>
                <InlineField
                  value={exp.title}
                  onChange={(text) => store.updateExperience(exp.id, { title: text })}
                  elementId={`exp-${exp.id}-title`}
                  style={h.expTitle}
                />
              </div>
            </div>
            <InlineField
              value={`${exp.dateStart} - ${exp.dateEnd || 'Present'}`}
              onChange={(text) => {
                const parts = text.split(' - ')
                store.updateExperience(exp.id, {
                  dateStart: parts[0] || '',
                  dateEnd: parts.slice(1).join(' - ') || '',
                })
              }}
              elementId={`exp-${exp.id}-date`}
              style={h.expDate}
            />
          </div>
          {exp.bullets.filter(Boolean).map((b: string, i: number) => (
            <div key={i} style={h.expBulletRow}>
              <span style={h.expBulletDot}>{'\u2022'}</span>
              <InlineField
                value={b}
                onChange={(text) => store.updateExperienceBullet(exp.id, i, text)}
                elementId={`exp-${exp.id}-bullet-${i}`}
                style={h.expBulletText}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function ProjectsSectionContent({ h, store }: { h: any; store: any }) {
  const incProj = store.projects.filter((p: any) => p.included)
  if (incProj.length === 0) return null
  return (
    <>
      <InlineField
        value={store.sectionHeaders.projects}
        onChange={(text) => store.setSectionHeader('projects', text)}
        elementId="header-projects"
        style={h.sectionHeader}
      />
      {incProj.map((proj: any) => (
        <div key={proj.id}>
          <div style={h.projRow}>
            <InlineField
              value={proj.name}
              onChange={(text) => store.updateProject(proj.id, { name: text })}
              elementId={`proj-${proj.id}-name`}
              style={{ ...h.projName, display: 'inline-block' }}
            />
            <span style={h.projTech}> | </span>
            <InlineField
              value={proj.techStack}
              onChange={(text) => store.updateProject(proj.id, { techStack: text })}
              elementId={`proj-${proj.id}-tech`}
              style={{ ...h.projTech, display: 'inline-block' }}
            />
          </div>
          {proj.bullets.filter(Boolean).map((b: string, i: number) => (
            <div key={i} style={h.projBulletRow}>
              <span style={h.projBulletDot}>{'\u2022'}</span>
              <InlineField
                value={b}
                onChange={(text) => store.updateProjectBullet(proj.id, i, text)}
                elementId={`proj-${proj.id}-bullet-${i}`}
                style={h.projBulletText}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function EducationSectionContent({ h, store }: { h: any; store: any }) {
  const incEdu = store.education.filter((e: any) => e.included)
  if (incEdu.length === 0) return null
  return (
    <>
      <InlineField
        value={store.sectionHeaders.education}
        onChange={(text) => store.setSectionHeader('education', text)}
        elementId="header-education"
        style={h.sectionHeader}
      />
      {incEdu.map((edu: any) => (
        <div key={edu.id} style={h.eduRow}>
          <div style={h.eduText}>
            <InlineField
              value={edu.institution}
              onChange={(text) => store.updateEducation(edu.id, { institution: text })}
              elementId={`edu-${edu.id}-institution`}
              style={{ ...h.eduInstitution, display: 'inline-block' }}
            />
            <span style={h.eduDegree}> | </span>
            <InlineField
              value={`${edu.degree}${edu.gpa ? ` (GPA: ${edu.gpa})` : ''}`}
              onChange={(text) => {
                const gpaMatch = text.match(/\(GPA:\s*(.+?)\)/)
                const degree = text.replace(/\s*\(GPA:.*?\)/, '').trim()
                store.updateEducation(edu.id, { degree, gpa: gpaMatch?.[1] || '' })
              }}
              elementId={`edu-${edu.id}-degree`}
              style={{ ...h.eduDegree, display: 'inline-block' }}
            />
          </div>
          <InlineField
            value={`${edu.dateStart} - ${edu.dateEnd}`}
            onChange={(text) => {
              const parts = text.split(' - ')
              store.updateEducation(edu.id, { dateStart: parts[0] || '', dateEnd: parts.slice(1).join(' - ') || '' })
            }}
            elementId={`edu-${edu.id}-date`}
            style={h.eduDate}
          />
        </div>
      ))}
    </>
  )
}

function CustomSectionContent({ section, h, store }: { section: ResumeSection; h: any; store: any }) {
  const customData = store.customSections[section.id]
  if (!customData) return null
  const items = customData.items.filter((i: any) => i.included)
  if (items.length === 0 && !section.header) return null

  return (
    <>
      <InlineField
        value={section.header}
        onChange={(text) => store.setSectionHeader(section.id, text)}
        elementId={`header-${section.id}`}
        style={h.sectionHeader}
      />
      {section.layout === 'text' && items[0] && (
        <InlineField
          value={items[0].text}
          onChange={(text) => store.updateCustomItem(section.id, items[0].id, { text })}
          elementId={`custom-${section.id}-0`}
          style={h.summary}
        />
      )}
      {section.layout === 'keyvalue' && items.map((item: any, i: number) => (
        <div key={item.id} style={h.skillParagraph}>
          <InlineField
            value={item.label || ''}
            onChange={(text) => store.updateCustomItem(section.id, item.id, { label: text })}
            elementId={`custom-${section.id}-${i}-label`}
            style={{ ...h.skillLabel, display: 'inline-block' }}
          />
          <span style={h.skillLabel}>: </span>
          <InlineField
            value={item.text}
            onChange={(text) => store.updateCustomItem(section.id, item.id, { text })}
            elementId={`custom-${section.id}-${i}-value`}
            style={{ ...h.skillValue, display: 'inline-block' }}
          />
        </div>
      ))}
      {section.layout === 'bullets' && items.map((item: any, i: number) => (
        <div key={item.id} style={h.expBulletRow}>
          <span style={h.expBulletDot}>{'\u2022'}</span>
          <InlineField
            value={item.text}
            onChange={(text) => store.updateCustomItem(section.id, item.id, { text })}
            elementId={`custom-${section.id}-${i}`}
            style={h.expBulletText}
          />
        </div>
      ))}
    </>
  )
}

// --- Main interactive editor ---

export default function InteractiveEditor() {
  const store = useResumeBuilderStore()
  const {
    contact, styles, sectionHeaders, selectedElementId, sections,
  } = store

  const h = useMemo(() => buildHtmlStyles(styles), [styles])

  const sortedSections = [...sections]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order)

  const allSorted = [...sections].sort((a, b) => a.order - b.order)

  const { dragHandleProps, dropTargetProps, dragOverId } = useDragReorder({
    items: allSorted,
    getId: s => s.id,
    onReorder: ids => store.reorderSections(ids),
  })

  // Contact fields with their keys for individual editing
  const contactFields = [
    { key: 'location' as const, value: contact.location },
    { key: 'phone' as const, value: contact.phone },
    { key: 'email' as const, value: contact.email },
    { key: 'linkedin' as const, value: contact.linkedin },
    { key: 'github' as const, value: contact.github },
    { key: 'portfolio' as const, value: contact.portfolio },
  ].filter(f => f.value)

  function renderSection(section: ResumeSection) {
    switch (section.type) {
      case 'summary': return <SummarySectionContent h={h} store={store} />
      case 'skills': return <SkillsSectionContent h={h} store={store} />
      case 'experience': return <ExperienceSectionContent h={h} store={store} />
      case 'projects': return <ProjectsSectionContent h={h} store={store} />
      case 'education': return <EducationSectionContent h={h} store={store} />
      case 'custom': return <CustomSectionContent section={section} h={h} store={store} />
      default: return null
    }
  }

  return (
    <div className="h-full flex">
      {/* Resume document area */}
      <div className="flex-1 overflow-auto bg-[#525659] p-6 flex flex-col items-center">
        {/* Hint banner */}
        <div className="mb-3 px-3 py-1.5 rounded-md bg-white/10 text-white/70 text-[0.6rem] text-center max-w-[500px] leading-relaxed">
          Click any text to edit in place. Select text for <strong className="text-white/90">B</strong> / <em className="text-white/90">I</em> / <u className="text-white/90">U</u> formatting. Drag ⠿ to reorder sections.
        </div>
        <div
          className="bg-white shadow-2xl flex-shrink-0"
          style={h.page}
          onClick={(e) => {
            if (e.target === e.currentTarget) store.setSelectedElement(null)
          }}
        >
          {/* ── Name + Contact ── */}
          <div style={h.headerBlock}>
            <InlineField
              value={contact.fullName}
              onChange={(text) => store.setContact({ fullName: text })}
              elementId="contact-name"
              style={h.name}
            />
            {contactFields.length > 0 && (
              <div style={h.contactLine}>
                {contactFields.map((f, i) => (
                  <span key={f.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {i > 0 && <span style={h.contactSep}>{styles.contact.separator}</span>}
                    <InlineField
                      value={f.value}
                      onChange={(text) => store.setContact({ [f.key]: text })}
                      elementId={`contact-${f.key}`}
                      style={h.contactField}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Dynamic sections ── */}
          {sortedSections.map((section, idx) => (
            <div
              key={section.id}
              className={cn(
                'group/section relative',
                dragOverId === section.id && 'ring-2 ring-blue-400/30 rounded',
              )}
              {...dropTargetProps(section.id)}
            >
              {/* Hover toolbar */}
              <div className="absolute -left-8 top-0 z-10">
                <SectionToolbar
                  section={section}
                  mode="interactive"
                  onMoveUp={() => store.moveSection(section.id, 'up')}
                  onMoveDown={() => store.moveSection(section.id, 'down')}
                  onToggleVisible={() => store.toggleSectionVisible(section.id)}
                  onDelete={section.type === 'custom' ? () => store.removeSection(section.id) : undefined}
                  isFirst={idx === 0}
                  isLast={idx === sortedSections.length - 1}
                  dragHandleProps={dragHandleProps(section.id)}
                />
              </div>
              {renderSection(section)}
            </div>
          ))}
        </div>

        {/* Add Section button */}
        <div className="mt-3 w-full max-w-[300px]">
          <AddSectionMenu />
        </div>
      </div>

      {/* Format Panel */}
      {selectedElementId && <FormatPanel />}
    </div>
  )
}
