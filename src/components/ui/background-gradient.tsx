import { cn } from "@/lib/utils";
import React from "react";

interface BackgroundGradientProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}

export function BackgroundGradient({
  children,
  className,
  containerClassName,
  animate = true,
}: BackgroundGradientProps) {
  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
    },
  };

  return (
    <div className={cn("relative p-[2px] group", containerClassName)}>
      <div
        className={cn(
          "absolute inset-0 rounded-2xl z-[1] opacity-60 group-hover:opacity-100 blur-xl transition duration-500",
          animate && "animate-gradient-xy"
        )}
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.3), hsl(var(--primary)))",
          backgroundSize: "400% 400%",
        }}
      />
      <div
        className={cn(
          "absolute inset-0 rounded-2xl z-[1]",
          animate && "animate-gradient-xy"
        )}
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.3), hsl(var(--primary)))",
          backgroundSize: "400% 400%",
        }}
      />
      <div className={cn("relative z-10 bg-card rounded-[calc(1rem-2px)]", className)}>
        {children}
      </div>
    </div>
  );
}
