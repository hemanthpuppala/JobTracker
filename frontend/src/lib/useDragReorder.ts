import { useState, useCallback, useRef } from 'react'

interface UseDragReorderOptions<T> {
  items: T[]
  getId: (item: T) => string
  onReorder: (orderedIds: string[]) => void
}

export function useDragReorder<T>({ items, getId, onReorder }: UseDragReorderOptions<T>) {
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)

  const dragHandleProps = useCallback((id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      draggedId.current = id
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => {
      draggedId.current = null
      setDragOverId(null)
    },
  }), [])

  const dropTargetProps = useCallback((id: string) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverId(id)
    },
    onDragLeave: () => setDragOverId(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOverId(null)
      if (!draggedId.current || draggedId.current === id) return
      const ids = items.map(getId)
      const fromIdx = ids.indexOf(draggedId.current)
      const toIdx = ids.indexOf(id)
      if (fromIdx < 0 || toIdx < 0) return
      const newIds = [...ids]
      newIds.splice(fromIdx, 1)
      newIds.splice(toIdx, 0, draggedId.current)
      onReorder(newIds)
      draggedId.current = null
    },
  }), [items, getId, onReorder])

  return { dragHandleProps, dropTargetProps, dragOverId }
}
