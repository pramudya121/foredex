import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("w-28 h-9 bg-muted/50 rounded-full animate-pulse", className)} />
    );
  }

  const themes = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div
      className={cn(
        "relative flex items-center p-1 rounded-full bg-muted/50 border border-border/50",
        className
      )}
    >
      {/* Sliding background */}
      <div
        className={cn(
          "absolute h-7 rounded-full bg-primary/20 border border-primary/30",
          "transition-all duration-300 ease-out"
        )}
        style={{
          width: "calc(33.333% - 4px)",
          left: theme === "light" 
            ? "2px" 
            : theme === "dark" 
              ? "calc(33.333% + 2px)" 
              : "calc(66.666% + 2px)",
        }}
      />

      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "relative z-10 flex items-center justify-center w-9 h-7 rounded-full",
            "transition-all duration-300",
            theme === value 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
          title={label}
        >
          <Icon 
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              theme === value && "scale-110"
            )} 
          />
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleButton({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("w-9 h-9 rounded-full bg-muted/50 animate-pulse", className)} />;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-9 h-9 rounded-full",
        "bg-muted/50 border border-border/50",
        "flex items-center justify-center",
        "transition-all duration-500 hover:bg-muted",
        "overflow-hidden group",
        className
      )}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {/* Sun icon */}
      <Sun
        className={cn(
          "absolute w-4 h-4 transition-all duration-500",
          resolvedTheme === "dark"
            ? "rotate-0 scale-100 text-foreground"
            : "rotate-90 scale-0 text-foreground"
        )}
      />
      
      {/* Moon icon */}
      <Moon
        className={cn(
          "absolute w-4 h-4 transition-all duration-500",
          resolvedTheme === "dark"
            ? "-rotate-90 scale-0 text-foreground"
            : "rotate-0 scale-100 text-foreground"
        )}
      />

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </button>
  );
}
