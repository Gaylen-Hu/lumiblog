'use client';

import { useEffect, useRef, useState } from 'react';
import { useSprings, animated } from '@react-spring/web';

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
}

// BlurText from reactbits.dev/text-animations/blur-text
// Uses @react-spring/web (already a project dependency)
export default function BlurText({
  text,
  className = '',
  delay = 80,
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
}: BlurTextProps) {
  const tokens = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const fromY = direction === 'top' ? '-20px' : '20px';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const springs = useSprings(
    tokens.length,
    tokens.map((_, i) => ({
      from: { opacity: 0, filter: 'blur(8px)', transform: `translateY(${fromY})` },
      to: inView
        ? { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' }
        : { opacity: 0, filter: 'blur(8px)', transform: `translateY(${fromY})` },
      delay: i * delay,
      config: { tension: 280, friction: 24 },
    }))
  );

  return (
    <span ref={ref} className={className}>
      {tokens.map((token, i) => (
        <animated.span
          key={i}
          style={{ ...springs[i], display: 'inline-block', willChange: 'transform, opacity, filter' }}
        >
          {token}
          {animateBy === 'words' && i < tokens.length - 1 ? '\u00A0' : ''}
        </animated.span>
      ))}
    </span>
  );
}
