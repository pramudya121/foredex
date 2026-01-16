import React from "react";
import { cn } from "@/lib/utils";

interface MovingBorderProps {
  children: React.ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  offset?: number;
  borderClassName?: string;
}

export function MovingBorder({
  children,
  duration = 3000,
  className,
  containerClassName,
  borderRadius = "1rem",
  offset = 2,
  borderClassName,
}: MovingBorderProps) {
  return (
    <div
      className={cn(
        "relative p-[2px] overflow-hidden",
        containerClassName
      )}
      style={{ borderRadius }}
    >
      {/* Animated gradient border */}
      <div
        className={cn(
          "absolute inset-0",
          borderClassName
        )}
        style={{
          borderRadius,
          background: `linear-gradient(var(--rotation), hsl(var(--primary)), hsl(var(--primary) / 0.5), transparent, hsl(var(--primary)))`,
          animation: `moving-border ${duration}ms linear infinite`,
        }}
      />
      
      {/* Inner content */}
      <div
        className={cn(
          "relative bg-card",
          className
        )}
        style={{ 
          borderRadius: `calc(${borderRadius} - ${offset}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function MovingBorderCard({
  children,
  className,
  ...props
}: MovingBorderProps) {
  return (
    <MovingBorder
      containerClassName="group"
      className={cn("p-6", className)}
      {...props}
    >
      {children}
    </MovingBorder>
  );
}
