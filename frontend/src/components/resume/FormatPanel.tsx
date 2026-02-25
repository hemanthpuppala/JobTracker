/**
 * Side panel for formatting controls when an element is selected in interactive mode.
 * Shows section-level and element-level formatting options.
 */
import { useResumeBuilderStore } from '../../lib/resumeStore'
import { cn } from '../../lib/utils'
import { useState } from 'react'

const btnCls = (active: boolean) =>
  cn(
    'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors cursor-pointer border',
    active
      ? 'bg-gray-900 text-white border-gray-900'
      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
  )

const labelCls = 'text-[0.6rem] text-gray-500 uppercase tracking-wider mb-1'

export default function FormatPanel() {
  const { selectedElementId, elementStyles, setElementStyle, setSelectedElement, styles, setBaseFontSize } = useResumeBuilderStore()
  const [tab, setTab] = useState<'element' | 'section'>('element')

  if (!selectedElementId) return null

  const elStyle = elementStyles[selectedElementId] || {}

  // Parse section from element id (e.g. "exp-3-bullet-1" → "exp")
  const section = selectedElementId.split('-')[0]
  const sectionLabel: Record<string, string> = {
    contact: 'Contact',
    summary: 'Summary',
    skill: 'Skills',
    exp: 'Experience',
    proj: 'Projects',
    edu: 'Education',
  }

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

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {tab === 'element' ? (
          <>
            {/* Selected element info */}
            <div>
              <div className={labelCls}>Selected</div>
              <div className="text-xs text-gray-700 font-mono bg-gray-50 rounded px-2 py-1 truncate">
                {selectedElementId}
              </div>
            </div>

            {/* Bold / Italic / Underline */}
            <div>
              <div className={labelCls}>Text Style</div>
              <div className="flex gap-1">
                <button
                  className={btnCls(!!elStyle.bold)}
                  onClick={() => setElementStyle(selectedElementId, { bold: !elStyle.bold })}
                >
                  <strong>B</strong>
                </button>
                <button
                  className={btnCls(!!elStyle.italic)}
                  onClick={() => setElementStyle(selectedElementId, { italic: !elStyle.italic })}
                >
                  <em>I</em>
                </button>
                <button
                  className={btnCls(!!elStyle.underline)}
                  onClick={() => setElementStyle(selectedElementId, { underline: !elStyle.underline })}
                >
                  <u>U</u>
                </button>
              </div>
            </div>

            {/* Font size override */}
            <div>
              <div className={labelCls}>Font Size</div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const cur = elStyle.fontSize || styles.baseFontSize
                    setElementStyle(selectedElementId, { fontSize: Math.max(7, cur - 0.5) })
                  }}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-600 hover:text-gray-900 hover:border-gray-400 cursor-pointer text-xs transition-colors"
                >
                  &minus;
                </button>
                <input
                  type="range"
                  min={7}
                  max={20}
                  step={0.5}
                  value={elStyle.fontSize || styles.baseFontSize}
                  onChange={e => setElementStyle(selectedElementId, { fontSize: Number(e.target.value) })}
                  className="flex-1 accent-gray-900 cursor-pointer"
                />
                <button
                  onClick={() => {
                    const cur = elStyle.fontSize || styles.baseFontSize
                    setElementStyle(selectedElementId, { fontSize: Math.min(20, cur + 0.5) })
                  }}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-600 hover:text-gray-900 hover:border-gray-400 cursor-pointer text-xs transition-colors"
                >
                  +
                </button>
                <span className="text-xs text-gray-600 w-10 text-right">
                  {elStyle.fontSize || styles.baseFontSize}pt
                </span>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => setElementStyle(selectedElementId, { bold: undefined, italic: undefined, underline: undefined, fontSize: undefined })}
              className="w-full text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded py-1.5 cursor-pointer transition-colors"
            >
              Reset to defaults
            </button>
          </>
        ) : (
          <>
            {/* Section-level controls */}
            <div>
              <div className={labelCls}>Section</div>
              <div className="text-xs font-medium text-gray-700">
                {sectionLabel[section] || section}
              </div>
            </div>

            <div>
              <div className={labelCls}>Base Font Size</div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setBaseFontSize(Math.max(8, styles.baseFontSize - 0.5))}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-600 hover:text-gray-900 hover:border-gray-400 cursor-pointer text-xs transition-colors"
                >
                  &minus;
                </button>
                <input
                  type="range"
                  min={8}
                  max={13}
                  step={0.5}
                  value={styles.baseFontSize}
                  onChange={e => setBaseFontSize(Number(e.target.value))}
                  className="flex-1 accent-gray-900 cursor-pointer"
                />
                <button
                  onClick={() => setBaseFontSize(Math.min(13, styles.baseFontSize + 0.5))}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-600 hover:text-gray-900 hover:border-gray-400 cursor-pointer text-xs transition-colors"
                >
                  +
                </button>
                <span className="text-xs text-gray-600 w-10 text-right">
                  {styles.baseFontSize}pt
                </span>
              </div>
            </div>

            <div className="text-[0.6rem] text-gray-400 leading-relaxed">
              Section-level controls affect all elements in the {sectionLabel[section] || section} section.
              Use the Element tab for per-field overrides.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
