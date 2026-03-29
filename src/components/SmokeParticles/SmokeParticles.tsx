'use client';

import { useMemo } from 'react';

interface ParticleConfig {
  id: number;
  size: number;
  left: string;
  color: string;
  opacity: number;
  duration: string;
  delay: string;
  drift: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export default function SmokeParticles() {
  const particles = useMemo<ParticleConfig[]>(() => {
    const count = 18;
    const colors = ['#FF2D7B', '#00E5FF'];

    return Array.from({ length: count }, (_, i) => {
      const r1 = seededRandom(i + 1);
      const r2 = seededRandom(i + 100);
      const r3 = seededRandom(i + 200);
      const r4 = seededRandom(i + 300);
      const r5 = seededRandom(i + 400);
      const r6 = seededRandom(i + 500);

      return {
        id: i,
        size: 2 + r1 * 6,
        left: `${r2 * 100}%`,
        color: colors[i % 2],
        opacity: 0.1 + r3 * 0.2,
        duration: `${12 + r4 * 18}s`,
        delay: `${r5 * -20}s`,
        drift: -30 + r6 * 60,
      };
    });
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes smokeFloat {
          0% {
            transform: translateY(100vh) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: var(--particle-opacity);
          }
          90% {
            opacity: var(--particle-opacity);
          }
          100% {
            transform: translateY(-10vh) translateX(var(--particle-drift));
            opacity: 0;
          }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: 0,
            backgroundColor: p.color,
            opacity: 0,
            filter: p.size > 5 ? 'blur(1px)' : undefined,
            animation: `smokeFloat ${p.duration} ${p.delay} linear infinite`,
            ['--particle-opacity' as string]: p.opacity,
            ['--particle-drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
