/**
 * Shared formatting controls used by both FormatPanel (interactive mode)
 * and FormatPopover (form mode). Single source of truth for all style UI.
 */
import { useResumeBuilderStore, type ElementStyleOverride } from '../../lib/resumeStore'
import { SECTION_CONFIG, type SectionStyleControl, type ResumeStyleConfig } from '../../lib/resumeStyles'
import { cn } from '../../lib/utils'

// --- Shared style classes ---

export const fmtBtnCls = (active: boolean) =>
  cn(
    'w-7 h-7 flex items-center justify-center rounded text-xs transition-colors cursor-pointer border',
    active
      ? 'bg-gray-900 text-white border-gray-900'
      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
  )

export const fmtLabelCls = 'text-[0.6rem] text-gray-500 uppercase tracking-wider mb-1'

const sliderBtnCls = 'w-5 h-5 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-600 hover:text-gray-900 hover:border-gray-400 cursor-pointer text-[0.6rem] transition-colors'

// --- Element-level controls (B/I/U + font size + reset) ---

export function ElementControls({ elementId }: { elementId: string }) {
  const elStyle = useResumeBuilderStore(s => s.elementStyles[elementId]) || {} as ElementStyleOverride
  const baseFontSize = useResumeBuilderStore(s => s.styles.baseFontSize)
  const setElementStyle = useResumeBuilderStore(s => s.setElementStyle)

  const curSize = elStyle.fontSize || baseFontSize

  return (
    <div className="space-y-3">
      {/* B / I / U */}
      <div>
        <div className={fmtLabelCls}>Text Style</div>
        <div className="flex gap-1">
          <button className={fmtBtnCls(!!elStyle.bold)} onClick={() => setElementStyle(elementId, { bold: !elStyle.bold })}>
            <strong>B</strong>
          </button>
          <button className={fmtBtnCls(!!elStyle.italic)} onClick={() => setElementStyle(elementId, { italic: !elStyle.italic })}>
            <em>I</em>
          </button>
          <button className={fmtBtnCls(!!elStyle.underline)} onClick={() => setElementStyle(elementId, { underline: !elStyle.underline })}>
            <u>U</u>
          </button>
        </div>
      </div>

      {/* Font size */}
      <div>
        <div className={fmtLabelCls}>Font Size</div>
        <div className="flex items-center gap-1">
          <button className={sliderBtnCls} onClick={() => setElementStyle(elementId, { fontSize: Math.max(7, curSize - 0.5) })}>
            &minus;
          </button>
          <input
            type="range" min={7} max={20} step={0.5} value={curSize}
            onChange={e => setElementStyle(elementId, { fontSize: Number(e.target.value) })}
            className="flex-1 accent-gray-900 cursor-pointer"
          />
          <button className={sliderBtnCls} onClick={() => setElementStyle(elementId, { fontSize: Math.min(20, curSize + 0.5) })}>
            +
          </button>
          <span className="text-[0.6rem] text-gray-600 w-8 text-right">{curSize}pt</span>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => setElementStyle(elementId, { bold: undefined, italic: undefined, underline: undefined, fontSize: undefined })}
        className="w-full text-[0.6rem] text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded py-1 cursor-pointer transition-colors"
      >
        Reset to defaults
      </button>
    </div>
  )
}

// --- Section-level control (single row, driven by SECTION_CONFIG) ---

export function SectionControl({ ctrl, styles, updateStyleKey }: {
  ctrl: SectionStyleControl
  styles: ResumeStyleConfig
  updateStyleKey: <K extends keyof ResumeStyleConfig>(key: K, value: Partial<ResumeStyleConfig[K]>) => void
}) {
  const current = (styles[ctrl.key] as any)?.[ctrl.field]

  if (ctrl.type === 'toggle') {
    return (
      <div>
        <div className={fmtLabelCls}>{ctrl.label}</div>
        <button className={fmtBtnCls(!!current)} onClick={() => updateStyleKey(ctrl.key, { [ctrl.field]: !current } as any)}>
          {ctrl.field === 'bold' ? <strong>B</strong> : ctrl.field === 'italic' ? <em>I</em> : ctrl.label[0]}
        </button>
      </div>
    )
  }

  if (ctrl.type === 'select' && ctrl.options) {
    return (
      <div>
        <div className={fmtLabelCls}>{ctrl.label}</div>
        <select
          value={current || ctrl.options[0]}
          onChange={e => updateStyleKey(ctrl.key, { [ctrl.field]: e.target.value } as any)}
          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 cursor-pointer"
        >
          {ctrl.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  const min = ctrl.min ?? 7
  const max = ctrl.max ?? 20
  const step = ctrl.step ?? 0.5
  const val = current ?? min
  const suffix = ctrl.field === 'lineHeight' ? 'x' : ctrl.field === 'indent' ? 'px' : 'pt'

  return (
    <div>
      <div className={fmtLabelCls}>{ctrl.label}</div>
      <div className="flex items-center gap-1">
        <button className={sliderBtnCls} onClick={() => updateStyleKey(ctrl.key, { [ctrl.field]: Math.max(min, val - step) } as any)}>
          &minus;
        </button>
        <input
          type="range" min={min} max={max} step={step} value={val}
          onChange={e => updateStyleKey(ctrl.key, { [ctrl.field]: Number(e.target.value) } as any)}
          className="flex-1 accent-gray-900 cursor-pointer"
        />
        <button className={sliderBtnCls} onClick={() => updateStyleKey(ctrl.key, { [ctrl.field]: Math.min(max, val + step) } as any)}>
          +
        </button>
        <span className="text-[0.6rem] text-gray-600 w-8 text-right">
          {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : val}{suffix}
        </span>
      </div>
    </div>
  )
}

// --- Section controls group ---

export function SectionControls({ section }: { section: string }) {
  const styles = useResumeBuilderStore(s => s.styles)
  const updateStyleKey = useResumeBuilderStore(s => s.updateStyleKey)
  const sectionCfg = SECTION_CONFIG[section]
  if (!sectionCfg) return null

  return (
    <div className="space-y-3">
      <div>
        <div className={fmtLabelCls}>Section</div>
        <div className="text-xs font-medium text-gray-700">{sectionCfg.label}</div>
      </div>
      {sectionCfg.controls.map((ctrl, i) => (
        <SectionControl key={`${ctrl.key}-${ctrl.field}-${i}`} ctrl={ctrl} styles={styles} updateStyleKey={updateStyleKey} />
      ))}
    </div>
  )
}
