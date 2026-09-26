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

  // 3. Autolink & embed rich media (YouTube, Vimeo, Spotify)
  // YouTube videos (watch, embed, shorts, youtu.be)
  processed = processed.replace(
    /(?:^|\n)\s*(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?)\s*(?:\n|$)/gi,
    (match, url, videoId) => {
      return `\n\n<div class="steem-media-embed aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-gray-800 my-5 bg-black"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" title="YouTube video"></iframe></div>\n\n`;
    }
  );

  // Vimeo videos
  processed = processed.replace(
    /(?:^|\n)\s*(https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]+)(?:\S*)?)\s*(?:\n|$)/gi,
    (match, url, videoId) => {
      return `\n\n<div class="steem-media-embed aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-gray-800 my-5 bg-black"><iframe src="https://player.vimeo.com/video/${videoId}" class="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="Vimeo video"></iframe></div>\n\n`;
    }
  );

  // Spotify embeds (tracks, albums, playlists, episodes)
  processed = processed.replace(
    /(?:^|\n)\s*(https?:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)(?:\S*)?)\s*(?:\n|$)/gi,
    (match, url, type, id) => {
      return `\n\n<div class="steem-media-embed w-full my-4 rounded-2xl overflow-hidden border border-gray-800 shadow-md"><iframe src="https://open.spotify.com/embed/${type}/${id}" class="w-full h-[152px] border-0" allow="encrypted-media" loading="lazy" title="Spotify embed"></iframe></div>\n\n`;
    }
  );

  // Twitter / X status embeds
  processed = processed.replace(
    /(?:^|\n)\s*(https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,25})\/status\/([0-9]+)(?:\S*)?)\s*(?:\n|$)/gi,
    (match, url, username, tweetId) => {
      return `\n\n<div class="steem-media-embed my-4 max-w-lg mx-auto rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 p-1"><iframe src="https://platform.twitter.com/embed/Tweet.html?dnt=true&id=${tweetId}" class="w-full min-h-[320px] border-0 rounded-xl" loading="lazy" title="Post on X by @${username}"></iframe></div>\n\n`;
    }
  );

  // 4. Link Steem user mentions @username (e.g. @steem-seven, @cryptogecko)
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
      "a", "img", "iframe",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "center", "sub", "sup",
      "details", "summary",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "class", "title"],
      img: ["src", "alt", "title", "class", "loading", "width", "height"],
      iframe: ["src", "class", "allow", "allowfullscreen", "loading", "width", "height", "frameborder", "title"],
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
    allowedIframeHostnames: [
      "www.youtube.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
      "open.spotify.com",
      "platform.twitter.com",
      "twitframe.com",
    ],
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

  // Remove bare media embed URLs (YouTube, Vimeo, Spotify, Twitter / X)
  text = text.replace(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|open\.spotify\.com|(?:twitter|x)\.com\/\w+\/status\/\d+)\/\S*/gi, "");
  text = text.replace(/https?:\/\/(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+/gi, "");

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
