"use client";

import { useState } from "react";
import { getColorName } from "@/lib/color-names";

type ColorMap = Record<string, { background: string; foreground: string }>;

interface ColorPickerProps {
  colors: ColorMap;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function ColorPicker({ colors, selectedId, onSelect }: ColorPickerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [touchedId, setTouchedId] = useState<string | null>(null);

  const entries = Object.entries(colors);

  function handleSelect(id: string | null) {
    onSelect(id);
    if (id !== null || touchedId === "__none__") {
      setTouchedId(touchedId === (id ?? "__none__") ? null : (id ?? "__none__"));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span className="relative inline-block">
        <button
          type="button"
          onClick={() => handleSelect(null)}
          onMouseEnter={() => setHoveredId("__none__")}
          onMouseLeave={() => setHoveredId(null)}
          className={`h-8 w-8 sm:h-7 sm:w-7 rounded-full transition-all border border-[var(--border-color)] ${
            selectedId === null
              ? "ring-2 ring-offset-2 ring-[var(--accent-color)] ring-offset-[var(--bg-color)]"
              : "hover:scale-110 hover:ring-2 hover:ring-offset-2 hover:ring-[var(--border-color)] hover:ring-offset-[var(--bg-color)]"
          }`}
          style={{ background: "transparent" }}
          aria-label="No color"
        />
        {(hoveredId === "__none__" || touchedId === "__none__") && (
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#1f2937] dark:bg-[#1a1a24] px-2 py-1 text-xs text-white shadow-md border border-white/10">
            No color
          </div>
        )}
      </span>
      {entries.map(([id, c]) => {
        const showTooltip = hoveredId === id || touchedId === id;
        return (
          <span key={id} className="relative inline-block">
            <button
              type="button"
              onClick={() => handleSelect(id)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`h-8 w-8 sm:h-7 sm:w-7 rounded-full border border-black/10 dark:border-white/10 transition-all ${
                selectedId === id
                  ? "ring-2 ring-offset-2 ring-[var(--accent-color)] ring-offset-[var(--bg-color)] scale-110"
                  : "hover:scale-110 hover:ring-2 hover:ring-offset-2 hover:ring-[var(--accent-color)] hover:ring-offset-[var(--bg-color)]"
              }`}
              style={{ background: c.background }}
              aria-label={getColorName(id, colors)}
            />
            {showTooltip && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#1f2937] dark:bg-[#1a1a24] px-2 py-1 text-xs text-white shadow-md border border-white/10">
                {getColorName(id, colors)}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
