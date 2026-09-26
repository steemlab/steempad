import { NextResponse } from "next/server";

interface LangRule {
  code: string;
  name: string;
  test: (text: string) => boolean;
}

const LANGUAGE_RULES: LangRule[] = [
  {
    code: "ko",
    name: "Korean",
    test: (t) => (t.match(/[\uAC00-\uD7AF]/g)?.length || 0) > 10,
  },
  {
    code: "zh",
    name: "Chinese",
    test: (t) => (t.match(/[\u4E00-\u9FFF]/g)?.length || 0) > 20,
  },
  {
    code: "ja",
    name: "Japanese",
    test: (t) => (t.match(/[\u3040-\u309F\u30A0-\u30FF]/g)?.length || 0) > 10,
  },
  {
    code: "ru",
    name: "Russian",
    test: (t) => (t.match(/[\u0400-\u04FF]/g)?.length || 0) > 15,
  },
  {
    code: "ar",
    name: "Arabic",
    test: (t) => (t.match(/[\u0600-\u06FF]/g)?.length || 0) > 15,
  },
  {
    code: "bn",
    name: "Bengali",
    test: (t) => (t.match(/[\u0980-\u09FF]/g)?.length || 0) > 10,
  },
  {
    code: "hi",
    name: "Hindi",
    test: (t) => (t.match(/[\u0900-\u097F]/g)?.length || 0) > 10,
  },
  {
    code: "es",
    name: "Spanish",
    test: (t) =>
      /\b(el|la|los|las|de|en|un|una|que|por|con|para|este|esta|como)\b/i.test(t) &&
      (t.match(/\b(el|la|de|en|que|por|con|para)\b/gi)?.length || 0) >= 4,
  },
  {
    code: "id",
    name: "Indonesian",
    test: (t) =>
      /\b(dan|yang|untuk|dengan|dari|ini|itu|tidak|ada|di|ke|pada|kami|saya)\b/i.test(t) &&
      (t.match(/\b(dan|yang|untuk|dengan|dari|ini|itu|tidak|ada|di|ke)\b/gi)?.length || 0) >= 4,
  },
];

function detectLanguage(text: string): { code: string; name: string } | null {
  for (const rule of LANGUAGE_RULES) {
    if (rule.test(text)) {
      return { code: rule.code, name: rule.name };
    }
  }
  return null;
}

async function translateChunk(chunk: string, sourceLang: string, targetLang = "en"): Promise<string> {
  const trimmed = chunk.trim();
  if (!trimmed) return chunk;

  // Don't translate code blocks or pure image/links
  if (trimmed.startsWith("```") || trimmed.startsWith("![") || /^https?:\/\/\S+$/.test(trimmed)) {
    return chunk;
  }

  // Trim to 450 chars max per request for MyMemory limits
  const safeText = trimmed.length > 450 ? trimmed.slice(0, 450) : trimmed;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      safeText
    )}&langpair=${sourceLang}|${targetLang}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "SteemPad/1.0" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !translated.startsWith("MYMEMORY WARNING")) {
        return translated;
      }
    }
  } catch {
    // If MyMemory fails, return the chunk as is
  }

  return chunk;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, sourceLang: requestedSrc, targetLang = "en" } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing or invalid text" }, { status: 400 });
    }

    const detected = detectLanguage(text);
    const sourceCode = requestedSrc || detected?.code || "autodetect";
    const languageName = detected?.name || "Foreign Language";

    if (sourceCode === "en" || (!detected && !requestedSrc)) {
      return NextResponse.json({
        translatedText: text,
        sourceLang: "en",
        languageName: "English",
        isAlreadyEnglish: true,
      });
    }

    // Split text into paragraphs to maintain markdown formatting
    const paragraphs = text.split(/\n\n+/);
    const translatedParagraphs: string[] = [];

    // Process in batches of 4 to be respectful of rate limits
    for (let i = 0; i < paragraphs.length; i += 4) {
      const batch = paragraphs.slice(i, i + 4);
      const batchResults = await Promise.all(
        batch.map((p) => translateChunk(p, sourceCode, targetLang))
      );
      translatedParagraphs.push(...batchResults);
    }

    const result = translatedParagraphs.join("\n\n");

    return NextResponse.json({
      success: true,
      translatedText: result,
      sourceLang: sourceCode,
      languageName,
    });
  } catch (error) {
    console.error("Translation route error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
