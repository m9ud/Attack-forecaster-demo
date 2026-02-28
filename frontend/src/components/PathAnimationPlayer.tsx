/* ── Path Animation Player — step-by-step path highlighting ─────────── */

import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export default function PathAnimationPlayer() {
  const analysis = useStore((s: any) => s.analysis);
  const selectedPathId = useStore((s: any) => s.selectedPathId);
  const animatingPathId = useStore((s: any) => s.animatingPathId);
  const animationStep = useStore((s: any) => s.animationStep);
  const animationPlaying = useStore((s: any) => s.animationPlaying);
  const animationSpeed = useStore((s: any) => s.animationSpeed);
  const startAnimation = useStore((s: any) => s.startAnimation);
  const stopAnimation = useStore((s: any) => s.stopAnimation);
  const pauseAnimation = useStore((s: any) => s.pauseAnimation);
  const resumeAnimation = useStore((s: any) => s.resumeAnimation);
  const setAnimationStep = useStore((s: any) => s.setAnimationStep);
  const setAnimationSpeed = useStore((s: any) => s.setAnimationSpeed);

  const timerRef = useRef<number | null>(null);

  // Find the active path
  const activePath = analysis?.paths?.find((p: any) => p.pathId === animatingPathId);
  const totalSteps = activePath ? activePath.nodes.length : 0;

  // Auto-advance animation
  useEffect(() => {
    if (animationPlaying && activePath && animationStep < totalSteps - 1) {
      timerRef.current = window.setTimeout(() => {
        setAnimationStep(animationStep + 1);
      }, animationSpeed);
    } else if (animationStep >= totalSteps - 1 && animationPlaying) {
      // Animation finished
      pauseAnimation();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [animationPlaying, animationStep, animationSpeed, totalSteps]);

  if (!selectedPathId && !animatingPathId) return null;

  const pathId = animatingPathId || selectedPathId;
  const path = analysis?.paths?.find((p: any) => p.pathId === pathId);
  if (!path) return null;

  const isAnimating = !!animatingPathId;

  return (
    <div className="animation-player">
      <div className="animation-header">
        <span className="animation-title">
          &#9654; Path: <strong>{path.pathId}</strong>
          &nbsp;({path.hops} hops)
        </span>
        <span className="animation-risk">
          Risk: {path.risk} | {path.impactEstimation || 'N/A'}
        </span>
      </div>

      {/* Step indicators */}
      <div className="animation-steps">
        {path.nodes.map((node: string, i: number) => (
          <div
            key={i}
            className={`animation-step ${
              isAnimating && i === animationStep ? 'active' :
              isAnimating && i < animationStep ? 'visited' : ''
            }`}
            onClick={() => isAnimating && setAnimationStep(i)}
            title={node}
          >
            <span className="step-num">{i + 1}</span>
            <span className="step-label">{node.replace(/^(User_|GRP_|SRV_|WS_)/, '')}</span>
            {i < path.nodes.length - 1 && (
              <span className="step-arrow">&#8594;</span>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="animation-controls">
        {!isAnimating ? (
          <button className="btn-anim" onClick={() => startAnimation(path.pathId)}>
            &#9654; Play
          </button>
        ) : (
          <>
            {animationPlaying ? (
              <button className="btn-anim" onClick={pauseAnimation}>
                &#9646;&#9646; Pause
              </button>
            ) : (
              <button className="btn-anim" onClick={resumeAnimation}>
                &#9654; Resume
              </button>
            )}
            <button className="btn-anim" onClick={() => {
              stopAnimation();
              startAnimation(path.pathId);
            }}>
              &#8635; Replay
            </button>
            <button className="btn-anim btn-anim-stop" onClick={stopAnimation}>
              &#9632; Stop
            </button>
          </>
        )}

        <div className="animation-speed">
          <label>Speed:</label>
          <select
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>
      </div>
    </div>
  );
}
