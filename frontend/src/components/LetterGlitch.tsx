/**
 * LetterGlitch — canvas-based glitch background
 * Inspired by react-bits LetterGlitch component
 */
import { useEffect, useRef, useCallback } from 'react';

interface LetterGlitchProps {
  glitchColors?: string[];
  glitchSpeed?: number;
  outerVignette?: boolean;
  centerVignette?: boolean;
  className?: string;
}

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?/\\|<>[]{}~^-_=+;:';

const FONT_SIZE = 16;

export default function LetterGlitch({
  glitchColors = ['#1a3a2a', '#61dca3', '#2d6a9f'],
  glitchSpeed = 60,
  outerVignette = true,
  centerVignette = false,
  className,
}: LetterGlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const lastRef   = useRef(0);

  type Letter = { char: string; color: string };
  const lettersRef = useRef<Letter[]>([]);
  const gridRef    = useRef({ cols: 0, rows: 0 });

  const randomChar  = () => CHARS[Math.floor(Math.random() * CHARS.length)];
  const randomColor = useCallback(
    () => glitchColors[Math.floor(Math.random() * glitchColors.length)],
    [glitchColors],
  );

  const initGrid = useCallback(
    (w: number, h: number) => {
      const cols = Math.floor(w / FONT_SIZE);
      const rows = Math.floor(h / FONT_SIZE);
      gridRef.current = { cols, rows };
      lettersRef.current = Array.from({ length: cols * rows }, () => ({
        char:  randomChar(),
        color: randomColor(),
      }));
    },
    [randomColor],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ── Sizing ─────────────────────────────────────────────────── */
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width  = p.clientWidth;
      canvas.height = p.clientHeight;
      initGrid(canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    /* ── Render loop ────────────────────────────────────────────── */
    const animate = (time: number) => {
      if (time - lastRef.current >= glitchSpeed) {
        lastRef.current = time;

        const { cols } = gridRef.current;
        const letters  = lettersRef.current;

        ctx.fillStyle = '#08090e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font         = `${FONT_SIZE}px 'JetBrains Mono', 'Fira Code', monospace`;
        ctx.textBaseline = 'top';

        for (let i = 0; i < letters.length; i++) {
          /* ~3 % of cells glitch each frame */
          if (Math.random() < 0.03) {
            letters[i].char  = randomChar();
            letters[i].color = randomColor();
          }
          ctx.fillStyle = letters[i].color;
          ctx.fillText(
            letters[i].char,
            (i % cols) * FONT_SIZE,
            Math.floor(i / cols) * FONT_SIZE,
          );
        }

        /* Outer vignette — darkens edges */
        if (outerVignette) {
          const g = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2,
            Math.min(canvas.width, canvas.height) * 0.15,
            canvas.width / 2, canvas.height / 2,
            Math.max(canvas.width, canvas.height) * 0.75,
          );
          g.addColorStop(0, 'transparent');
          g.addColorStop(1, 'rgba(8,9,14,0.94)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        /* Center vignette — darkens center */
        if (centerVignette) {
          const g = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2,
            Math.min(canvas.width, canvas.height) * 0.45,
          );
          g.addColorStop(0, 'rgba(8,9,14,0.82)');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [glitchColors, glitchSpeed, outerVignette, centerVignette, initGrid, randomColor]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
