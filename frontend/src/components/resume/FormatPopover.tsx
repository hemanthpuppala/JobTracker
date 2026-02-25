/**
 * Small format button that shows a popover with Element + Section formatting.
 * Used in Form mode beside each field. Reuses shared FormatControls (DRY).
 */
import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { ElementControls, SectionControls } from './FormatControls'

export default function FormatPopover({
  elementId,
  section,
}: {
  /** Element ID for element-level overrides (e.g. "exp-3-bullet-1") */
  elementId: string
  /** Section prefix for section-level controls (e.g. "exp") */
  section: string
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'element' | 'section'>('element')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-5 h-5 flex items-center justify-center rounded text-[0.55rem] transition-all cursor-pointer border',
          open
            ? 'bg-accent text-white border-accent'
            : 'bg-transparent text-text2 border-transparent opacity-0 group-hover:opacity-100 hover:bg-surface2 hover:border-border hover:opacity-100',
        )}
        title="Format"
      >
        Aa
      </button>

      {open && (
        <div className="absolute left-6 top-0 z-50 w-56 bg-white border border-gray-200 rounded-lg shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              className={cn(
                'flex-1 py-1.5 text-[0.6rem] font-medium border-none cursor-pointer transition-colors',
                tab === 'element' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 bg-transparent hover:text-gray-700',
              )}
              onClick={() => setTab('element')}
            >
              Element
            </button>
            <button
              className={cn(
                'flex-1 py-1.5 text-[0.6rem] font-medium border-none cursor-pointer transition-colors',
                tab === 'section' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 bg-transparent hover:text-gray-700',
              )}
              onClick={() => setTab('section')}
            >
              Section
            </button>
          </div>

          {/* Content */}
          <div className="p-3 max-h-72 overflow-y-auto">
            {tab === 'element' ? (
              <ElementControls elementId={elementId} />
            ) : (
              <SectionControls section={section} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
