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
import { useResumeBuilderStore, resolveElementStyle } from '../../lib/resumeStore'
import { buildHtmlStyles } from '../../lib/resumeStyles'
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

// --- Main interactive editor ---

export default function InteractiveEditor() {
  const store = useResumeBuilderStore()
  const {
    contact, summary, experiences, projects, skills, education, styles,
    selectedElementId,
  } = store

  const h = useMemo(() => buildHtmlStyles(styles), [styles])

  const incExp = experiences.filter(e => e.included)
  const incProj = projects.filter(p => p.included)
  const incSkill = skills.filter(sk => sk.included)
  const incEdu = education.filter(e => e.included)

  const contactParts = [
    contact.location, contact.phone, contact.email,
    contact.linkedin, contact.github, contact.portfolio,
  ].filter(Boolean)
  const contactLine = contactParts.join(styles.contact.separator)

  return (
    <div className="h-full flex">
      {/* Resume document area */}
      <div className="flex-1 overflow-auto bg-[#525659] p-6 flex flex-col items-center">
        {/* Hint banner */}
        <div className="mb-3 px-3 py-1.5 rounded-md bg-white/10 text-white/70 text-[0.6rem] text-center max-w-[500px] leading-relaxed">
          Click any text to edit in place. Select text for <strong className="text-white/90">B</strong> / <em className="text-white/90">I</em> / <u className="text-white/90">U</u> formatting. The PDF preview on the right is the exact output.
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
            {contactLine && (
              <div style={h.contact}>{contactLine}</div>
            )}
          </div>

          {/* ── Professional Summary ── */}
          {summary && (
            <>
              <div style={h.sectionHeader}>Professional Summary</div>
              <InlineField
                value={summary}
                onChange={(text) => store.setSummary(text)}
                elementId="summary"
                style={h.summary}
              />
            </>
          )}

          {/* ── Technical Skills ── */}
          {incSkill.length > 0 && (
            <>
              <div style={h.sectionHeader}>Technical Skills</div>
              {incSkill.map(sk => (
                <div key={sk.id} style={h.skillParagraph}>
                  <span style={h.skillLabel}>{sk.category}: </span>
                  <InlineField
                    value={sk.items}
                    onChange={(text) => store.updateSkill(sk.id, { items: text })}
                    elementId={`skill-${sk.id}-items`}
                    style={{ ...h.skillValue, display: 'inline-block' }}
                  />
                </div>
              ))}
            </>
          )}

          {/* ── Professional Experience ── */}
          {incExp.length > 0 && (
            <>
              <div style={h.sectionHeader}>Professional Experience</div>
              {incExp.map(exp => (
                <div key={exp.id}>
                  <div style={h.titleDateRow}>
                    <div style={h.titleCol}>
                      <div style={h.titleText}>
                        <InlineField
                          value={`${exp.company} | ${exp.title}`}
                          onChange={(text) => {
                            const parts = text.split(' | ')
                            store.updateExperience(exp.id, {
                              company: parts[0] || '',
                              title: parts.slice(1).join(' | ') || '',
                            })
                          }}
                          elementId={`exp-${exp.id}-title`}
                          style={h.titleBold}
                        />
                      </div>
                    </div>
                    <div style={h.dateCol}>
                      {exp.dateStart} - {exp.dateEnd || 'Present'}
                    </div>
                  </div>
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <div key={i} style={h.bulletRow}>
                      <span style={h.bulletDot}>{'\u2022'}</span>
                      <InlineField
                        value={b}
                        onChange={(text) => store.updateExperienceBullet(exp.id, i, text)}
                        elementId={`exp-${exp.id}-bullet-${i}`}
                        style={h.bulletText}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* ── Key Projects ── */}
          {incProj.length > 0 && (
            <>
              <div style={h.sectionHeader}>Key Projects</div>
              {incProj.map(proj => (
                <div key={proj.id}>
                  <div style={h.projectRow}>
                    <span style={h.projectName}>{proj.name}</span>
                    <span style={h.projectTech}> | {proj.techStack}</span>
                  </div>
                  {proj.bullets.filter(Boolean).map((b, i) => (
                    <div key={i} style={h.bulletRow}>
                      <span style={h.bulletDot}>{'\u2022'}</span>
                      <InlineField
                        value={b}
                        onChange={(text) => store.updateProjectBullet(proj.id, i, text)}
                        elementId={`proj-${proj.id}-bullet-${i}`}
                        style={h.bulletText}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* ── Education ── */}
          {incEdu.length > 0 && (
            <>
              <div style={h.sectionHeader}>Education</div>
              {incEdu.map(edu => (
                <div key={edu.id} style={h.eduRow}>
                  <div style={h.eduText}>
                    <span style={h.eduBold}>{edu.institution}</span>
                    <span> | {edu.degree}{edu.gpa ? ` (GPA: ${edu.gpa})` : ''}</span>
                  </div>
                  <div style={h.eduDate}>{edu.dateStart} - {edu.dateEnd}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Format Panel */}
      {selectedElementId && <FormatPanel />}
    </div>
  )
}

