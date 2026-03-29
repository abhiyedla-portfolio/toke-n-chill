'use client';

import { useEffect, useRef, useState } from 'react';

export default function GlowCursor() {
  const [isDesktop, setIsDesktop] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);

  useEffect(() => {
    const checkWidth = () => setIsDesktop(window.innerWidth > 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    const animate = () => {
      const ease = 0.08;
      pos.current.x += (mouse.current.x - pos.current.x) * ease;
      pos.current.y += (mouse.current.y - pos.current.y) * ease;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${pos.current.x - 100}px, ${pos.current.y - 100}px)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [isDesktop]);

  if (!isDesktop) return null;

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed left-0 top-0 z-10"
      aria-hidden="true"
      style={{
        width: 200,
        height: 200,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(255, 45, 123, 0.07) 0%, transparent 70%)',
        mixBlendMode: 'screen',
        willChange: 'transform',
      }}
    />
  );
}
