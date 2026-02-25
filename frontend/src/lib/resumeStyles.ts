/**
 * Central resume style configuration.
 * Single source of truth for all resume rendering (PDF, DOCX, future rich-text).
 * All sizes in points (pt). Margins in points.
 */

/** Shared bullet style shape — used per-section so each section is independent */
export interface BulletStyle {
  size: number
  align: 'justify' | 'left'
  indent: number
  symbol: string
  lineHeight: number
}

export interface ResumeStyleConfig {
  font: string
  baseFontSize: number
  name: { size: number; bold: boolean; align: 'center' | 'left' | 'right' }
  contact: { size: number; align: 'center' | 'left' | 'right'; separator: string }
  sectionHeader: { size: number; bold: boolean; uppercase: boolean; borderBottom: boolean; borderColor: string; borderWidth: number; spaceBefore: number; spaceAfter: number }
  jobTitle: { size: number; bold: boolean; spaceBefore: number }
  expBullet: BulletStyle
  dates: { size: number; align: 'right' }
  projectTitle: { size: number; bold: boolean; spaceBefore: number }
  projectTech: { size: number; italic: boolean }
  projBullet: BulletStyle
  summaryText: { size: number; align: 'justify' | 'left'; lineHeight: number }
  skillLabel: { size: number; bold: boolean }
  skillValue: { size: number }
  education: { size: number; bold: boolean }
  eduDate: { size: number; italic: boolean }
  margins: { top: number; bottom: number; left: number; right: number }
  page: 'A4' | 'LETTER'
  lineHeight: number
  colors: { text: string; accent: string; muted: string; border: string }
}

export const DEFAULT_RESUME_STYLES: ResumeStyleConfig = {
  font: 'Calibri',
  baseFontSize: 10,
  name: { size: 16, bold: true, align: 'center' },
  contact: { size: 9, align: 'center', separator: ' | ' },
  sectionHeader: {
    size: 10.5,
    bold: true,
    uppercase: true,
    borderBottom: true,
    borderColor: '#000000',
    borderWidth: 1.5,
    spaceBefore: 7,
    spaceAfter: 2,
  },
  jobTitle: { size: 10, bold: true, spaceBefore: 4 },
  expBullet: { size: 9.5, align: 'justify', indent: 12, symbol: '\u2022', lineHeight: 1.2 },
  dates: { size: 10, align: 'right' },
  projectTitle: { size: 10, bold: true, spaceBefore: 4 },
  projectTech: { size: 9.5, italic: true },
  projBullet: { size: 9.5, align: 'justify', indent: 12, symbol: '\u2022', lineHeight: 1.2 },
  summaryText: { size: 9.5, align: 'justify', lineHeight: 1.2 },
  skillLabel: { size: 9.5, bold: true },
  skillValue: { size: 9.5 },
  education: { size: 9.5, bold: true },
  eduDate: { size: 9.5, italic: true },
  margins: { top: 36, bottom: 36, left: 36, right: 36 },
  page: 'LETTER',
  lineHeight: 1.15,
  colors: { text: '#000000', accent: '#000000', muted: '#333333', border: '#000000' },
}

/** Margin preset options */
export const MARGIN_PRESETS = {
  Narrow: { top: 24, bottom: 24, left: 24, right: 24 },
  Normal: { top: 36, bottom: 36, left: 36, right: 36 },
  Wide: { top: 54, bottom: 54, left: 54, right: 54 },
} as const

/** Font options (these must be registered with @react-pdf/renderer) */
export const FONT_OPTIONS = ['Calibri', 'Helvetica', 'Times-Roman', 'Courier'] as const

/** Page size dimensions in points */
export const PAGE_SIZES = {
  LETTER: { width: 612, height: 792 },
  A4: { width: 595.28, height: 841.89 },
} as const

/** Size keys that scale with baseFontSize */
const SCALABLE_KEYS = [
  'name', 'contact', 'sectionHeader', 'jobTitle', 'expBullet',
  'dates', 'projectTitle', 'projectTech', 'projBullet', 'summaryText',
  'skillLabel', 'skillValue', 'education', 'eduDate',
] as const

/**
 * Font-family mapping: must match the PDF renderer's FONT_MAP in ResumeDocument.tsx
 * so that the interactive editor and PDF use visually equivalent fonts.
 */
const HTML_FONT_MAP: Record<string, string> = {
  'Calibri': 'Helvetica, Arial, sans-serif',
  'Helvetica': 'Helvetica, Arial, sans-serif',
  'Times-Roman': '"Times New Roman", Times, serif',
  'Courier': '"Courier New", Courier, monospace',
}

/**
 * Build CSS-compatible style objects from the shared config.
 * Mirrors buildStyles() in ResumeDocument.tsx exactly — same values, CSS units.
 * Used by InteractiveEditor to render a pixel-accurate replica of the PDF.
 */
