import { useCallback, useRef, useState } from 'react'

interface Props {
  left: React.ReactNode
  right: React.ReactNode
  defaultLeftPercent?: number
  minLeftPercent?: number
  maxLeftPercent?: number
}

export default function ResizableSplit({
  left,
  right,
  defaultLeftPercent = 40,
  minLeftPercent = 25,
  maxLeftPercent = 65,
}: Props) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setLeftPercent(Math.min(maxLeftPercent, Math.max(minLeftPercent, pct)))
    }

    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [minLeftPercent, maxLeftPercent])

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      <div style={{ width: `${leftPercent}%` }} className="overflow-y-auto">
        {left}
      </div>
      <div
        onMouseDown={onMouseDown}
        className="w-1 cursor-col-resize bg-border hover:bg-accent/50 transition-colors flex-shrink-0 relative group"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-text2/30 group-hover:bg-accent/60 transition-colors" />
      </div>
      <div style={{ width: `${100 - leftPercent}%` }} className="overflow-y-auto">
        {right}
      </div>
    </div>
  )
}
