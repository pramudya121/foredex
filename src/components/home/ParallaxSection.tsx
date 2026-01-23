import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  speed?: number; // 0.1 to 1, lower = slower parallax
  direction?: 'up' | 'down';
}

export const ParallaxSection = memo(function ParallaxSection({
  children,
  className,
  speed = 0.3,
  direction = 'up'
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how far the element is from the center of the viewport
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      const distanceFromCenter = elementCenter - viewportCenter;
      
      // Apply parallax effect based on distance
      const parallaxOffset = distanceFromCenter * speed * (direction === 'up' ? 1 : -1);
      setOffset(parallaxOffset);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, direction]);

  return (
    <div
      ref={ref}
      className={cn("transition-transform duration-100 ease-out", className)}
      style={{ transform: `translateY(${offset}px)` }}
    >
      {children}
    </div>
  );
});

// Parallax background elements
export const ParallaxBackground = memo(function ParallaxBackground() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
      {/* Primary glow */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{ 
          left: '10%',
          top: `${100 - scrollY * 0.1}px`,
          transform: `translateY(${scrollY * 0.2}px)`,
          backgroundColor: 'hsl(var(--primary) / 0.1)',
        }}
      />
      
      {/* Secondary glow */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{ 
          right: '10%',
          top: `${400 - scrollY * 0.05}px`,
          transform: `translateY(${scrollY * 0.15}px) translateX(${scrollY * 0.05}px)`,
          backgroundColor: 'hsl(var(--primary) / 0.05)',
        }}
      />
      
      {/* Accent glow */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px]"
        style={{ 
          left: '40%',
          top: `${800 - scrollY * 0.08}px`,
          transform: `translateY(${scrollY * 0.25}px)`,
          backgroundColor: 'hsl(var(--primary) / 0.08)',
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${15 + i * 15}%`,
            top: `${200 + i * 100}px`,
            transform: `translateY(${scrollY * (0.1 + i * 0.05)}px)`,
            opacity: 0.3 + (i * 0.1),
            backgroundColor: 'hsl(var(--primary) / 0.3)',
          }}
        />
      ))}
    </div>
  );
});
