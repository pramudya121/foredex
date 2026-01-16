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
    <p className={cn("", className)}>
      {wordsArray.map((word, idx) => {
        const isVisible = idx < displayedWords.length;
        return (
          <span
            key={word + idx}
            className={cn(
              "inline transition-all duration-300",
              isVisible ? "opacity-100 blur-0" : "opacity-0 blur-sm"
            )}
            style={{
              transitionDelay: `${idx * 0.05}s`,
            }}
          >
            {word}{idx < wordsArray.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </p>
  );
}
