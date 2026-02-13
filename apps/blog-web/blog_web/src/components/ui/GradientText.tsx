'use client';

import { ReactNode, useId } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
}

export default function GradientText({
  children,
  className = '',
  colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#3b82f6'],
  animationSpeed = 8,
  showBorder = false,
}: GradientTextProps) {
  const id = useId();
  const animationName = `gradient-shift-${id.replace(/:/g, '')}`;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ${animationName} {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `,
        }}
      />
      <span
        className={`bg-clip-text text-transparent ${showBorder ? 'border-b-2 border-current' : ''} ${className}`}
        style={{
          backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
          backgroundSize: '300% 100%',
          animation: `${animationName} ${animationSpeed}s ease infinite`,
        }}
      >
        {children}
      </span>
    </>
  );
}
