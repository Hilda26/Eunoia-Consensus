"use client";
import { Minus, Plus } from "lucide-react";

// Number input with visible +/- touch targets. Desktop browsers show
// spinner arrows on <input type="number">, but mobile browsers don't,
// so users had no way to nudge mood/stress/etc. on a phone.
export function NumberStepper({
  value, min = 1, max = 10, step = 1, onChange
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  function clamp(v: number) {
    if (Number.isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }
  return (
    <div className="flex items-stretch gap-1.5">
      <button
        type="button"
        aria-label="decrease"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="thin-border rounded-2xl px-3 grid place-items-center bg-bg/60 hover:bg-panel active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(clamp(Number(e.target.value)))}
        className="text-center"
      />
      <button
        type="button"
        aria-label="increase"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="thin-border rounded-2xl px-3 grid place-items-center bg-bg/60 hover:bg-panel active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
