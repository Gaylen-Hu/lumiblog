'use client';

import { useEffect, useRef } from 'react';

interface BeamsProps {
  className?: string;
  beamCount?: number;
  beamColor?: string;
  beamOpacity?: number;
}

export default function Beams({
  className = '',
  beamCount = 6,
  beamColor = '#3b82f6',
  beamOpacity = 0.15,
}: BeamsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const beams = Array.from({ length: beamCount }, (_, i) => ({
      x: Math.random() * canvas.offsetWidth,
      y: -100 - Math.random() * 200,
      width: 2 + Math.random() * 3,
      height: 100 + Math.random() * 200,
      speed: 1 + Math.random() * 2,
      opacity: 0.1 + Math.random() * beamOpacity,
      angle: -15 + Math.random() * 30,
    }));

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      for (const beam of beams) {
        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate((beam.angle * Math.PI) / 180);

        const gradient = ctx.createLinearGradient(0, 0, 0, beam.height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, `${beamColor}${Math.round(beam.opacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(-beam.width / 2, 0, beam.width, beam.height);
        ctx.restore();

        beam.y += beam.speed;
        if (beam.y > canvas.offsetHeight + beam.height) {
          beam.y = -beam.height;
          beam.x = Math.random() * canvas.offsetWidth;
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [beamCount, beamColor, beamOpacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
