import { cn } from "@/lib/utils";
import { useState } from "react";

interface RotatingLogoProps {
  src: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  enableHover?: boolean;
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

export function RotatingLogo({
  src,
  alt,
  className,
  size = "lg",
  enableHover = true,
}: RotatingLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative inline-block perspective-1000",
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => enableHover && setIsHovered(true)}
      onMouseLeave={() => enableHover && setIsHovered(false)}
    >
      {/* Glow rings */}
      <div className="absolute inset-0 rounded-full">
        <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
        <div 
          className="absolute inset-2 bg-primary/20 rounded-full blur-xl animate-pulse" 
          style={{ animationDelay: '0.5s' }}
        />
        <div 
          className="absolute inset-4 bg-primary/10 rounded-full blur-lg animate-pulse" 
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* 3D Rotating container */}
      <div
        className={cn(
          "relative w-full h-full preserve-3d transition-transform duration-700 ease-out",
          !isHovered && "animate-slow-rotate"
        )}
        style={{
          transform: isHovered 
            ? "rotateY(180deg) rotateX(15deg)" 
            : undefined,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full object-contain drop-shadow-2xl",
              "animate-wolf-breathe"
            )}
          />
        </div>

        {/* Back face (mirrored) */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full object-contain drop-shadow-2xl opacity-80",
              "animate-wolf-breathe"
            )}
          />
        </div>
      </div>

      {/* Orbiting particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 rounded-full bg-primary animate-orbit"
            style={{
              width: `${4 - i}px`,
              height: `${4 - i}px`,
              opacity: 1 - i * 0.2,
              animationDuration: `${3 + i}s`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
