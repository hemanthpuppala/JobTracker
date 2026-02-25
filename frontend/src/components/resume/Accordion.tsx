import { useState } from 'react'
import { cn } from '../../lib/utils'

interface Props {
  title: string
  defaultOpen?: boolean
  badge?: string | number
  dimmed?: boolean
  titleRight?: React.ReactNode
  children: React.ReactNode
}

export default function Accordion({ title, defaultOpen = false, badge, dimmed, titleRight, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('border-b border-border', dimmed && 'opacity-50')}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-transparent cursor-pointer transition-colors',
          'hover:bg-surface2/50 text-left',
          open ? 'text-accent' : 'text-text'
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn(
            'transition-transform duration-200 text-xs',
            open ? 'rotate-90' : 'rotate-0'
          )}>
            &#9654;
          </span>
          {title}
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 text-[0.65rem] rounded bg-surface3 text-text2">{badge}</span>
          )}
        </span>
        {titleRight && (
          <span onClick={e => e.stopPropagation()} className="flex items-center">
            {titleRight}
          </span>
        )}
      </button>
      <div className={cn(
        'overflow-hidden transition-all duration-200',
        open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}
