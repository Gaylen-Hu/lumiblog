'use client';

import { CSSProperties } from 'react';

interface ShinyTextProps {
  text: string;
  color?: string;
  shineColor?: string;
  speed?: number;
  className?: string;
}

// Shiny text effect from reactbits.dev/text-animations/shiny-text
export default function ShinyText({
  text,
  color = '#b5b5b5',
  shineColor = '#ffffff',
  speed = 2,
  className = '',
}: ShinyTextProps) {
  const style: CSSProperties = {
    color,
    backgroundImage: `linear-gradient(120deg, ${color} 40%, ${shineColor} 50%, ${color} 60%)`,
    backgroundSize: '200% 100%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: `shiny-text-move ${speed}s linear infinite`,
  };

  return (
    <>
      <style>{`
        @keyframes shiny-text-move {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
      <span style={style} className={className}>
        {text}
      </span>
    </>
  );
}
