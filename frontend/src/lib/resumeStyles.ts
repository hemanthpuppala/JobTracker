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
