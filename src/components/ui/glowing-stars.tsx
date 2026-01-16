import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface GlowingStarsProps {
  className?: string;
  starCount?: number;
}

export function GlowingStars({ className, starCount = 50 }: GlowingStarsProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generatedStars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2,
      });
    }
    setStars(generatedStars);
  }, [starCount]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-primary animate-pulse"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            boxShadow: `0 0 ${star.size * 2}px ${star.size}px hsl(var(--primary) / 0.3)`,
          }}
        />
      ))}
    </div>
  );
}

interface GlowingStarsBackgroundCardProps {
  children: React.ReactNode;
  className?: string;
  starCount?: number;
}

export function GlowingStarsBackgroundCard({
  children,
  className,
  starCount = 30,
}: GlowingStarsBackgroundCardProps) {
  return (
    <div className={cn("relative overflow-hidden glass-card", className)}>
      <GlowingStars starCount={starCount} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
