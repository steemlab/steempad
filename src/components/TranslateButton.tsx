"use client";

import { useState, useEffect, useMemo } from "react";
import { Languages, Loader2, RotateCcw, Check, Globe } from "lucide-react";
import { renderSteemMarkdown } from "@/lib/renderMarkdown";

interface TranslateViewProps {
  originalMarkdown: string;
  defaultBodyHtml: string;
  jsonMetadata?: string;
  onTranslatedTextChange?: (text: string | null) => void;
  typographyClassName?: string;
}

const SCRIPT_DETECTORS = [
  { name: "Korean", code: "ko", test: (t: string) => (t.match(/[\uAC00-\uD7AF]/g)?.length || 0) >= 6 },
  { name: "Chinese", code: "zh", test: (t: string) => (t.match(/[\u4E00-\u9FFF]/g)?.length || 0) >= 12 },
  { name: "Japanese", code: "ja", test: (t: string) => (t.match(/[\u3040-\u309F\u30A0-\u30FF]/g)?.length || 0) >= 6 },
  { name: "Russian", code: "ru", test: (t: string) => (t.match(/[\u0400-\u04FF]/g)?.length || 0) >= 10 },
  { name: "Arabic", code: "ar", test: (t: string) => (t.match(/[\u0600-\u06FF]/g)?.length || 0) >= 8 },
  { name: "Bengali", code: "bn", test: (t: string) => (t.match(/[\u0980-\u09FF]/g)?.length || 0) >= 6 },
  { name: "Hindi", code: "hi", test: (t: string) => (t.match(/[\u0900-\u097F]/g)?.length || 0) >= 6 },
  {
    name: "Spanish",
    code: "es",
    test: (t: string) =>
      /\b(el|la|los|las|de|en|un|una|que|por|con|para|este|esta|como)\b/i.test(t) &&
      (t.match(/\b(el|la|de|en|que|por|con|para)\b/gi)?.length || 0) >= 5,
  },
  {
    name: "Indonesian",
    code: "id",
    test: (t: string) =>
      /\b(dan|yang|untuk|dengan|dari|ini|itu|tidak|ada|di|ke|pada|kami|saya)\b/i.test(t) &&
      (t.match(/\b(dan|yang|untuk|dengan|dari|ini|itu|tidak|ada|di|ke)\b/gi)?.length || 0) >= 5,
  },
];

export default function TranslateButton({
  originalMarkdown,
  defaultBodyHtml,
  jsonMetadata,
  onTranslatedTextChange,
  typographyClassName,
}: TranslateViewProps) {
  const [detectedLang, setDetectedLang] = useState<{ name: string; code: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);
  const [translatedRaw, setTranslatedRaw] = useState<string | null>(null);
  const [isViewingOriginal, setIsViewingOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect non-English language on mount or when content changes
  useEffect(() => {
    if (!originalMarkdown) return;

    // 1. First check Steem community tags in json_metadata
    if (jsonMetadata) {
      try {
        const meta = JSON.parse(jsonMetadata);
        const tags = Array.isArray(meta?.tags) ? meta.tags.map((t: string) => String(t).toLowerCase()) : [];
        if (tags.some((t: string) => t === "kr" || t.startsWith("kr-") || t === "korea")) {
          setDetectedLang({ name: "Korean", code: "ko" });
          return;
        }
        if (tags.some((t: string) => t === "spanish" || t === "cervantes" || t === "venezuela" || t === "colombia")) {
          setDetectedLang({ name: "Spanish", code: "es" });
          return;
        }
        if (tags.some((t: string) => t === "indonesia" || t === "steem-indo")) {
          setDetectedLang({ name: "Indonesian", code: "id" });
          return;
        }
        if (tags.some((t: string) => t === "cn" || t === "chinese")) {
          setDetectedLang({ name: "Chinese", code: "zh" });
          return;
        }
        if (tags.some((t: string) => t === "ru" || t === "russia")) {
          setDetectedLang({ name: "Russian", code: "ru" });
          return;
        }
        if (tags.some((t: string) => t === "bangladesh" || t === "bengali")) {
          setDetectedLang({ name: "Bengali", code: "bn" });
          return;
        }
      } catch {}
    }

    // 2. Fall back to script/content analysis
    const sample = originalMarkdown
      .replace(/https?:\/\/\S+/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 3000);

    for (const detector of SCRIPT_DETECTORS) {
      if (detector.test(sample)) {
        setDetectedLang({ name: detector.name, code: detector.code });
        return;
      }
    }

    setDetectedLang(null);
  }, [originalMarkdown, jsonMetadata]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    setError(null);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalMarkdown,
          sourceLang: detectedLang?.code || "autodetect",
          targetLang: "en",
        }),
      });

      if (!res.ok) {
        throw new Error("Translation request failed");
      }

      const data = await res.json();
      if (data.translatedText) {
        const html = renderSteemMarkdown(data.translatedText);
        setTranslatedHtml(html);
        setTranslatedRaw(data.translatedText);
        setIsViewingOriginal(false);
        onTranslatedTextChange?.(data.translatedText);
        if (data.languageName && !detectedLang) {
          setDetectedLang({ name: data.languageName, code: data.sourceLang });
        }
      } else {
        throw new Error(data.error || "Empty translation response");
      }
    } catch (err) {
      console.error("Translation error:", err);
      setError("Auto-translate temporarily unavailable. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const activeHtml = useMemo(() => {
    if (translatedHtml && !isViewingOriginal) {
      return translatedHtml;
    }
    return defaultBodyHtml;
  }, [translatedHtml, isViewingOriginal, defaultBodyHtml]);

  return (
    <div className="space-y-5">
      {/* 1. Pre-translation Prompt Banner (detected non-English) */}
      {detectedLang && !translatedHtml && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-sky-950/50 via-indigo-950/40 to-gray-900 border border-sky-800/40 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-sky-200">
            <Globe className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
            <span>
              This post is written in <strong className="text-sky-300 font-semibold">{detectedLang.name}</strong>.
            </span>
          </div>

          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95 shrink-0"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Translating to English…</span>
              </>
            ) : (
              <>
                <Languages className="w-3.5 h-3.5" />
                <span>Translate to English</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 2. Post-translation Control Bar */}
      {translatedHtml && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-gray-900 border border-sky-800/40 text-xs">
          <div className="flex items-center gap-2 text-sky-300 font-medium">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>
              {isViewingOriginal
                ? `Showing original (${detectedLang?.name || "Original"})`
                : `Translated from ${detectedLang?.name || "Foreign"} to English`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !isViewingOriginal;
                setIsViewingOriginal(next);
                onTranslatedTextChange?.(next ? null : translatedRaw);
              }}
              className="px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              {isViewingOriginal ? "Show English" : "Show Original"}
            </button>
            <button
              onClick={() => {
                setTranslatedHtml(null);
                setTranslatedRaw(null);
                setIsViewingOriginal(false);
                onTranslatedTextChange?.(null);
              }}
              title="Revert back to default"
              className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}

      {/* 3. The Article Content itself */}
      <div
        className={`steem-content break-words selection:bg-cyan-500 selection:text-black ${
          typographyClassName || "text-gray-200 leading-relaxed text-base"
        }`}
        dangerouslySetInnerHTML={{ __html: activeHtml }}
      />
    </div>
  );
}
