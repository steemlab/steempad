"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { submitPostWithSteemKeychain, PostRewardOption } from "@/lib/keychain";
import { renderSteemMarkdown } from "@/lib/renderMarkdown";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
  Send,
  Eye,
  PenLine,
  Columns,
  Check,
  FolderOpen,
  Trash2,
  Plus,
  Clock,
  FileText,
  X,
  AlignCenter,
  Table as TableIcon,
  Minus,
  Coins,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const POPULAR_TAGS = [
  "steem",
  "crypto",
  "web3",
  "technology",
  "finance",
  "writing",
  "art",
  "photography",
  "food",
  "travel",
  "life",
  "india",
  "korea",
];

interface Draft {
  id: string;
  title: string;
  body: string;
  tagsInput: string;
  rewardOption: PostRewardOption;
  updatedAt: number;
}

const STORAGE_KEY = "steempad_drafts_v1";
const ACTIVE_DRAFT_KEY = "steempad_active_draft_id";

export default function SubmitPostPage() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, startTransition] = useTransition();

  const [activeDraftId, setActiveDraftId] = useState<string>("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [rewardOption, setRewardOption] = useState<PostRewardOption>("50");
  
  // View mode: 'write' | 'split' | 'preview'
  const [viewMode, setViewMode] = useState<"write" | "split" | "preview">("write");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageAltInput, setImageAltInput] = useState("");
  const [mounted, setMounted] = useState(false);

  // Initialize drafts from localStorage after mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsedDrafts: Draft[] = stored ? JSON.parse(stored) : [];
      setDrafts(parsedDrafts);

      const savedActiveId = localStorage.getItem(ACTIVE_DRAFT_KEY);
      if (savedActiveId) {
        const found = parsedDrafts.find((d) => d.id === savedActiveId);
        if (found) {
          setActiveDraftId(found.id);
          setTitle(found.title);
          setBody(found.body);
          setTagsInput(found.tagsInput);
          setRewardOption(found.rewardOption || "50");
          setSaveStatus("saved");
          setLastSavedTime(
            new Date(found.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
          return;
        }
      }

      if (parsedDrafts.length > 0) {
        const latest = parsedDrafts[0];
        setActiveDraftId(latest.id);
        setTitle(latest.title);
        setBody(latest.body);
        setTagsInput(latest.tagsInput);
        setRewardOption(latest.rewardOption || "50");
        localStorage.setItem(ACTIVE_DRAFT_KEY, latest.id);
        setSaveStatus("saved");
        setLastSavedTime(
          new Date(latest.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      } else {
        const initialId = "draft_" + Date.now();
        setActiveDraftId(initialId);
        localStorage.setItem(ACTIVE_DRAFT_KEY, initialId);
      }
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, []);

  // Autosave to localStorage debounced
  useEffect(() => {
    if (!mounted || !activeDraftId) return;

    if (!title.trim() && !body.trim() && !tagsInput.trim()) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        const now = Date.now();
        const updatedDraft: Draft = {
          id: activeDraftId,
          title,
          body,
          tagsInput,
          rewardOption,
          updatedAt: now,
        };

        setDrafts((prev) => {
          const existingIndex = prev.findIndex((d) => d.id === activeDraftId);
          let next: Draft[];
          if (existingIndex >= 0) {
            next = [...prev];
            next[existingIndex] = updatedDraft;
          } else {
            next = [updatedDraft, ...prev];
          }
          next.sort((a, b) => b.updatedAt - a.updatedAt);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem(ACTIVE_DRAFT_KEY, activeDraftId);
          return next;
        });

        setSaveStatus("saved");
        setLastSavedTime(
          new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      } catch {
        setSaveStatus("idle");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, body, tagsInput, rewardOption, activeDraftId, mounted]);

  // Warn before closing tab if there are unsaved/unpublished changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (title.trim() || body.trim()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [title, body]);

  // Load a draft
  const loadDraft = (draft: Draft) => {
    setActiveDraftId(draft.id);
    setTitle(draft.title);
    setBody(draft.body);
    setTagsInput(draft.tagsInput);
    setRewardOption(draft.rewardOption || "50");
    localStorage.setItem(ACTIVE_DRAFT_KEY, draft.id);
    setShowDraftsModal(false);
    setSaveStatus("saved");
    setLastSavedTime(
      new Date(draft.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Start new blank draft
  const handleNewDraft = () => {
    const newId = "draft_" + Date.now();
    setActiveDraftId(newId);
    setTitle("");
    setBody("");
    setTagsInput("");
    setRewardOption("50");
    localStorage.setItem(ACTIVE_DRAFT_KEY, newId);
    setShowDraftsModal(false);
    setSaveStatus("idle");
    setLastSavedTime("");
    textareaRef.current?.focus();
  };

  // Delete a draft
  const handleDeleteDraft = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const filtered = drafts.filter((d) => d.id !== id);
      setDrafts(filtered);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      if (id === activeDraftId) {
        if (filtered.length > 0) {
          loadDraft(filtered[0]);
        } else {
          handleNewDraft();
        }
      }
    } catch {
      // ignore
    }
  };

  // Helper to insert markdown formatting at cursor position
  const insertFormatting = (prefix: string, suffix = "", defaultText = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const textToInsert = selectedText || defaultText;
    const replacement = `${prefix}${textToInsert}${suffix}`;

    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + textToInsert.length
      );
    }, 50);
  };

  const handleInsertImageModal = () => {
    if (!imageUrlInput.trim()) return;
    const alt = imageAltInput.trim() || "image";
    insertFormatting(`![${alt}](`, `${imageUrlInput.trim()})`, "");
    setImageUrlInput("");
    setImageAltInput("");
    setShowImageModal(false);
  };

  const handleAddTag = (tag: string) => {
    const existing = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (!existing.includes(tag) && existing.length < 5) {
      setTagsInput([...existing, tag].join(" "));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !user) {
      setError("Please sign in with Steem Keychain to publish a post.");
      return;
    }

    if (!title.trim() || !body.trim()) {
      setError("Please provide both a title and post content.");
      return;
    }

    const tags = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter((t) => t.length > 0)
      .slice(0, 5);

    if (tags.length === 0) {
      tags.push("general");
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (user.authMethod === "keychain") {
        const res = await submitPostWithSteemKeychain(
          user.username,
          title.trim(),
          body.trim(),
          tags,
          "",
          "",
          rewardOption
        );

        if (res.success) {
          // Clean up published draft from localStorage
          try {
            const filtered = drafts.filter((d) => d.id !== activeDraftId);
            setDrafts(filtered);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            localStorage.removeItem(ACTIVE_DRAFT_KEY);
          } catch {
            // ignore
          }

          startTransition(() => {
            router.push(`/@${user.username}`);
            router.refresh();
          });
        } else {
          setError(res.message || res.error || "Post was rejected in Keychain.");
        }
      } else {
        setError(
          "Posting with direct private key is not enabled. Please log in with Steem Keychain."
        );
      }
    } catch {
      setError("Failed to broadcast transaction to Steem blockchain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const wordCount = useMemo(() => {
    return body.trim() ? body.trim().split(/\s+/).length : 0;
  }, [body]);

  const charCount = body.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Render full markdown preview using the actual renderer engine
  const renderedPreviewHtml = useMemo(() => {
    return renderSteemMarkdown(body);
  }, [body]);

  const parsedTags = useMemo(() => {
    return tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
      .slice(0, 5);
  }, [tagsInput]);

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto my-14 bg-gray-900 border border-gray-800 rounded-3xl p-8 sm:p-10 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-3xl mx-auto mb-5 font-bold shadow-inner">
          ✍️
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Publish on Steem</h1>
        <p className="text-gray-400 text-sm mb-7 max-w-sm mx-auto leading-relaxed">
          Log in with Steem Keychain to publish immutable posts directly to the Steem blockchain and earn curation rewards.
        </p>
        <Link
          suppressHydrationWarning
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-2xl text-sm transition shadow-lg active:scale-95"
        >
          <span>Sign In with Keychain</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`mx-auto space-y-6 ${viewMode === "split" ? "max-w-7xl" : "max-w-4xl"}`}>
      {/* Top Header & Autosave Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Studio
            </h1>
            {mounted && saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-medium shadow-xs">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : "locally"}</span>
              </span>
            )}
            {mounted && saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-0.5 rounded-full font-medium animate-pulse">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Auto-saving…</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Author: <strong className="text-cyan-400">@{user?.username}</strong></span>
            <span>·</span>
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{charCount} chars</span>
            <span>·</span>
            <span>{readingTime} min read</span>
          </p>
        </div>

        {/* View Mode Controls & Drafts Drawer Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Drafts Manager */}
          <button
            type="button"
            onClick={() => setShowDraftsModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            title="Open saved drafts"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Drafts</span>
            {mounted && drafts.length > 0 && (
              <span className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {drafts.length}
              </span>
            )}
          </button>

          {/* New Blank Draft */}
          <button
            type="button"
            onClick={handleNewDraft}
            className="p-2 rounded-xl text-xs font-semibold bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition cursor-pointer"
            title="Start new blank draft"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* 3-Way Mode Switch: Write | Split | Preview */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("write")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "write"
                  ? "bg-cyan-500 text-black shadow-xs font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Full width editor"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`hidden md:flex px-3 py-1 rounded-lg text-xs font-semibold items-center gap-1.5 transition cursor-pointer ${
                viewMode === "split"
                  ? "bg-cyan-500 text-black shadow-xs font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Live side-by-side markdown preview"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "preview"
                  ? "bg-cyan-500 text-black shadow-xs font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Full width article preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
        <div>
          <input
            type="text"
            required
            placeholder="Title of your story..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl py-3.5 px-5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition text-lg sm:text-2xl font-extrabold tracking-tight"
          />
        </div>

        {/* Markdown Toolbar (visible in write and split modes) */}
        {viewMode !== "preview" && (
          <div className="flex flex-wrap items-center gap-1 bg-gray-900/90 border border-gray-800 rounded-2xl p-2 text-gray-300 shadow-xs">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**", "bold text")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs font-bold transition hover:text-white cursor-pointer"
              title="Bold (**text**)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*", "italic text")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs italic transition hover:text-white cursor-pointer"
              title="Italic (*text*)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("## ", "", "Heading 2")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs font-bold transition hover:text-white cursor-pointer"
              title="Heading 2 (##)"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("### ", "", "Heading 3")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs font-bold transition hover:text-white cursor-pointer"
              title="Heading 3 (###)"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-gray-800 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting("> ", "", "Quote text")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs transition hover:text-white cursor-pointer"
              title="Blockquote (>)"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n", "\n```", "code block")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs font-mono transition hover:text-white cursor-pointer"
              title="Code Block"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("<center>\n\n", "\n\n</center>", "Centered text or image")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs transition hover:text-white cursor-pointer"
              title="Center Content (<center>)"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n", "", "")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs transition hover:text-white cursor-pointer"
              title="Insert Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n***\n", "", "")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs transition hover:text-white cursor-pointer"
              title="Horizontal Divider (***)"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-gray-800 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting("[", "](https://)", "link text")}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs transition hover:text-white cursor-pointer"
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="p-2 hover:bg-gray-800 rounded-xl text-xs transition hover:text-white flex items-center gap-1.5 text-cyan-400 cursor-pointer"
              title="Insert Image"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[11px] font-bold hidden sm:inline">Image</span>
            </button>
          </div>
        )}

        {/* Content Body Editor / Split / Preview */}
        {viewMode === "write" && (
          <div>
            <textarea
              ref={textareaRef}
              required
              rows={16}
              placeholder="Tell your story using Markdown... Support headings, bold, images, tables, quotes, and centered captions. Auto-saves continuously."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-5 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition text-sm font-normal font-mono leading-relaxed resize-y shadow-inner"
            />
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Editor Pane */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500 px-1">
                Markdown Source
              </span>
              <textarea
                ref={textareaRef}
                required
                rows={22}
                placeholder="Markdown text..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-5 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition text-sm font-normal font-mono leading-relaxed resize-y h-[550px] shadow-inner"
              />
            </div>

            {/* Live Rendered Pane */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 px-1 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>Live SteemPad Preview</span>
              </span>
              <div className="w-full h-[550px] overflow-y-auto bg-gray-950 border border-gray-800 rounded-2xl p-6 text-gray-200 text-sm shadow-inner">
                {title && (
                  <h1 className="text-xl font-extrabold text-white mb-4 pb-2 border-b border-gray-800">
                    {title}
                  </h1>
                )}
                {body.trim() ? (
                  <div
                    className="steem-content break-words leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
                  />
                ) : (
                  <span className="text-gray-600 italic">Live preview will render here as you write…</span>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === "preview" && (
          <div className="w-full bg-gray-950 border border-gray-800 rounded-3xl p-6 sm:p-10 text-gray-200 shadow-xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
                  {parsedTags[0] ? `#${parsedTags[0]}` : "#general"}
                </span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-500">{readingTime} min read</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {title || "Untitled Article"}
              </h1>
              <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-gray-800/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://steemitimages.com/u/${user?.username}/avatar/small`}
                  alt={user?.username}
                  className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700/60"
                />
                <span className="text-xs font-bold text-gray-200">@{user?.username}</span>
                <span className="text-xs text-gray-500">· Draft preview</span>
              </div>
            </div>

            {body.trim() ? (
              <div
                className="steem-content text-base leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
              />
            ) : (
              <div className="text-center py-12 text-gray-600 italic">
                No story content yet. Switch to Write tab to compose.
              </div>
            )}
          </div>
        )}

        {/* Tags Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Tags (up to 5 tags, separated by space)
          </label>
          <input
            type="text"
            placeholder="steem crypto web3 technology writing"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition text-sm"
          />

          {/* Quick-Add Popular Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-gray-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Suggested:</span>
            </span>
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition cursor-pointer"
              >
                +{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Reward Option Selector */}
        <div className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800/80 space-y-3">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Reward Distribution</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRewardOption("50")}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rewardOption === "50"
                  ? "bg-cyan-950/50 border-cyan-500/50 text-white"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              <div className="text-xs font-bold">50% SBD / 50% SP</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Standard default reward split</div>
            </button>
            <button
              type="button"
              onClick={() => setRewardOption("100")}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rewardOption === "100"
                  ? "bg-cyan-950/50 border-cyan-500/50 text-white"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              <div className="text-xs font-bold text-cyan-300">100% Power Up</div>
              <div className="text-[10px] text-gray-500 mt-0.5">All rewards paid in Steem Power</div>
            </button>
            <button
              type="button"
              onClick={() => setRewardOption("0")}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rewardOption === "0"
                  ? "bg-cyan-950/50 border-cyan-500/50 text-white"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              <div className="text-xs font-bold text-gray-300">Decline Payout</div>
              <div className="text-[10px] text-gray-500 mt-0.5">0% rewards accepted</div>
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-800/80">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Broadcasts to Steem blockchain via Steem Keychain with zero gas fees</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black font-extrabold rounded-2xl transition text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Broadcasting to Blockchain…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Publish Story</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Image Insertion Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Insert Image</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Image Direct URL (https://...)
                </label>
                <input
                  type="url"
                  placeholder="https://cdn.steemitimages.com/..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs sm:text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Alt Caption (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Descriptive caption"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs sm:text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertImageModal}
                disabled={!imageUrlInput.trim()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drafts Drawer / Modal */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Saved Drafts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No saved drafts yet. Type something to auto-save!
                </div>
              ) : (
                drafts.map((d) => {
                  const isActive = d.id === activeDraftId;
                  const dWords = d.body.trim() ? d.body.trim().split(/\s+/).length : 0;
                  const dateStr = new Date(d.updatedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={d.id}
                      onClick={() => loadDraft(d)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-cyan-950/40 border-cyan-500/50"
                          : "bg-gray-800/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {d.title.trim() || "Untitled Draft"}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] bg-cyan-500 text-black px-1.5 py-0.2 rounded-full font-bold shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {d.body.slice(0, 80) || "No content"}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                          <span>{dWords} words</span>
                          <span>·</span>
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteDraft(e, d.id)}
                        className="text-gray-500 hover:text-red-400 p-2 rounded-xl hover:bg-gray-700/50 transition shrink-0 cursor-pointer"
                        title="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={handleNewDraft}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 py-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Draft</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
