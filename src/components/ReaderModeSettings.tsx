"use client";

import { useState, useRef, useEffect } from "react";
import { Type, Maximize2, Minimize2, RotateCcw } from "lucide-react";

export interface ReaderSettings {
  fontSize: "sm" | "base" | "lg" | "xl";
  fontFamily: "sans" | "serif" | "mono";
  lineHeight: "normal" | "relaxed" | "loose";
  isFocusMode: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: "base",
  fontFamily: "sans",
  lineHeight: "relaxed",
  isFocusMode: false,
};

interface ReaderModeSettingsProps {
  settings: ReaderSettings;
  onChange: (settings: ReaderSettings) => void;
}

export default function ReaderModeSettings({
  settings,
  onChange,
}: ReaderModeSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle ESC key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && settings.isFocusMode) {
        onChange({ ...settings, isFocusMode: false });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings, onChange]);

  const update = (partial: Partial<ReaderSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const isCustomized =
    settings.fontSize !== DEFAULT_READER_SETTINGS.fontSize ||
    settings.fontFamily !== DEFAULT_READER_SETTINGS.fontFamily ||
    settings.lineHeight !== DEFAULT_READER_SETTINGS.lineHeight;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
          isOpen || isCustomized
            ? "bg-cyan-950/60 border-cyan-800 text-cyan-300"
            : "bg-gray-800/80 hover:bg-gray-800 border-gray-700/60 text-gray-300 hover:text-white"
        }`}
        title="Reader & Typography Settings (Aa)"
      >
        <span className="font-serif font-bold text-xs tracking-tight">Aa</span>
      </button>

      {/* Popover Settings Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl z-50 space-y-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reader Mode</span>
            </div>

            {isCustomized && (
              <button
                type="button"
                onClick={() => onChange(DEFAULT_READER_SETTINGS)}
                className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center gap-1 transition cursor-pointer"
                title="Reset to default settings"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Font Size Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Text Size
            </label>
            <div className="grid grid-cols-4 gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800/80">
              {[
                { key: "sm", label: "A-", name: "Small" },
                { key: "base", label: "A", name: "Default" },
                { key: "lg", label: "A+", name: "Large" },
                { key: "xl", label: "A++", name: "Extra Large" },
              ].map((size) => (
                <button
                  key={size.key}
                  type="button"
                  onClick={() => update({ fontSize: size.key as ReaderSettings["fontSize"] })}
                  className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    settings.fontSize === size.key
                      ? "bg-cyan-500 text-black shadow-xs"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title={size.name}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Typography / Font Family */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Typography
            </label>
            <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800/80">
              <button
                type="button"
                onClick={() => update({ fontFamily: "sans" })}
                className={`py-1.5 rounded-lg text-xs font-sans transition cursor-pointer ${
                  settings.fontFamily === "sans"
                    ? "bg-cyan-500 text-black font-bold shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Modern
              </button>
              <button
                type="button"
                onClick={() => update({ fontFamily: "serif" })}
                className={`py-1.5 rounded-lg text-xs font-serif transition cursor-pointer ${
                  settings.fontFamily === "serif"
                    ? "bg-cyan-500 text-black font-bold shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Editorial
              </button>
              <button
                type="button"
                onClick={() => update({ fontFamily: "mono" })}
                className={`py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                  settings.fontFamily === "mono"
                    ? "bg-cyan-500 text-black font-bold shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Mono
              </button>
            </div>
          </div>

          {/* Line Spacing */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Line Spacing
            </label>
            <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800/80">
              <button
                type="button"
                onClick={() => update({ lineHeight: "normal" })}
                className={`py-1 rounded-lg text-[11px] transition cursor-pointer ${
                  settings.lineHeight === "normal"
                    ? "bg-cyan-500 text-black font-bold shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => update({ lineHeight: "relaxed" })}
                className={`py-1 rounded-lg text-[11px] transition cursor-pointer ${
                  settings.lineHeight === "relaxed"
                    ? "bg-cyan-500 text-black font-bold shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Relaxed
              </button>
              <button
                type="button"
                onClick={() => update({ lineHeight: "loose" })}
                className={`py-1 rounded-lg text-[11px] transition cursor-pointer ${
                  settings.lineHeight === "loose"
                    ? "bg-cyan-500 text-black font-bold shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Spacious
              </button>
            </div>
          </div>

          {/* Distraction-Free Focus Mode Toggle */}
          <div className="pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={() => {
                update({ isFocusMode: !settings.isFocusMode });
                setIsOpen(false);
              }}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                settings.isFocusMode
                  ? "bg-cyan-950/60 border-cyan-800 text-cyan-300"
                  : "bg-gray-800/60 hover:bg-gray-800 border-gray-700/60 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {settings.isFocusMode ? (
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>Focus Mode</span>
              </span>
              <span className="text-[10px] text-gray-500">
                {settings.isFocusMode ? "Active" : "Distraction-free"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
