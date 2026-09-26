import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Configure marked with GFM (tables, strikethrough, autolinks) and breaks enabled
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Pre-processes markdown and raw HTML commonly found in Steem posts/comments.
 */
function preprocessSteemContent(raw: string): string {
  if (!raw) return "";

  let processed = raw;

  // 1. Ensure block HTML tags have surrounding blank lines so marked parses internal markdown (images, headers, bold, etc.)
  processed = processed.replace(
    /(<(?:center|div(?:\s+[^>]*)?|blockquote(?:\s+[^>]*)?|section(?:\s+[^>]*)?|article(?:\s+[^>]*)?)>)\s*(?!\n\n)/gi,
    "$1\n\n"
  );
  processed = processed.replace(
    /(?<!\n\n)\s*(<\/(?:center|div|blockquote|section|article)>)/gi,
    "\n\n$1"
  );

  // 2. Autolink standalone image URLs if not already inside an <img> tag or ![]() markdown
  // e.g. https://images.steemit.com/... or https://cdn.steemitimages.com/...
  processed = processed.replace(
    /(^|\s)(https?:\/\/[^\s<)]+?\.(?:png|jpe?g|gif|webp))(?=\s|$)/gi,
    (match, prefix, url) => {
      // If preceded by an opening paren or bracket, let markdown handle it
      if (prefix === "(" || prefix === "[" || prefix === '="' || prefix === "='") {
        return match;
      }
      return `${prefix}![Image](${url})`;
    }
  );

  // 3. Link Steem user mentions @username (e.g. @steem-seven, @cryptogecko)
  // Ensures not preceded by / or email or already inside markdown link
  processed = processed.replace(
    /(^|[\s(])@([a-z0-9.-]{3,16})\b(?![^<]*>)/g,
    (match, prefix, username) => {
      return `${prefix}[@${username}](/@${username})`;
    }
  );

  return processed;
}

/**
 * Sanitizes and renders Steem markdown + HTML into safe, rich HTML.
 */
export function renderSteemMarkdown(raw: string): string {
  if (!raw) return "";

  const preprocessed = preprocessSteemContent(raw);

  // Convert markdown to HTML via marked
  let parsed = marked.parse(preprocessed) as string;

  // Safety fallback: convert any remaining unparsed markdown images to <img> tags
  // (e.g. if inside tight custom tags or raw HTML tables)
  parsed = parsed.replace(
    /!\[(.*?)\]\((https?:\/\/[^\s)<>"]+)\)/gi,
    '<img src="$2" alt="$1" />'
  );

  // Sanitize HTML to prevent XSS while allowing rich Steem editorial tags & classes
  const sanitized = sanitizeHtml(parsed, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "b", "em", "i", "u", "s", "strike", "del",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "center", "sub", "sup",
      "details", "summary",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "class", "title"],
      img: ["src", "alt", "title", "class", "loading", "width", "height"],
      div: ["class", "align", "style"],
      span: ["class", "style"],
      p: ["class", "align"],
      table: ["class", "border", "cellpadding", "cellspacing"],
      th: ["class", "align", "colspan", "rowspan"],
      td: ["class", "align", "colspan", "rowspan"],
      h1: ["class", "id"],
      h2: ["class", "id"],
      h3: ["class", "id"],
      h4: ["class", "id"],
      h5: ["class", "id"],
      h6: ["class", "id"],
      code: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || "";
        // External links open in new tab securely
        if (href.startsWith("http://") || href.startsWith("https://")) {
          return {
            tagName: "a",
            attribs: {
              ...attribs,
              target: "_blank",
              rel: "noopener noreferrer",
            },
          };
        }
        return { tagName: "a", attribs };
      },
      img: (tagName, attribs) => {
        return {
          tagName: "img",
          attribs: {
            ...attribs,
            loading: "lazy",
            class: `${attribs.class || ""} max-w-full rounded-xl my-3`.trim(),
          },
        };
      },
    },
  });

  return sanitized;
}

/**
 * Strips all HTML tags and markdown syntax to produce a clean plain-text excerpt for cards and snippets.
 */
export function cleanExcerpt(raw: string, maxLength: number = 180): string {
  if (!raw) return "";

  let text = raw;

  // Remove markdown images and links
  text = text.replace(/!\[.*?\]\(.*?\)/g, "");
  text = text.replace(/\[(.*?)\]\(.*?\)/g, "$1");

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // Remove markdown headers and blockquotes
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^>\s+/gm, "");

  // Remove markdown bold/italic/strikethrough markers
  text = text.replace(/[*_~`]{1,3}/g, "");

  // Remove markdown table syntax
  text = text.replace(/\|/g, " ");
  text = text.replace(/[-:]{3,}/g, " ");

  // Unescape common HTML entities
  text = text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse multiple spaces/newlines
  text = text.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}
