/**
 * Live PDF preview using @react-pdf/renderer's PDFViewer.
 * Debounces re-renders by 300ms for performance.
 */
import { useMemo, useState, useEffect, useRef } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import ResumeDocument from './ResumeDocument'
import type { ResumeDocumentProps } from './ResumeDocument'
import { useResumeBuilderStore, getDocumentProps } from '../../lib/resumeStore'

/** Hook to debounce a value by `delay` ms */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer.current)
  }, [value, delay])

  return debounced
}

export default function ResumePreview() {
  const store = useResumeBuilderStore()

  const rawProps: ResumeDocumentProps = useMemo(() => getDocumentProps(store), [
    store.contact, store.summary, store.experiences, store.projects, store.skills,
    store.education, store.styles, store.richContent, store.elementStyles,
    store.sectionHeaders, store.sections, store.customSections,
  ])

  const debouncedProps = useDebounce(rawProps, 300)

  return (
    <div className="h-full bg-[#525659] flex items-center justify-center p-4">
      <PDFViewer
        width="100%"
        height="100%"
        showToolbar={false}
        style={{ border: 'none', borderRadius: 4 }}
      >
        <ResumeDocument {...debouncedProps} />
      </PDFViewer>
    </div>
  )
}
