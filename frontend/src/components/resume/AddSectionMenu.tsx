import { useState, useRef, useEffect } from 'react'
import { SECTION_PRESETS } from '../../lib/resumeSectionPresets'
import { useResumeBuilderStore } from '../../lib/resumeStore'

export default function AddSectionMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const addSection = useResumeBuilderStore(s => s.addSection)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-accent hover:text-accent2 bg-transparent border border-dashed border-border hover:border-accent rounded-md px-3 py-1.5 cursor-pointer transition-all w-full"
      >
        + Add Section
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-surface border border-border rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
          {SECTION_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                addSection({ id: preset.id, header: preset.header, layout: preset.layout })
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface2 bg-transparent border-none cursor-pointer transition-colors"
            >
              <span className="font-medium">{preset.label}</span>
              <span className="text-text2 ml-1.5">({preset.layout})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
