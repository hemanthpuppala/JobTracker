import type { ResumeSection } from '../../lib/resumeStore'
import { cn } from '../../lib/utils'

interface SectionToolbarProps {
  section: ResumeSection
  mode: 'form' | 'interactive'
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleVisible: () => void
  onDelete?: () => void
  isFirst: boolean
  isLast: boolean
  dragHandleProps?: Record<string, any>
}

const iconBtn = 'w-5 h-5 flex items-center justify-center bg-transparent border-none cursor-pointer rounded transition-colors text-text2/60 hover:text-text hover:bg-surface2'

export default function SectionToolbar({
  section, mode, onMoveUp, onMoveDown, onToggleVisible, onDelete,
  isFirst, isLast, dragHandleProps,
}: SectionToolbarProps) {
  return (
    <div className={cn(
      'flex items-center gap-0.5',
      mode === 'interactive' && 'opacity-0 group-hover/section:opacity-100 transition-opacity',
    )}>
      {/* Drag handle */}
      <span
        className={cn(iconBtn, 'cursor-grab active:cursor-grabbing text-[10px]')}
        title="Drag to reorder"
        {...dragHandleProps}
      >
        ⠿
      </span>
      {/* Move up */}
      <button
        className={cn(iconBtn, isFirst && 'opacity-30 pointer-events-none')}
        onClick={e => { e.stopPropagation(); onMoveUp() }}
        title="Move up"
        disabled={isFirst}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
      {/* Move down */}
      <button
        className={cn(iconBtn, isLast && 'opacity-30 pointer-events-none')}
        onClick={e => { e.stopPropagation(); onMoveDown() }}
        title="Move down"
        disabled={isLast}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {/* Visibility toggle */}
      <button
        className={cn(iconBtn, !section.visible && 'text-text2/30')}
        onClick={e => { e.stopPropagation(); onToggleVisible() }}
        title={section.visible ? 'Hide section' : 'Show section'}
      >
        {section.visible ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        )}
      </button>
      {/* Delete (custom sections only) */}
      {onDelete && (
        <button
          className={cn(iconBtn, 'hover:text-red hover:bg-red/10')}
          onClick={e => { e.stopPropagation(); onDelete() }}
          title="Delete section"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      )}
    </div>
  )
}
