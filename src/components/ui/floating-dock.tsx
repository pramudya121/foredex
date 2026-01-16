import { cn } from "@/lib/utils";
import React, { useState } from "react";

interface DockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  isActive?: boolean;
}

interface FloatingDockProps {
  items: DockItem[];
  className?: string;
  onNavigate?: (href: string) => void;
}

export function FloatingDock({ items, className, onNavigate }: FloatingDockProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-end gap-2 px-4 py-3",
        "glass-card backdrop-blur-xl",
        "border border-border/50 shadow-xl shadow-black/20",
        className
      )}
      style={{ borderRadius: "9999px" }}
    >
      {items.map((item, index) => {
        const isHovered = hoveredIndex === index;
        const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1;
        
        const scale = isHovered ? 1.4 : isNeighbor ? 1.2 : 1;
        const translateY = isHovered ? -12 : isNeighbor ? -6 : 0;

        return (
          <button
            key={item.href}
            onClick={() => onNavigate?.(item.href)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              "relative flex flex-col items-center justify-center",
              "w-12 h-12 rounded-full",
              "transition-all duration-300 ease-out",
              item.isActive 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            style={{
              transform: `scale(${scale}) translateY(${translateY}px)`,
            }}
          >
            {item.icon}
            
            {/* Tooltip */}
            <span
              className={cn(
                "absolute -top-10 left-1/2 -translate-x-1/2",
                "px-3 py-1.5 rounded-lg bg-card border border-border",
                "text-xs font-medium whitespace-nowrap",
                "transition-all duration-200",
                isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
            >
              {item.title}
            </span>
            
            {/* Active indicator */}
            {item.isActive && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
