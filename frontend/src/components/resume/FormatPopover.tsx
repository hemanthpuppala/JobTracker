/**
 * Small format button that shows a popover with Element + Section formatting.
 * Used in Form mode beside each field. Reuses shared FormatControls (DRY).
 * Renders via portal to escape overflow:hidden containers.
 * Draggable — resets to default position on close.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'
import { ElementControls, SectionControls } from './FormatControls'

export default function FormatPopover({
  elementId,
  section,
}: {
  elementId: string
  section: string
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'element' | 'section'>('element')
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [defaultPos, setDefaultPos] = useState({ top: 0, left: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

  // Compute default position from the button
  const updateDefaultPos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setDefaultPos({ top: rect.top, left: rect.right + 6 })
  }, [])

  // On open: reset drag offset, compute default pos
  useEffect(() => {
    if (!open) return
    setDragOffset({ x: 0, y: 0 })
    updateDefaultPos()
    window.addEventListener('scroll', updateDefaultPos, true)
    window.addEventListener('resize', updateDefaultPos)
    return () => {
      window.removeEventListener('scroll', updateDefaultPos, true)
      window.removeEventListener('resize', updateDefaultPos)
    }
  }, [open, updateDefaultPos])

  // Drag handlers (attached to document while dragging)
  useEffect(() => {
    if (!open) return
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setDragOffset({
        x: dragStart.current.ox + e.clientX - dragStart.current.mx,
        y: dragStart.current.oy + e.clientY - dragStart.current.my,
      })
    }
    const onMouseUp = () => { dragging.current = false }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dragging.current) return
      const target = e.target as Node
      if (btnRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: dragOffset.x, oy: dragOffset.y }
    e.preventDefault()
  }

  return (
    <>
      <button
        ref={btnRef}
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

      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] w-56 bg-white border border-gray-200 rounded-lg shadow-xl select-none"
          style={{
            top: defaultPos.top + dragOffset.y,
            left: defaultPos.left + dragOffset.x,
          }}
        >
          {/* Drag handle + Tabs */}
          <div className="flex items-center border-b border-gray-100">
            <div
              onMouseDown={onDragStart}
              className="px-1.5 py-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex items-center"
              title="Drag to move"
            >
              <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
                <circle cx="2" cy="2" r="1.2" />
                <circle cx="6" cy="2" r="1.2" />
                <circle cx="2" cy="7" r="1.2" />
                <circle cx="6" cy="7" r="1.2" />
                <circle cx="2" cy="12" r="1.2" />
                <circle cx="6" cy="12" r="1.2" />
              </svg>
            </div>
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
        </div>,
        document.body,
      )}
    </>
  )
}