export function buildHtmlStyles(cfg: ResumeStyleConfig) {
  const fontFamily = HTML_FONT_MAP[cfg.font] || 'sans-serif'
  const pageSize = PAGE_SIZES[cfg.page]

  return {
    page: {
      width: pageSize.width,
      minHeight: pageSize.height,
      fontFamily,
      fontSize: `${cfg.baseFontSize}pt`,
      color: cfg.colors.text,
      paddingTop: cfg.margins.top,
      paddingBottom: cfg.margins.bottom,
      paddingLeft: cfg.margins.left,
      paddingRight: cfg.margins.right,
      lineHeight: cfg.lineHeight,
    } as React.CSSProperties,

    headerBlock: {
      textAlign: 'center' as const,
      marginBottom: 0,
    } as React.CSSProperties,

    name: {
      fontSize: `${cfg.name.size}pt`,
      fontWeight: cfg.name.bold ? 'bold' : 'normal',
      textAlign: cfg.name.align,
      lineHeight: 1.0,
      marginBottom: 0,
    } as React.CSSProperties,

    contactLine: {
      fontSize: `${cfg.contact.size}pt`,
      textAlign: cfg.contact.align,
      color: cfg.colors.muted,
      lineHeight: 1.0,
      marginTop: 2,
      marginBottom: 0,
      display: 'flex' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
      gap: 0,
    } as React.CSSProperties,

    contactField: {
      fontSize: `${cfg.contact.size}pt`,
      color: cfg.colors.muted,
    } as React.CSSProperties,

    contactSep: {
      fontSize: `${cfg.contact.size}pt`,
      color: cfg.colors.muted,
      userSelect: 'none' as const,
    } as React.CSSProperties,

    sectionHeader: {
      fontSize: `${cfg.sectionHeader.size}pt`,
      fontWeight: cfg.sectionHeader.bold ? 'bold' : 'normal',
      textTransform: cfg.sectionHeader.uppercase ? 'uppercase' : 'none',
      borderBottom: cfg.sectionHeader.borderBottom
        ? `${cfg.sectionHeader.borderWidth}px solid ${cfg.sectionHeader.borderColor}`
        : 'none',
      marginTop: cfg.sectionHeader.spaceBefore,
      paddingBottom: 2,
      marginBottom: cfg.sectionHeader.spaceAfter,
    } as React.CSSProperties,

    summary: {
      fontSize: `${cfg.summaryText.size}pt`,
      textAlign: cfg.summaryText.align,
      lineHeight: cfg.summaryText.lineHeight,
      marginTop: 1,
    } as React.CSSProperties,

    skillParagraph: {
      fontSize: `${cfg.skillValue.size}pt`,
      marginBottom: 1,
    } as React.CSSProperties,

    skillLabel: {
      fontSize: `${cfg.skillLabel.size}pt`,
      fontWeight: cfg.skillLabel.bold ? 'bold' : 'normal',
    } as React.CSSProperties,

    skillValue: {
      fontSize: `${cfg.skillValue.size}pt`,
    } as React.CSSProperties,

    // --- Experience ---
    expTitleDateRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginTop: cfg.jobTitle.spaceBefore,
    } as React.CSSProperties,

    expTitleCol: {
      flex: 1,
      marginRight: 10,
    } as React.CSSProperties,

    expCompany: {
      fontSize: `${cfg.jobTitle.size}pt`,
      fontWeight: cfg.jobTitle.bold ? 'bold' : 'normal',
    } as React.CSSProperties,

    expTitle: {
      fontSize: `${cfg.jobTitle.size}pt`,
    } as React.CSSProperties,

    expDate: {
      flexShrink: 0,
      textAlign: 'right' as const,
      fontSize: `${cfg.dates.size}pt`,
      fontStyle: 'italic' as const,
    } as React.CSSProperties,

    expBulletRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      paddingLeft: cfg.expBullet.indent,
      marginBottom: 0.5,
    } as React.CSSProperties,

    expBulletDot: {
      fontSize: `${cfg.expBullet.size}pt`,
      width: 10,
      flexShrink: 0,
    } as React.CSSProperties,

    expBulletText: {
      fontSize: `${cfg.expBullet.size}pt`,
      flex: 1,
      textAlign: cfg.expBullet.align,
      lineHeight: cfg.expBullet.lineHeight,
    } as React.CSSProperties,

    // --- Projects ---
    projRow: {
      marginTop: cfg.projectTitle.spaceBefore,
    } as React.CSSProperties,

    projName: {
      fontWeight: cfg.projectTitle.bold ? 'bold' : 'normal',
      fontSize: `${cfg.projectTitle.size}pt`,
    } as React.CSSProperties,

    projTech: {
      fontSize: `${cfg.projectTech.size}pt`,
      fontStyle: cfg.projectTech.italic ? 'italic' : 'normal',
      color: cfg.colors.muted,
    } as React.CSSProperties,

    projBulletRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      paddingLeft: cfg.projBullet.indent,
      marginBottom: 0.5,
    } as React.CSSProperties,

    projBulletDot: {
      fontSize: `${cfg.projBullet.size}pt`,
      width: 10,
      flexShrink: 0,
    } as React.CSSProperties,

    projBulletText: {
      fontSize: `${cfg.projBullet.size}pt`,
      flex: 1,
      textAlign: cfg.projBullet.align,
      lineHeight: cfg.projBullet.lineHeight,
    } as React.CSSProperties,

    // --- Education ---
    eduRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginTop: 1,
    } as React.CSSProperties,

    eduInstitution: {
      fontWeight: cfg.education.bold ? 'bold' : 'normal',
      fontSize: `${cfg.education.size}pt`,
    } as React.CSSProperties,

    eduDegree: {
      fontSize: `${cfg.education.size}pt`,
    } as React.CSSProperties,

    eduText: {
      fontSize: `${cfg.education.size}pt`,
      flex: 1,
      marginRight: 4,
    } as React.CSSProperties,

    eduDate: {
      fontSize: `${cfg.eduDate.size}pt`,
      flexShrink: 0,
      textAlign: 'right' as const,
      fontStyle: cfg.eduDate.italic ? 'italic' : 'normal',
    } as React.CSSProperties,
  }
}

