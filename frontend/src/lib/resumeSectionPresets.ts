export type CustomLayout = 'bullets' | 'keyvalue' | 'text'

export interface SectionPreset {
  id: string
  label: string
  layout: CustomLayout
  header: string
}

export const SECTION_PRESETS: SectionPreset[] = [
  { id: 'certifications', label: 'Certifications',  layout: 'bullets',  header: 'Certifications' },
  { id: 'awards',         label: 'Awards & Honors', layout: 'bullets',  header: 'Awards & Honors' },
  { id: 'publications',   label: 'Publications',    layout: 'bullets',  header: 'Publications' },
  { id: 'volunteering',   label: 'Volunteering',    layout: 'bullets',  header: 'Volunteering' },
  { id: 'languages',      label: 'Languages',       layout: 'keyvalue', header: 'Languages' },
  { id: 'interests',      label: 'Interests',       layout: 'text',     header: 'Interests' },
  { id: 'blank',          label: 'Blank Section',   layout: 'bullets',  header: 'New Section' },
]
