'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
  formatValue?: (value: number) => string;
}

export default function AnimatedCounter({
  value,
  className = '',
  duration = 2000,
  formatValue = (v) => Math.round(v).toLocaleString(),
}: AnimatedCounterProps) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { number } = useSpring({
    from: { number: 0 },
    to: { number: inView ? value : 0 },
    config: { duration },
  });

  return (
    <animated.span ref={ref} className={className}>
      {number.to(formatValue)}
    </animated.span>
  );
}
