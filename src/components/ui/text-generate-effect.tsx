import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}

export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
}: TextGenerateEffectProps) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const wordsArray = words.split(" ");

  useEffect(() => {
    setDisplayedWords([]);
    
    wordsArray.forEach((_, index) => {
      setTimeout(() => {
        setDisplayedWords(prev => [...prev, wordsArray[index]]);
      }, index * 100);
    });
  }, [words]);

  return (
    <div className={cn("font-bold", className)}>
      {wordsArray.map((word, idx) => {
        const isVisible = idx < displayedWords.length;
        return (
          <span
            key={word + idx}
            className={cn(
              "inline-block transition-all duration-300",
              isVisible ? "opacity-100 blur-0" : "opacity-0 blur-sm"
            )}
            style={{
              transitionDelay: `${idx * 0.05}s`,
            }}
          >
            {word}{" "}
          </span>
        );
      })}
    </div>
  );
}
