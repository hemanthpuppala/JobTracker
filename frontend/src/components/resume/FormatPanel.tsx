/**
 * Side panel for formatting controls when an element is selected in interactive mode.
 * Reuses shared FormatControls for DRY element + section formatting.
 */
import { useResumeBuilderStore } from '../../lib/resumeStore'
import { cn } from '../../lib/utils'
import { useState } from 'react'
import { ElementControls, SectionControls } from './FormatControls'

export default function FormatPanel() {
  const selectedElementId = useResumeBuilderStore(s => s.selectedElementId)
  const setSelectedElement = useResumeBuilderStore(s => s.setSelectedElement)
  const [tab, setTab] = useState<'element' | 'section'>('element')

  if (!selectedElementId) return null

  const section = selectedElementId.split('-')[0]

  return (
    <div className="w-56 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-700">Format</span>
        <button
          onClick={() => setSelectedElement(null)}
          className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-sm"
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          className={cn(
            'flex-1 py-1.5 text-[0.65rem] font-medium border-none cursor-pointer transition-colors',
            tab === 'element' ? 'text-gray-900 bg-gray-50 border-b-2 border-b-gray-900' : 'text-gray-500 bg-transparent hover:text-gray-700',
          )}
          onClick={() => setTab('element')}
        >
          Element
        </button>
        <button
          className={cn(
            'flex-1 py-1.5 text-[0.65rem] font-medium border-none cursor-pointer transition-colors',
            tab === 'section' ? 'text-gray-900 bg-gray-50 border-b-2 border-b-gray-900' : 'text-gray-500 bg-transparent hover:text-gray-700',
          )}
          onClick={() => setTab('section')}
        >
          Section
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'element' ? (
          <>
            <div className="mb-3">
              <div className="text-[0.6rem] text-gray-500 uppercase tracking-wider mb-1">Selected</div>
              <div className="text-xs text-gray-700 font-mono bg-gray-50 rounded px-2 py-1 truncate">
                {selectedElementId}
              </div>
            </div>
            <ElementControls elementId={selectedElementId} />
          </>
        ) : (
          <>
            <SectionControls section={section} />
            <div className="mt-3 text-[0.6rem] text-gray-400 leading-relaxed">
              These controls affect all elements in this section.
              Use the Element tab for per-field overrides.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
