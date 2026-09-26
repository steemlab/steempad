import { NextResponse } from "next/server";
import { cleanExcerpt } from "@/lib/renderMarkdown";

export const maxDuration = 15;

export function cleanLeadingConjunction(sentence: string): string {
  if (!sentence) return "";
  const cleaned = sentence.replace(
    /^(?:however|furthermore|moreover|additionally|in addition|therefore|also|consequently|besides|on the other hand|meanwhile|nevertheless|nonetheless),?\s*/i,
    ""
  );
  if (!cleaned) return sentence;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function parseBullets(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•\d.]+\s+/.test(line) || (line.length > 20 && !line.startsWith("#")))
    .map((line) => line.replace(/^[-*•\d.]+\s+/, "").trim())
    .map((line) => cleanLeadingConjunction(line))
    .filter((line) => line.length > 15 && line.length < 350)
    .slice(0, 4);
}

export async function POST(req: Request) {
  try {
    const { text, title = "" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing or invalid text" }, { status: 400 });
    }

    const clean = cleanExcerpt(text, 3000);
    if (clean.length < 50) {
      return NextResponse.json({
        success: true,
        bullets: ["This post is too short for an AI summary."],
      });
    }

    const prompt = `You are an editorial assistant. Provide 3 or 4 high-density, insightful key takeaway bullet points in English (1-2 sentences each) summarizing the core ideas, proposals, and conclusions of this article.
CRITICAL RULES:
- Never start any bullet with transitional conjunctions or adverbs like "However,", "Furthermore,", "Moreover,", "Additionally,", "Therefore,", "Also,", etc.
- Each bullet point must be a direct, self-contained, and authoritative factual takeaway.
- Do not include introductory filler or conversational preamble.
- Each bullet must start with a hyphen.
Title: ${title}
Article text:
${clean}`;

    // 1. Try Google Gemini API if key is configured
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
            }),
            signal: AbortSignal.timeout(6000),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const bullets = parseBullets(rawText);
            if (bullets.length > 0) {
              return NextResponse.json({ success: true, bullets, provider: "gemini" });
            }
          }
        }
      } catch (e) {
        console.warn("Gemini summarization failed, falling back to public AI:", e);
      }
    }

    // 2. Try Pollinations Public AI Inference (zero-key, free)
    try {
      const pollUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
      const pollRes = await fetch(pollUrl, {
        signal: AbortSignal.timeout(7000),
        headers: { "User-Agent": "SteemPad/1.0" },
      });

      if (pollRes.ok) {
        const rawText = await pollRes.text();
        if (rawText && !rawText.includes("Internal Server Error")) {
          const bullets = parseBullets(rawText);
          if (bullets.length > 0) {
            return NextResponse.json({ success: true, bullets, provider: "pollinations" });
          }
        }
      }
    } catch (e) {
      console.warn("Pollinations AI failed, using algorithmic fallback:", e);
    }

    // 3. Fallback: Local Extractive Heuristic
    const allSentences = clean
      .split(/(?<=[.?!。！？])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 280);

    const scored = allSentences.map((rawSentence, idx) => {
      const sentence = cleanLeadingConjunction(rawSentence);
      let score = 0;
      if (idx > 1 && idx < allSentences.length - 1) score += 2;
      if (sentence.length >= 60 && sentence.length <= 180) score += 3;
      if (/\d+[\.\,]?\d*\s*(%|STEEM|SBD|SP|USD)/i.test(sentence)) score += 3;
      if (/\b(should|must|need|important|recommend|suggest|propose|conclude|result|because|improve|change|add|create|implement)\b/i.test(sentence)) score += 3;
      if (/^(CC:|Image source|Source:|Photo|Posted via)/i.test(sentence)) score -= 5;
      if (/^(However|Furthermore|Moreover|Therefore)/i.test(rawSentence)) score -= 2;
      return { sentence, score, idx };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, 4).map((x) => x.sentence);

    return NextResponse.json({
      success: true,
      bullets: selected.length > 0 ? selected : ["Article published directly to the Steem blockchain."],
      provider: "extractive",
    });
  } catch (error) {
    console.error("Summarize route error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