/**
 * Section config — maps elementId prefix to the style config keys that control that section.
 * Used by FormatPanel's Section tab to show relevant controls per section.
 */
export interface SectionStyleControl {
  key: keyof ResumeStyleConfig
  label: string
  field: 'size' | 'bold' | 'italic' | 'lineHeight' | 'indent' | 'align'
  type: 'number' | 'toggle' | 'select'
  min?: number
  max?: number
  step?: number
  options?: string[]
}

export const SECTION_CONFIG: Record<string, { label: string; controls: SectionStyleControl[] }> = {
  header: {
    label: 'Section Headers',
    controls: [
      { key: 'sectionHeader', label: 'Font Size', field: 'size', type: 'number', min: 8, max: 16, step: 0.5 },
      { key: 'sectionHeader', label: 'Bold', field: 'bold', type: 'toggle' },
    ],
  },
  contact: {
    label: 'Contact',
    controls: [
      { key: 'name', label: 'Name Size', field: 'size', type: 'number', min: 10, max: 24, step: 0.5 },
      { key: 'name', label: 'Name Bold', field: 'bold', type: 'toggle' },
      { key: 'contact', label: 'Contact Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
    ],
  },
  summary: {
    label: 'Summary',
    controls: [
      { key: 'summaryText', label: 'Font Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'summaryText', label: 'Line Height', field: 'lineHeight', type: 'number', min: 1.0, max: 2.0, step: 0.05 },
      { key: 'summaryText', label: 'Alignment', field: 'align', type: 'select', options: ['left', 'justify'] },
    ],
  },
  skill: {
    label: 'Skills',
    controls: [
      { key: 'skillLabel', label: 'Label Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'skillLabel', label: 'Label Bold', field: 'bold', type: 'toggle' },
      { key: 'skillValue', label: 'Value Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
    ],
  },
  exp: {
    label: 'Experience',
    controls: [
      { key: 'jobTitle', label: 'Title Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'jobTitle', label: 'Title Bold', field: 'bold', type: 'toggle' },
      { key: 'expBullet', label: 'Bullet Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'expBullet', label: 'Bullet Line Height', field: 'lineHeight', type: 'number', min: 1.0, max: 2.0, step: 0.05 },
      { key: 'expBullet', label: 'Bullet Indent', field: 'indent', type: 'number', min: 0, max: 30, step: 1 },
      { key: 'dates', label: 'Date Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
    ],
  },
  proj: {
    label: 'Projects',
    controls: [
      { key: 'projectTitle', label: 'Title Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'projectTitle', label: 'Title Bold', field: 'bold', type: 'toggle' },
      { key: 'projectTech', label: 'Tech Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'projectTech', label: 'Tech Italic', field: 'italic', type: 'toggle' },
      { key: 'projBullet', label: 'Bullet Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'projBullet', label: 'Bullet Line Height', field: 'lineHeight', type: 'number', min: 1.0, max: 2.0, step: 0.05 },
    ],
  },
  edu: {
    label: 'Education',
    controls: [
      { key: 'education', label: 'Font Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'education', label: 'Bold', field: 'bold', type: 'toggle' },
      { key: 'eduDate', label: 'Date Size', field: 'size', type: 'number', min: 7, max: 14, step: 0.5 },
      { key: 'eduDate', label: 'Date Italic', field: 'italic', type: 'toggle' },
    ],
  },
}

/** Derive a scaled style config — always scales from DEFAULT to avoid floating-point drift */
export function scaleStyles(current: ResumeStyleConfig, newBaseFontSize: number): ResumeStyleConfig {
  const ratio = newBaseFontSize / DEFAULT_RESUME_STYLES.baseFontSize
  const round1 = (n: number) => Math.round(n * 10) / 10
  const scaled = { ...current, baseFontSize: newBaseFontSize }
  for (const key of SCALABLE_KEYS) {
    (scaled as any)[key] = { ...DEFAULT_RESUME_STYLES[key], ...current[key], size: round1((DEFAULT_RESUME_STYLES[key] as any).size * ratio) }
  }
  return scaled
}
