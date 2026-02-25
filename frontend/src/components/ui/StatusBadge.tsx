const statusColors: Record<string, string> = {
  new: 'bg-accent/15 text-accent',
  applied: 'bg-blue/15 text-blue',
  interviewing: 'bg-orange/15 text-orange',
  offer: 'bg-green/15 text-green',
  rejected: 'bg-red/15 text-red',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[0.68rem] font-semibold uppercase tracking-wide ${statusColors[status] || statusColors.new}`}>
      {status}
    </span>
  )
}
