/**
 * Central resume style configuration.
 * Single source of truth for all resume rendering (PDF, DOCX, future rich-text).
 * All sizes in points (pt). Margins in points.
 */

export interface ResumeStyleConfig {
  font: string
  baseFontSize: number
  name: { size: number; bold: boolean; align: 'center' | 'left' | 'right' }
  contact: { size: number; align: 'center' | 'left' | 'right'; separator: string }
  sectionHeader: { size: number; bold: boolean; uppercase: boolean; borderBottom: boolean; borderColor: string; borderWidth: number; spaceBefore: number; spaceAfter: number }
  jobTitle: { size: number; bold: boolean; spaceBefore: number }
  bullet: { size: number; align: 'justify' | 'left'; indent: number; symbol: string; lineHeight: number }
  dates: { size: number; align: 'right' }
  projectTitle: { size: number; bold: boolean; spaceBefore: number }
  projectTech: { size: number; italic: boolean }
  skillLabel: { size: number; bold: boolean }
  skillValue: { size: number }
  education: { size: number; bold: boolean }
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
  bullet: { size: 9.5, align: 'justify', indent: 12, symbol: '\u2022', lineHeight: 1.2 },
  dates: { size: 10, align: 'right' },
  projectTitle: { size: 10, bold: true, spaceBefore: 4 },
  projectTech: { size: 9.5, italic: true },
  skillLabel: { size: 9.5, bold: true },
  skillValue: { size: 9.5 },
  education: { size: 9.5, bold: true },
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
  'name', 'contact', 'sectionHeader', 'jobTitle', 'bullet',
  'dates', 'projectTitle', 'projectTech', 'skillLabel', 'skillValue', 'education',
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
  const body = cfg.bullet.size
  const title = cfg.jobTitle.size
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

    contact: {
      fontSize: `${cfg.contact.size}pt`,
      textAlign: cfg.contact.align,
      color: cfg.colors.muted,
      lineHeight: 1.0,
      marginTop: 2,
      marginBottom: 0,
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
      fontSize: `${body}pt`,
      textAlign: cfg.bullet.align,
      lineHeight: cfg.bullet.lineHeight,
      marginTop: 1,
    } as React.CSSProperties,

    skillParagraph: {
      fontSize: `${body}pt`,
      marginBottom: 1,
    } as React.CSSProperties,

    skillLabel: {
      fontSize: `${cfg.skillLabel.size}pt`,
      fontWeight: cfg.skillLabel.bold ? 'bold' : 'normal',
    } as React.CSSProperties,

    skillValue: {
      fontSize: `${cfg.skillValue.size}pt`,
    } as React.CSSProperties,

    titleDateRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginTop: cfg.jobTitle.spaceBefore,
    } as React.CSSProperties,

    titleCol: {
      flex: 1,
      marginRight: 10,
    } as React.CSSProperties,

    titleText: {
      fontSize: `${title}pt`,
    } as React.CSSProperties,

    titleBold: {
      fontWeight: 'bold' as const,
    } as React.CSSProperties,

    dateCol: {
      flexShrink: 0,
      textAlign: 'right' as const,
      fontSize: `${title}pt`,
      fontStyle: 'italic' as const,
    } as React.CSSProperties,

    projectRow: {
      fontSize: `${body}pt`,
      marginTop: cfg.projectTitle.spaceBefore,
    } as React.CSSProperties,

    projectName: {
      fontWeight: cfg.projectTitle.bold ? 'bold' : 'normal',
      fontSize: `${cfg.projectTitle.size}pt`,
    } as React.CSSProperties,

    projectTech: {
      fontSize: `${cfg.projectTech.size}pt`,
      fontStyle: cfg.projectTech.italic ? 'italic' : 'normal',
      color: cfg.colors.muted,
    } as React.CSSProperties,

    bulletRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      paddingLeft: cfg.bullet.indent,
      marginBottom: 0.5,
    } as React.CSSProperties,

    bulletDot: {
      fontSize: `${body}pt`,
      width: 10,
      flexShrink: 0,
    } as React.CSSProperties,

    bulletText: {
      fontSize: `${body}pt`,
      flex: 1,
      textAlign: cfg.bullet.align,
      lineHeight: cfg.bullet.lineHeight,
    } as React.CSSProperties,

    eduRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginTop: 1,
    } as React.CSSProperties,

    eduText: {
      fontSize: `${body}pt`,
      flex: 1,
      marginRight: 4,
    } as React.CSSProperties,

    eduBold: {
      fontWeight: cfg.education.bold ? 'bold' : 'normal',
    } as React.CSSProperties,

    eduDate: {
      fontSize: `${body}pt`,
      flexShrink: 0,
      textAlign: 'right' as const,
      fontStyle: 'italic' as const,
    } as React.CSSProperties,
  }
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
