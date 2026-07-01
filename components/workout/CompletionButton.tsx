"use client";
import { useState } from "react";

interface CompletionButtonProps {
  completed: boolean;
  onToggle:  (completed: boolean) => void;
}

export function CompletionButton({ completed, onToggle }: CompletionButtonProps) {
  const [burst, setBurst] = useState(false);

  function handleClick() {
    if (!completed) {
      setBurst(true);
      setTimeout(() => setBurst(false), 220);
    }
    onToggle(!completed);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:ring-offset-2
        ${burst ? "scale-125" : "active:scale-90"}
        ${completed
          ? "bg-[#534AB7] border-[#534AB7] text-white shadow-[0_2px_10px_rgba(83,74,183,0.30)]"
          : "bg-transparent border-[#D8D4CC] text-transparent hover:border-[#534AB7] hover:bg-[#F5F3EE]"
        }
      `}
      aria-label={completed ? "Mark incomplete" : "Mark complete"}
      aria-pressed={completed}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <polyline
          points="4,10.5 8.5,15 16,6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
