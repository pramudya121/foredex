import { memo, ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useScrollReveal, useStaggeredReveal } from '@/hooks/useScrollReveal';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
}

const getTransformStyle = (
  direction: string, 
  distance: number, 
  isVisible: boolean
): CSSProperties => {
  const transforms: Record<string, string> = {
    up: `translateY(${isVisible ? 0 : distance}px)`,
    down: `translateY(${isVisible ? 0 : -distance}px)`,
    left: `translateX(${isVisible ? 0 : distance}px)`,
    right: `translateX(${isVisible ? 0 : -distance}px)`,
    scale: `scale(${isVisible ? 1 : 0.9})`,
    fade: 'none',
  };

  return {
    transform: transforms[direction] || transforms.up,
    opacity: isVisible ? 1 : 0,
  };
};

export const ScrollReveal = memo(function ScrollReveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 600,
  distance = 30,
  once = true,
}: ScrollRevealProps) {
  const [ref, isVisible] = useScrollReveal<HTMLDivElement>({ triggerOnce: once });

  return (
    <div
      ref={ref}
      className={cn('transition-all will-change-transform', className)}
      style={{
        ...getTransformStyle(direction, distance, isVisible),
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
});

interface StaggeredRevealProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  baseDelay?: number;
  staggerDelay?: number;
  duration?: number;
  distance?: number;
}

export const StaggeredReveal = memo(function StaggeredReveal({
  children,
  className,
  itemClassName,
  direction = 'up',
  baseDelay = 100,
  staggerDelay,
  duration = 500,
  distance = 20,
}: StaggeredRevealProps) {
  const delay = staggerDelay ?? baseDelay;
  const { containerRef, visibleItems } = useStaggeredReveal(children.length, delay);

  return (
    <div ref={containerRef} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn('transition-all will-change-transform', itemClassName)}
          style={{
            ...getTransformStyle(direction, distance, visibleItems[index]),
            transitionDuration: `${duration}ms`,
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
});

// Section wrapper with reveal animation
interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export const RevealSection = memo(function RevealSection({
  children,
  className,
  id,
}: RevealSectionProps) {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'transition-all duration-700 will-change-transform',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
    >
      {children}
    </section>
  );
});
