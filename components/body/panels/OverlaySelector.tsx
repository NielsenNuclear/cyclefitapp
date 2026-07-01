"use client";

import type { VisualizationLayer } from "@/lib/bodyIntelligence/BodyStateEngine";
import { LAYER_META }              from "../rendering/OverlaySystem";

interface OverlaySelectorProps {
  layer:    VisualizationLayer;
  onChange: (l: VisualizationLayer) => void;
  variant?: "vertical" | "horizontal";
}

export function OverlaySelector({
  layer,
  onChange,
  variant = "vertical",
}: OverlaySelectorProps) {
  if (variant === "horizontal") {
    return (
      <div
        role="radiogroup"
        aria-label="Visualization overlay"
        className="flex items-center gap-0.5 overflow-x-auto scrollbar-none"
      >
        {LAYER_META.map(m => {
          const active = layer === m.id;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(m.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:ring-offset-1 ${
                active
                  ? "bg-[#534AB7] text-white"
                  : "text-[#6B6860] hover:text-[#1C1B18] hover:bg-black/5"
              }`}
            >
              <span
                className={`w-[7px] h-[7px] rounded-full flex-shrink-0 transition-colors ${
                  active ? "bg-white/80" : "bg-[#C8C5BC]"
                }`}
              />
              {m.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Vertical radio list (left sidebar)
  return (
    <div
      role="radiogroup"
      aria-label="Visualization overlay"
      className="space-y-px"
    >
      {LAYER_META.map(m => {
        const active = layer === m.id;
        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] ${
              active ? "bg-[#EEEDFE]" : "hover:bg-[#F5F3EE]"
            }`}
          >
            {/* Radio dot */}
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                active ? "border-[#534AB7] bg-[#534AB7]" : "border-[#C8C5BC]"
              }`}
            >
              {active && (
                <span className="w-[5px] h-[5px] rounded-full bg-white" />
              )}
            </span>
            <span
              className={`text-[12px] leading-none ${
                active
                  ? "text-[#3C3489] font-semibold"
                  : "text-[#4A4845] font-medium"
              }`}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
