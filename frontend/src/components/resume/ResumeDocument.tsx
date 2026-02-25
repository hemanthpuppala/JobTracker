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
} from '../../lib/resumeStore'
import { resolveElementStylePdf } from '../../lib/resumeStore'
import { richTextToPdfNodes, hasRichFormatting } from '../../lib/richTextToPdf'

// Map config font names to @react-pdf/renderer built-in fonts.
// To use actual Calibri, register .ttf files and update this map.
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
  const body = cfg.bullet.size
  const title = cfg.jobTitle.size

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

    // --- Header: name + contact tightly coupled ---
    headerBlock: {
      alignItems: 'center',
      marginBottom: 0,
    },
    name: {
      fontSize: cfg.name.size,
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: 1.0,
      marginBottom: 0,
    },
    contact: {
      fontSize: cfg.contact.size,
      textAlign: 'center',
      color: cfg.colors.muted,
      lineHeight: 1.0,
      marginTop: 2,
      marginBottom: 0,
    },

    // --- Section header with bottom rule ---
    sectionHeader: {
      fontSize: cfg.sectionHeader.size,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      borderBottomWidth: cfg.sectionHeader.borderBottom ? cfg.sectionHeader.borderWidth : 0,
      borderBottomColor: cfg.sectionHeader.borderColor,
      borderBottomStyle: 'solid',
      marginTop: cfg.sectionHeader.spaceBefore,
      paddingBottom: 2,
      marginBottom: cfg.sectionHeader.spaceAfter,
    },

    // --- Summary ---
    summary: {
      fontSize: body,
      textAlign: 'justify',
      lineHeight: cfg.bullet.lineHeight,
      marginTop: 1,
    },

    // --- Skills: single Text per row, bold label inline ---
    skillParagraph: {
      fontSize: body,
      marginBottom: 1,
    },

    // --- Title + Date row (experience, education) ---
    titleDateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: cfg.jobTitle.spaceBefore,
    },
    titleDateRowNoTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: 1,
    },
    titleCol: {
      flex: 1,
      marginRight: 10,
    },
    dateCol: {
      flexShrink: 0,
      textAlign: 'right',
      fontSize: title,
      fontStyle: 'italic',
    },

    // --- Tech stack line (italic, below title) ---
    techLine: {
      fontSize: body,
      fontStyle: 'italic',
      color: cfg.colors.muted,
      marginBottom: 1,
    },

    // --- Bullets ---
    bulletRow: {
      flexDirection: 'row',
      paddingLeft: cfg.bullet.indent,
      marginBottom: 0.5,
    },
    bulletDot: {
      fontSize: body,
      width: 10,
      flexShrink: 0,
    },
    bulletText: {
      fontSize: body,
      flex: 1,
      textAlign: 'justify',
      lineHeight: cfg.bullet.lineHeight,
    },

    // --- Education: single row, text left + date right ---
    eduRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: 1,
    },
    eduText: {
      fontSize: body,
      flex: 1,
      marginRight: 4,
    },
    eduDate: {
      fontSize: body,
      flexShrink: 0,
      textAlign: 'right',
      fontStyle: 'italic',
    },
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
}

// --- Reusable components ---

function SectionHeader({ title, s }: { title: string; s: ReturnType<typeof buildStyles> }) {
  return <Text style={s.sectionHeader}>{title}</Text>
}

function Bullet({ text, s, richJson, elStyleOverride }: {
  text: string
  s: ReturnType<typeof buildStyles>
  richJson?: any
  elStyleOverride?: ElementStyleOverride
}) {
  const useRich = richJson && hasRichFormatting(richJson)
  const overrides = resolveElementStylePdf(elStyleOverride)
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>{'\u2022'}</Text>
      <Text style={[s.bulletText, overrides]}>
        {useRich ? richTextToPdfNodes(richJson) : text}
      </Text>
    </View>
  )
}

