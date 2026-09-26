"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useAuth } from "@/context/AuthContext";
import { submitPostWithSteemKeychain } from "@/lib/keychain";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bold,
  Italic,
  Heading2,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
  Send,
  Eye,
  PenLine,
  Check,
  FolderOpen,
  Trash2,
  Plus,
  Clock,
  FileText,
  X,
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
  "life",
  "india",
];

interface Draft {
  id: string;
  title: string;
  body: string;
  tagsInput: string;
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
  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize drafts from localStorage after mount (avoids hydration mismatch)
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
          setSaveStatus("saved");
          return;
        }
      }

      // If no active draft or not found, but drafts exist, load the latest
      if (parsedDrafts.length > 0) {
        const latest = parsedDrafts[0];
        setActiveDraftId(latest.id);
        setTitle(latest.title);
        setBody(latest.body);
        setTagsInput(latest.tagsInput);
        localStorage.setItem(ACTIVE_DRAFT_KEY, latest.id);
        setSaveStatus("saved");
      } else {
        // Create an initial empty draft ID
        const initialId = "draft_" + Date.now();
        setActiveDraftId(initialId);
        localStorage.setItem(ACTIVE_DRAFT_KEY, initialId);
      }
    } catch {
      // Storage unavailable or blocked
    }
  }, []);

  // Autosave to localStorage debounced
  useEffect(() => {
    if (!mounted || !activeDraftId) return;

    // If all fields are empty, don't save empty noise
    if (!title.trim() && !body.trim() && !tagsInput.trim()) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        setDrafts((prev) => {
          const now = Date.now();
          const existingIndex = prev.findIndex((d) => d.id === activeDraftId);
          const updatedDraft: Draft = {
            id: activeDraftId,
            title,
            body,
            tagsInput,
            updatedAt: now,
          };

          let next: Draft[];
          if (existingIndex >= 0) {
            next = [...prev];
            next[existingIndex] = updatedDraft;
          } else {
            next = [updatedDraft, ...prev];
          }

          // Sort most recent first
          next.sort((a, b) => b.updatedAt - a.updatedAt);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem(ACTIVE_DRAFT_KEY, activeDraftId);
          return next;
        });

        setSaveStatus("saved");
      } catch {
        setSaveStatus("idle");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, body, tagsInput, activeDraftId, mounted]);

  // Load a specific draft
  const loadDraft = (draft: Draft) => {
    setActiveDraftId(draft.id);
    setTitle(draft.title);
    setBody(draft.body);
    setTagsInput(draft.tagsInput);
    localStorage.setItem(ACTIVE_DRAFT_KEY, draft.id);
    setShowDraftsModal(false);
    setSaveStatus("saved");
  };

  // Start a new blank draft
  const handleNewDraft = () => {
    const newId = "draft_" + Date.now();
    setActiveDraftId(newId);
    setTitle("");
    setBody("");
    setTagsInput("");
    localStorage.setItem(ACTIVE_DRAFT_KEY, newId);
    setShowDraftsModal(false);
    setSaveStatus("idle");
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
  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const replacement = `${prefix}${selectedText || "text"}${suffix}`;

    const newBody =
      body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 4)
      );
    }, 50);
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
          tags
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

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto my-14 bg-gray-900 border border-gray-800 rounded-3xl p-8 sm:p-10 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-3xl mx-auto mb-5 font-bold shadow-inner">
          ✍️
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Publish on Steem</h1>
        <p className="text-gray-400 text-sm mb-7 max-w-sm mx-auto leading-relaxed">
          Log in with Steem Keychain to publish immutable posts directly to the Steem blockchain and earn curation rewards.
        </p>
        <Link
          suppressHydrationWarning
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg"
        >
          <span>Sign In with Keychain</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Writer Studio
            </h1>
            {mounted && saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium">
                <Check className="w-3 h-3" />
                <span>Saved to drafts</span>
              </span>
            )}
            {mounted && saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-full font-medium animate-pulse">
                <Clock className="w-3 h-3" />
                <span>Saving...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>Author: <strong className="text-blue-400">@{user?.username}</strong></span>
            <span>·</span>
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{readingTime} min read</span>
          </p>
        </div>

        {/* Action Controls: Drafts drawer button & Write/Preview Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Drafts Manager Button */}
          <button
            type="button"
            onClick={() => setShowDraftsModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white flex items-center gap-1.5 transition"
            title="Open saved drafts"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Drafts</span>
            {mounted && drafts.length > 0 && (
              <span className="bg-blue-600/30 text-blue-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {drafts.length}
              </span>
            )}
          </button>

          {/* New Blank Draft */}
          <button
            type="button"
            onClick={handleNewDraft}
            className="p-1.5 rounded-xl text-xs font-semibold bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition"
            title="Start new blank draft"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Edit / Preview Tabs */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                !previewMode
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                previewMode
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title Input */}
        <div>
          <input
            type="text"
            required
            placeholder="Title of your post..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl py-3.5 px-5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-lg sm:text-xl font-bold tracking-tight"
          />
        </div>

        {/* Markdown Toolbar (visible in write mode) */}
        {!previewMode && (
          <div className="flex flex-wrap items-center gap-1 bg-gray-900 border border-gray-800/80 rounded-xl p-1.5 text-gray-300">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**")}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold transition hover:text-white"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*")}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-xs italic transition hover:text-white"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("## ")}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold transition hover:text-white"
              title="Heading"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("> ")}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-xs transition hover:text-white"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n", "\n```")}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-xs font-mono transition hover:text-white"
              title="Code Block"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("[", "](https://)")}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-xs transition hover:text-white"
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("![image description](", ")")}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-xs transition hover:text-white flex items-center gap-1 text-blue-400"
              title="Insert Image URL"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[11px] font-semibold hidden sm:inline">Image</span>
            </button>
          </div>
        )}

        {/* Content Body / Preview */}
        <div>
          {previewMode ? (
            <div className="w-full min-h-[360px] bg-gray-900 border border-gray-800 rounded-2xl p-6 text-gray-200 text-base leading-relaxed prose prose-invert max-w-none">
              {body ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: body
                      .replace(/^###\s(.+)$/gm, "<h3>$1</h3>")
                      .replace(/^##\s(.+)$/gm, "<h2>$1</h2>")
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.+?)\*/g, "<em>$1</em>")
                      .replace(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g, "<img src='$1' class='rounded-xl my-4 mx-auto max-h-96 object-contain' alt='' />")
                      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, "<a href='$1' class='text-blue-400 underline' target='_blank' rel='noopener noreferrer'>$1</a>")
                      .replace(/\n\n/g, "<p class='mb-4'></p>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              ) : (
                <span className="text-gray-600 italic">No content yet. Switch to Write tab to compose.</span>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              required
              rows={14}
              placeholder="Tell your story using Markdown... You can format with bold, quotes, headings, and images. Auto-saves continuously."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-sm font-normal font-mono leading-relaxed resize-y"
            />
          )}
        </div>

        {/* Tags Section with Quick-Add Pills */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Tags (up to 5 tags, separated by space)
          </label>
          <input
            type="text"
            placeholder="steem crypto web3 technology india"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-sm"
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
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition"
              >
                +{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-gray-800/80">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Broadcasts to Steem blockchain via Steem Keychain with zero gas fees</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Publishing to Blockchain…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Publish Article</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Drafts Manager Modal */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Saved Drafts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
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
                          ? "bg-blue-600/10 border-blue-500/50"
                          : "bg-gray-800/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {d.title.trim() || "Untitled Draft"}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-bold shrink-0">
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
                        className="text-gray-500 hover:text-red-400 p-2 rounded-xl hover:bg-gray-700/50 transition shrink-0"
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
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Draft</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-xl transition"
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
