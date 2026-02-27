import type { ATSScoreResult, ATSCategoryScore } from '../../api/ats'
import ScoreRing from '../ats/ScoreRing'
import CategoryBar from '../ats/CategoryBar'
import Button from '../ui/Button'

interface Props {
  result: ATSScoreResult
  onClose: () => void
  onOptimize: () => void
  optimizing: boolean
}

export default function ATSModal({ result, onClose, onOptimize, optimizing }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-surface2 border border-border text-text2 hover:text-text cursor-pointer text-sm"
        >
          &times;
        </button>

        <h2 className="text-lg font-bold mb-4">ATS Score Analysis</h2>

        {/* Score Ring */}
        <div className="flex justify-center mb-5">
          <ScoreRing score={result.overall_score} />
        </div>

        {/* Category Breakdown */}
        <div className="bg-surface2 rounded-lg border border-border p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">Category Breakdown</h3>
          {Object.entries(result.category_scores).map(([name, cat]) => (
            <CategoryBar key={name} name={name} cat={cat as ATSCategoryScore} />
          ))}
        </div>

        {/* Missing Keywords */}
        {(result.category_scores.keyword_match?.missing?.length ?? 0) > 0 && (
          <div className="bg-surface2 rounded-lg border border-border p-4 mb-4">
            <h3 className="text-sm font-semibold mb-2">Missing Keywords</h3>
            <div className="flex flex-wrap gap-1.5">
              {result.category_scores.keyword_match?.missing?.map((kw: string) => (
                <span key={kw} className="inline-block px-2 py-0.5 rounded text-xs bg-red/10 text-red">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {(result.category_scores.skills_match?.missing?.length ?? 0) > 0 && (
          <div className="bg-surface2 rounded-lg border border-border p-4 mb-4">
            <h3 className="text-sm font-semibold mb-2">Missing Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {result.category_scores.skills_match?.missing?.map((sk: string) => (
                <span key={sk} className="inline-block px-2 py-0.5 rounded text-xs bg-orange/10 text-orange">
                  {sk}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div className="bg-surface2 rounded-lg border border-border p-4 mb-4">
            <h3 className="text-sm font-semibold mb-2">Suggestions</h3>
            <ul className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-sm text-text2 flex gap-2">
                  <span className="text-accent shrink-0">-</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={onOptimize} disabled={optimizing}>
            {optimizing ? 'Optimizing...' : 'Optimize Resume'}
          </Button>
        </div>
      </div>
    </div>
  )
}
