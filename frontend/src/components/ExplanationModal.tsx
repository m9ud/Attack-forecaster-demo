/* ── Explanation Modal — shows step-by-step attack chain reasoning ──── */

import { useStore } from '../store';

export default function ExplanationModal() {
  const showExplanation = useStore((s: any) => s.showExplanation);
  const explanation = useStore((s: any) => s.explanation);
  const closeExplanation = useStore((s: any) => s.closeExplanation);

  if (!showExplanation || !explanation) return null;

  return (
    <div className="modal-overlay" onClick={closeExplanation}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Attack Chain Explanation</h3>
          <button className="btn-close" onClick={closeExplanation}>
            &#10005;
          </button>
        </div>
        <pre className="explanation-text">{explanation}</pre>
      </div>
    </div>
  );
}
