function scoreColor(score: number): string {
  if (score >= 80) return 'text-green'
  if (score >= 60) return 'text-orange'
  return 'text-red'
}

export default function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const radius = (size / 2) - 16
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center relative">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface3" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-xs text-text2">/100</span>
      </div>
    </div>
  )
}