function TitleDateLine({ title, date, s, noTopMargin }: {
  title: React.ReactNode
  date: string
  s: ReturnType<typeof buildStyles>
  noTopMargin?: boolean
}) {
  return (
    <View style={noTopMargin ? s.titleDateRowNoTop : s.titleDateRow}>
      <View style={s.titleCol}>{typeof title === 'string' ? <Text>{title}</Text> : title}</View>
      <Text style={s.dateCol}>{date}</Text>
    </View>
  )
}

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
}: ResumeDocumentProps) {
  const s = buildStyles(styleConfig)
  const pageSize = PAGE_SIZES[styleConfig.page]
  const titleSize = styleConfig.jobTitle.size
  const bodySize = styleConfig.bullet.size

  const contactParts = [
    contact.location, contact.phone, contact.email,
    contact.linkedin, contact.github, contact.portfolio,
  ].filter(Boolean)
  const contactLine = contactParts.join(styleConfig.contact.separator)

  const incExp = experiences.filter(e => e.included)
  const incProj = projects.filter(p => p.included)
  const incSkill = skills.filter(sk => sk.included)
  const incEdu = education.filter(e => e.included)

  return (
    <Document>
      <Page size={{ width: pageSize.width, height: pageSize.height }} style={s.page}>
        {/* ── Name + Contact ── */}
        <View style={s.headerBlock}>
          <Text style={s.name}>{contact.fullName}</Text>
          {contactLine && <Text style={s.contact}>{contactLine}</Text>}
        </View>

        {/* ── Professional Summary ── */}
        {summary && (
          <>
            <SectionHeader title="Professional Summary" s={s} />
            <Text style={[s.summary, resolveElementStylePdf(elementStyles['summary'])]}>
              {richContent['summary'] && hasRichFormatting(richContent['summary'])
                ? richTextToPdfNodes(richContent['summary'])
                : summary}
            </Text>
          </>
        )}

        {/* ── Technical Skills ── */}
        {incSkill.length > 0 && (
          <>
            <SectionHeader title="Technical Skills" s={s} />
            {incSkill.map(sk => (
              <Text key={sk.id} style={s.skillParagraph}>
                <Text style={{ fontWeight: 'bold' }}>{sk.category}: </Text>
                <Text style={resolveElementStylePdf(elementStyles[`skill-${sk.id}-items`])}>{sk.items}</Text>
              </Text>
            ))}
          </>
        )}

        {/* ── Professional Experience ── */}
        {incExp.length > 0 && (
          <>
            <SectionHeader title="Professional Experience" s={s} />
            {incExp.map(exp => (
              <View key={exp.id} wrap={false}>
                <TitleDateLine
                  s={s}
                  date={`${exp.dateStart} - ${exp.dateEnd || 'Present'}`}
                  title={
                    <Text style={{ fontSize: titleSize }}>
                      <Text style={{ fontWeight: 'bold' }}>{exp.company}</Text>
                      <Text> | {exp.title}</Text>
                    </Text>
                  }
                />
                {exp.bullets.filter(Boolean).map((b, i) => (
                  <Bullet key={i} text={b} s={s} richJson={richContent[`exp-${exp.id}-bullet-${i}`]} elStyleOverride={elementStyles[`exp-${exp.id}-bullet-${i}`]} />
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── Key Projects ── */}
        {incProj.length > 0 && (
          <>
            <SectionHeader title="Key Projects" s={s} />
            {incProj.map(proj => (
              <View key={proj.id} wrap={false}>
                <Text style={{ fontSize: bodySize, marginTop: styleConfig.projectTitle.spaceBefore }}>
                  <Text style={{ fontWeight: 'bold', fontSize: titleSize }}>{proj.name}</Text>
                  <Text style={{ fontStyle: 'italic' }}> | {proj.techStack}</Text>
                </Text>
                {proj.bullets.filter(Boolean).map((b, i) => (
                  <Bullet key={i} text={b} s={s} richJson={richContent[`proj-${proj.id}-bullet-${i}`]} elStyleOverride={elementStyles[`proj-${proj.id}-bullet-${i}`]} />
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── Education ── */}
        {incEdu.length > 0 && (
          <>
            <SectionHeader title="Education" s={s} />
            {incEdu.map(edu => (
              <View key={edu.id} style={s.eduRow}>
                <Text style={s.eduText}>
                  <Text style={{ fontWeight: 'bold' }}>{edu.institution}</Text>
                  <Text> | {edu.degree}{edu.gpa ? ` (GPA: ${edu.gpa})` : ''}</Text>
                </Text>
                <Text style={s.eduDate}>{edu.dateStart} - {edu.dateEnd}</Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  )
}
