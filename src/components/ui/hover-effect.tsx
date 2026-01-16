import { cn } from "@/lib/utils";
import { useState } from "react";

interface HoverEffectItem {
  title: string;
  description: string;
  icon?: React.ReactNode;
  link?: string;
}

interface HoverEffectProps {
  items: HoverEffectItem[];
  className?: string;
}

export function HoverEffect({ items, className }: HoverEffectProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className="relative group block p-2"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Animated background */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl bg-primary/10 transition-all duration-300",
              hoveredIndex === idx ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
          />
          
          {/* Card content */}
          <div
            className={cn(
              "relative glass-card p-6 rounded-2xl h-full",
              "transition-all duration-300",
              hoveredIndex === idx && "border-primary/50 shadow-lg shadow-primary/10"
            )}
          >
            {item.icon && (
              <div className={cn(
                "w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4",
                "transition-all duration-300",
                hoveredIndex === idx && "bg-primary/20 scale-110"
              )}>
                {item.icon}
              </div>
            )}
            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
