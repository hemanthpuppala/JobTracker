/**
 * @react-pdf/renderer Document template for the resume.
 * Matches the reference Calibri single-page resume format exactly.
 * Used by both <PDFViewer> (live preview) and pdf().toBlob() (download).
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ResumeStyleConfig } from '../../lib/resumeStyles'
import { PAGE_SIZES } from '../../lib/resumeStyles'
import type {
  ContactInfo,
  ExperienceItem,
  ProjectItem,
  SkillItem,
  EducationItem,
  ElementStyleOverride,
  ResumeSection,
  CustomSectionData,
} from '../../lib/resumeStore'
import { resolveElementStylePdf } from '../../lib/resumeStore'
import { richTextToPdfNodes, hasRichFormatting } from '../../lib/richTextToPdf'

// Map config font names to @react-pdf/renderer built-in fonts.
const FONT_MAP: Record<string, string> = {
  'Calibri': 'Helvetica',
  'Helvetica': 'Helvetica',
  'Times-Roman': 'Times-Roman',
  'Courier': 'Courier',
}

function resolveFont(font: string): string {
  return FONT_MAP[font] || 'Helvetica'
}

function buildStyles(cfg: ResumeStyleConfig) {
  const fontFamily = resolveFont(cfg.font)

  return StyleSheet.create({
    page: {
      fontFamily,
      fontSize: cfg.baseFontSize,
      color: cfg.colors.text,
      paddingTop: cfg.margins.top,
      paddingBottom: cfg.margins.bottom,
      paddingLeft: cfg.margins.left,
      paddingRight: cfg.margins.right,
      lineHeight: cfg.lineHeight,
    },

    // --- Header ---
    headerBlock: { alignItems: 'center', marginBottom: 0 },
    name: { fontSize: cfg.name.size, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.0, marginBottom: 0 },
    contact: { fontSize: cfg.contact.size, textAlign: 'center', color: cfg.colors.muted, lineHeight: 1.0, marginTop: 2, marginBottom: 0 },

    // --- Section header ---
    sectionHeader: {
      fontSize: cfg.sectionHeader.size, fontWeight: 'bold', textTransform: 'uppercase',
      borderBottomWidth: cfg.sectionHeader.borderBottom ? cfg.sectionHeader.borderWidth : 0,
      borderBottomColor: cfg.sectionHeader.borderColor, borderBottomStyle: 'solid',
      marginTop: cfg.sectionHeader.spaceBefore, paddingBottom: 2, marginBottom: cfg.sectionHeader.spaceAfter,
    },

    // --- Summary (own style key) ---
    summary: { fontSize: cfg.summaryText.size, textAlign: cfg.summaryText.align, lineHeight: cfg.summaryText.lineHeight, marginTop: 1 },

    // --- Skills ---
    skillParagraph: { fontSize: cfg.skillValue.size, marginBottom: 1 },

    // --- Experience ---
    expTitleDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: cfg.jobTitle.spaceBefore },
    expTitleCol: { flex: 1, marginRight: 10 },
    expDateCol: { flexShrink: 0, textAlign: 'right', fontSize: cfg.dates.size, fontStyle: 'italic' },
    expBulletRow: { flexDirection: 'row', paddingLeft: cfg.expBullet.indent, marginBottom: 0.5 },
    expBulletDot: { fontSize: cfg.expBullet.size, width: 10, flexShrink: 0 },
    expBulletText: { fontSize: cfg.expBullet.size, flex: 1, textAlign: cfg.expBullet.align, lineHeight: cfg.expBullet.lineHeight },

    // --- Projects ---
    projBulletRow: { flexDirection: 'row', paddingLeft: cfg.projBullet.indent, marginBottom: 0.5 },
    projBulletDot: { fontSize: cfg.projBullet.size, width: 10, flexShrink: 0 },
    projBulletText: { fontSize: cfg.projBullet.size, flex: 1, textAlign: cfg.projBullet.align, lineHeight: cfg.projBullet.lineHeight },

    // --- Education ---
    eduRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 1 },
    eduText: { fontSize: cfg.education.size, flex: 1, marginRight: 4 },
    eduDate: { fontSize: cfg.eduDate.size, flexShrink: 0, textAlign: 'right', fontStyle: cfg.eduDate.italic ? 'italic' : 'normal' },
  })
}

// --- Props ---
export interface ResumeDocumentProps {
  contact: ContactInfo
  summary: string
  experiences: ExperienceItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  education: EducationItem[]
  styleConfig: ResumeStyleConfig
  richContent?: Record<string, any>
  elementStyles?: Record<string, ElementStyleOverride>
  sectionHeaders?: Record<string, string>
  sections?: ResumeSection[]
  customSections?: Record<string, CustomSectionData>
}

// --- Reusable components ---

function SectionHeader({ title, s }: { title: string; s: ReturnType<typeof buildStyles> }) {
  return <Text style={s.sectionHeader}>{title}</Text>
}

function Bullet({ text, richJson, elStyleOverride, rowStyle, dotStyle, textStyle }: {
  text: string
  richJson?: any
  elStyleOverride?: ElementStyleOverride
  rowStyle: any
  dotStyle: any
  textStyle: any
}) {
  const useRich = richJson && hasRichFormatting(richJson)
  const overrides = resolveElementStylePdf(elStyleOverride)
  return (
    <View style={rowStyle}>
      <Text style={dotStyle}>{'\u2022'}</Text>
      <Text style={[textStyle, overrides]}>
        {useRich ? richTextToPdfNodes(richJson) : text}
      </Text>
    </View>
  )
}

// Default sections for backwards compat
const DEFAULT_SECTION_ORDER: ResumeSection[] = [
  { id: 'summary',    type: 'summary',    order: 0, visible: true, header: 'Professional Summary' },
  { id: 'skills',     type: 'skills',     order: 1, visible: true, header: 'Technical Skills' },
  { id: 'experience', type: 'experience', order: 2, visible: true, header: 'Professional Experience' },
  { id: 'projects',   type: 'projects',   order: 3, visible: true, header: 'Key Projects' },
  { id: 'education',  type: 'education',  order: 4, visible: true, header: 'Education' },
]

// --- Main Document ---
export default function ResumeDocument({
  contact,
  summary,
  experiences,
  projects,
  skills,
  education,
  styleConfig,
  richContent = {},
  elementStyles = {},
  sectionHeaders = {},
  sections: sectionsProp,
  customSections = {},
}: ResumeDocumentProps) {
  const s = buildStyles(styleConfig)
  const pageSize = PAGE_SIZES[styleConfig.page]
  const titleSize = styleConfig.jobTitle.size

  const contactParts = [
    contact.location, contact.phone, contact.email,
    contact.linkedin, contact.github, contact.portfolio,
  ].filter(Boolean)
  const contactLine = contactParts.join(styleConfig.contact.separator)

  const incExp = experiences.filter(e => e.included)
  const incProj = projects.filter(p => p.included)
  const incSkill = skills.filter(sk => sk.included)
  const incEdu = education.filter(e => e.included)

  const activeSections = (sectionsProp || DEFAULT_SECTION_ORDER)
    .filter(sec => sec.visible)
    .sort((a, b) => a.order - b.order)

  // react-pdf's reconciler doesn't handle child reordering properly —
  // it appends new nodes instead of moving existing ones.
  // A unique key forces a full rebuild when section order/visibility changes.
  const sectionLayoutKey = activeSections.map(s => s.id).join('|')

  function renderSection(section: ResumeSection) {
    const headerText = sectionHeaders[section.id] || section.header

    switch (section.type) {
      case 'summary':
        if (!summary) return null
        return (
          <View key={section.id}>
            <SectionHeader title={headerText} s={s} />
            <Text style={[s.summary, resolveElementStylePdf(elementStyles['summary'])]}>
              {richContent['summary'] && hasRichFormatting(richContent['summary'])
                ? richTextToPdfNodes(richContent['summary'])
                : summary}
            </Text>
          </View>
        )

      case 'skills':
        if (incSkill.length === 0) return null
        return (
          <View key={section.id}>
            <SectionHeader title={headerText} s={s} />
            {incSkill.map(sk => (
              <Text key={sk.id} style={s.skillParagraph}>
                <Text style={{ fontWeight: styleConfig.skillLabel.bold ? 'bold' : 'normal', fontSize: styleConfig.skillLabel.size, ...resolveElementStylePdf(elementStyles[`skill-${sk.id}-category`]) }}>{sk.category}: </Text>
                <Text style={resolveElementStylePdf(elementStyles[`skill-${sk.id}-items`])}>{sk.items}</Text>
              </Text>
            ))}
          </View>
        )

      case 'experience':
        if (incExp.length === 0) return null
        return (
          <View key={section.id}>
            <SectionHeader title={headerText} s={s} />
            {incExp.map(exp => (
              <View key={exp.id} wrap={false}>
                <View style={s.expTitleDateRow}>
                  <View style={s.expTitleCol}>
                    <Text style={{ fontSize: titleSize }}>
                      <Text style={{ fontWeight: styleConfig.jobTitle.bold ? 'bold' : 'normal', ...resolveElementStylePdf(elementStyles[`exp-${exp.id}-company`]) }}>{exp.company}</Text>
                      <Text style={resolveElementStylePdf(elementStyles[`exp-${exp.id}-title`])}> | {exp.title}</Text>
                    </Text>
                  </View>
                  <Text style={[s.expDateCol, resolveElementStylePdf(elementStyles[`exp-${exp.id}-date`])]}>{exp.dateStart} - {exp.dateEnd || 'Present'}</Text>
                </View>
                {exp.bullets.filter(Boolean).map((b, i) => (
                  <Bullet key={i} text={b} rowStyle={s.expBulletRow} dotStyle={s.expBulletDot} textStyle={s.expBulletText} richJson={richContent[`exp-${exp.id}-bullet-${i}`]} elStyleOverride={elementStyles[`exp-${exp.id}-bullet-${i}`]} />
                ))}
              </View>
            ))}
          </View>
        )

      case 'projects':
        if (incProj.length === 0) return null
        return (
          <View key={section.id}>
            <SectionHeader title={headerText} s={s} />
            {incProj.map(proj => (
              <View key={proj.id} wrap={false}>
                <Text style={{ marginTop: styleConfig.projectTitle.spaceBefore }}>
                  <Text style={{ fontWeight: styleConfig.projectTitle.bold ? 'bold' : 'normal', fontSize: styleConfig.projectTitle.size, ...resolveElementStylePdf(elementStyles[`proj-${proj.id}-name`]) }}>{proj.name}</Text>
                  <Text style={{ fontStyle: styleConfig.projectTech.italic ? 'italic' : 'normal', fontSize: styleConfig.projectTech.size, color: styleConfig.colors.muted, ...resolveElementStylePdf(elementStyles[`proj-${proj.id}-tech`]) }}> | {proj.techStack}</Text>
                </Text>
                {proj.bullets.filter(Boolean).map((b, i) => (
                  <Bullet key={i} text={b} rowStyle={s.projBulletRow} dotStyle={s.projBulletDot} textStyle={s.projBulletText} richJson={richContent[`proj-${proj.id}-bullet-${i}`]} elStyleOverride={elementStyles[`proj-${proj.id}-bullet-${i}`]} />
                ))}
              </View>
            ))}
          </View>
        )

      case 'education':
        if (incEdu.length === 0) return null
        return (
          <View key={section.id}>
            <SectionHeader title={headerText} s={s} />
            {incEdu.map(edu => (
              <View key={edu.id} style={s.eduRow}>
                <Text style={s.eduText}>
                  <Text style={{ fontWeight: styleConfig.education.bold ? 'bold' : 'normal', ...resolveElementStylePdf(elementStyles[`edu-${edu.id}-institution`]) }}>{edu.institution}</Text>
                  <Text style={resolveElementStylePdf(elementStyles[`edu-${edu.id}-degree`])}> | {edu.degree}{edu.gpa ? ` (GPA: ${edu.gpa})` : ''}</Text>
                </Text>
                <Text style={[s.eduDate, resolveElementStylePdf(elementStyles[`edu-${edu.id}-date`])]}>{edu.dateStart} - {edu.dateEnd}</Text>
              </View>
            ))}
          </View>
        )

      case 'custom': {
        const customData = customSections[section.id]
        if (!customData) return null
        const items = customData.items.filter(i => i.included)
        if (items.length === 0) return null

        return (
          <View key={section.id}>
            <SectionHeader title={headerText} s={s} />
            {section.layout === 'text' && items[0] && (
              <Text style={s.summary}>{items[0].text}</Text>
            )}
            {section.layout === 'keyvalue' && items.map((item, i) => (
              <Text key={item.id} style={s.skillParagraph}>
                <Text style={{ fontWeight: 'bold', fontSize: styleConfig.skillLabel.size }}>{item.label || ''}: </Text>
                <Text>{item.text}</Text>
              </Text>
            ))}
            {section.layout === 'bullets' && items.map((item, i) => (
              <View key={item.id} style={s.expBulletRow}>
                <Text style={s.expBulletDot}>{'\u2022'}</Text>
                <Text style={s.expBulletText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )
      }

      default:
        return null
    }
  }

  return (
    <Document>
      <Page key={sectionLayoutKey} size={{ width: pageSize.width, height: pageSize.height }} style={s.page}>
        {/* ── Name + Contact ── */}
        <View style={s.headerBlock}>
          <Text style={[s.name, resolveElementStylePdf(elementStyles['contact-name'])]}>{contact.fullName}</Text>
          {contactLine && <Text style={s.contact}>{contactLine}</Text>}
        </View>

        {/* ── Dynamic sections ── */}
        {activeSections.map(section => renderSection(section))}
      </Page>
    </Document>
  )
}
