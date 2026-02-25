import Button from '../ui/Button'

interface Props {
  count: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  onCancel: () => void
}

export default function BulkBar({ count, onSelectAll, onDeselectAll, onDelete, onCancel }: Props) {
  return (
    <div className="flex items-center gap-3 px-5 py-2 bg-surface border-b border-border animate-fadeIn">
      <span className="text-sm font-semibold">{count} selected</span>
      <Button variant="outline" size="sm" onClick={onSelectAll}>Select All</Button>
      <Button variant="outline" size="sm" onClick={onDeselectAll}>Deselect All</Button>
      <span className="flex-1" />
      <Button variant="danger" size="sm" onClick={onDelete}>Delete Selected</Button>
      <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
    </div>
  )
}
