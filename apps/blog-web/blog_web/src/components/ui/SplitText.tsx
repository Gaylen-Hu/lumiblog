'use client';

import { useSprings, animated } from '@react-spring/web';
import { useEffect, useRef, useState } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  animationFrom?: { opacity: number; transform: string };
  animationTo?: { opacity: number; transform: string };
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
}

export default function SplitText({
  text,
  className = '',
  delay = 50,
  animationFrom = { opacity: 0, transform: 'translate3d(0,30px,0)' },
  animationTo = { opacity: 1, transform: 'translate3d(0,0,0)' },
  threshold = 0.1,
  rootMargin = '-50px',
  onAnimationComplete,
}: SplitTextProps) {
  const words = text.split(' ').map((word) => word.split(''));
  const letters = words.flat();
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const animatedCount = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const springs = useSprings(
    letters.length,
    letters.map((_, i) => ({
      from: animationFrom,
      to: inView
        ? async (next: (props: typeof animationTo) => Promise<void>) => {
            await next(animationTo);
            animatedCount.current += 1;
            if (animatedCount.current === letters.length && onAnimationComplete) {
              onAnimationComplete();
            }
          }
        : animationFrom,
      delay: i * delay,
      config: { tension: 300, friction: 20 },
    }))
  );

  return (
    <span ref={ref} className={className}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block">
          {word.map((letter, letterIndex) => {
            const index = words
              .slice(0, wordIndex)
              .reduce((acc, w) => acc + w.length, 0) + letterIndex;

            return (
              <animated.span
                key={index}
                style={{
                  ...springs[index],
                  display: 'inline-block',
                  willChange: 'transform, opacity',
                }}
              >
                {letter}
              </animated.span>
            );
          })}
          {wordIndex < words.length - 1 && (
            <span className="inline-block">&nbsp;</span>
          )}
        </span>
      ))}
    </span>
  );
}
