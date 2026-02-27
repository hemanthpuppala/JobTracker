import type { ATSCategoryScore } from '../../api/ats'

const CATEGORY_LABELS: Record<string, string> = {
  keyword_match: 'Keyword Match',
  skills_match: 'Skills Match',
  experience_relevance: 'Experience Relevance',
  education_match: 'Education Match',
  section_completeness: 'Section Completeness',
  quantification: 'Quantification & Impact',
  action_verbs: 'Action Verbs',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green'
  if (score >= 60) return 'text-orange'
  return 'text-red'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green'
  if (score >= 60) return 'bg-orange'
  return 'bg-red'
}

export default function CategoryBar({ name, cat }: { name: string; cat: ATSCategoryScore }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-text2">{CATEGORY_LABELS[name] || name}</span>
        <span className={`font-medium ${scoreColor(cat.score)}`}>{cat.score}%</span>
      </div>
      <div className="h-2 bg-surface3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBg(cat.score)}`}
          style={{ width: `${cat.score}%` }}
        />
      </div>
    </div>
  )
}
