"use client";

// Mobile-only floating "+" upload — opens the device camera, runs the same
// /api/wardrobe/process pipeline as UploadModal (bg-remove + Claude vision),
// shows a quick confirm sheet with auto-tagged fields, then saves to the
// closet. Reuses the existing wardrobe pipeline so behavior matches the
// long-form UploadModal exactly — only the UX shell differs.

import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase, authHeader } from "@/lib/supabase";
import { CATEGORIES, SEASONS, COLORS } from "@/app/wardrobe/UploadModal";

// ── Helpers (mirror UploadModal.js — kept local so this component is standalone) ──

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64, mediaType) {
  const bytes = atob(base64);
  const buf   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mediaType });
}

// Pop-up picker — opens on tap of any tag pill in the confirm sheet
function PickerSheet({ title, options, value, onSelect, onClose, multi = false, renderOption }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ fontFamily: "var(--font-inter)" }}>
      <div className="absolute inset-0 bg-[#2A3D2E]/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full sm:max-w-md bg-[#F5F1E8] rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="sticky top-0 bg-[#F5F1E8] px-6 pt-5 pb-3 border-b border-[#2A3D2E]/8 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2A3D2E] uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="text-[#2A3D2E]/55 text-sm font-semibold">Done</button>
        </div>
        <div className="px-6 py-5 flex flex-wrap gap-2">
          {options.map((opt) => {
            const id       = typeof opt === "string" ? opt : opt.id;
            const selected = multi ? value.includes(id) : value === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all cursor-pointer ${
                  selected
                    ? "bg-[#2A3D2E] border-[#2A3D2E] text-[#F5F1E8]"
                    : "border-[#2A3D2E]/15 text-[#2A3D2E]/70 bg-white"
                }`}
              >
                {renderOption ? renderOption(opt, selected) : id}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main FAB ────────────────────────────────────────────────────────────────

export default function QuickAddFab({ user, onItemAdded }) {
  // Flow state — "idle" (no overlay) → "processing" (Vision running) → "confirm" (review tags) → "saving" → "saved"
  const [stage,           setStage]           = useState("idle");
  const [preview,         setPreview]         = useState(null);     // data URL for confirm sheet
  const [processedImage,  setProcessedImage]  = useState(null);     // { base64, mediaType } from server
  const [category,        setCategory]        = useState("");
  const [color,           setColor]           = useState("");
  const [season,          setSeason]          = useState([]);
  const [aiFields,        setAiFields]        = useState({ category: false, color: false, season: false });
  const [error,           setError]           = useState("");
  const [picker,          setPicker]          = useState(null);     // "category" | "color" | "season" | null
  const [toast,           setToast]           = useState("");

  const fileInputRef = useRef(null);

  // Reset all flow state — used when "retake" is tapped or after a save completes
  const reset = useCallback(() => {
    setStage("idle");
    setPreview(null);
    setProcessedImage(null);
    setCategory("");
    setColor("");
    setSeason([]);
    setAiFields({ category: false, color: false, season: false });
    setError("");
    setPicker(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Auto-dismiss the success toast after 2s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  function openCamera() {
    setError("");
    fileInputRef.current?.click();
  }

  async function handleFile(f) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please pick an image."); return; }
    if (f.size > 12 * 1024 * 1024)    { setError("Max file size is 12 MB."); return; }

    setStage("processing");
    setPreview(URL.createObjectURL(f));

    // 1. Compress on-device (~1MB / 1600px) — same params as UploadModal
    let compressed;
    try {
      compressed = await imageCompression(f, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true });
    } catch {
      compressed = f;
    }

    let base64;
    try {
      base64 = await fileToBase64(compressed);
    } catch {
      setError("Could not read your photo — try again.");
      setStage("idle");
      return;
    }

    // 2. Server pipeline: bg-removal + Claude vision auto-tag
    let res;
    try {
      res = await fetch("/api/wardrobe/process", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body:    JSON.stringify({
          imageBase64: base64,
          mediaType:   compressed.type || "image/jpeg",
        }),
      });
    } catch {
      // Network/Vision failure → fall through with manual tagging
      setProcessedImage({ base64, mediaType: compressed.type || "image/jpeg" });
      setStage("confirm");
      return;
    }

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Daily upload limit reached. Try again tomorrow.");
      setStage("idle");
      setPreview(null);
      return;
    }

    if (!res.ok) {
      // Server failure — still let the user save manually
      setProcessedImage({ base64, mediaType: compressed.type || "image/jpeg" });
      setStage("confirm");
      return;
    }

    const data = await res.json();

    if (data.processedImage) {
      setProcessedImage(data.processedImage);
      setPreview(`data:${data.processedImage.mediaType};base64,${data.processedImage.base64}`);
    } else {
      setProcessedImage({ base64, mediaType: compressed.type || "image/jpeg" });
    }

    if (data.metadata) {
      const suggested = { category: false, color: false, season: false };
      if (data.metadata.category)        { setCategory(data.metadata.category); suggested.category = true; }
      if (data.metadata.color)           { setColor(data.metadata.color);       suggested.color    = true; }
      if (data.metadata.seasons?.length) { setSeason(data.metadata.seasons);    suggested.season   = true; }
      setAiFields(suggested);
    }

    setStage("confirm");
  }

  async function handleSave() {
    if (!processedImage) { setError("Photo missing — please retake."); return; }

    setStage("saving");
    setError("");

    const blob   = base64ToBlob(processedImage.base64, processedImage.mediaType);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext    = processedImage.mediaType === "image/png" ? "png" : "jpg";
    const path   = `${user.id}/${suffix}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("wardrobe")
      .upload(path, blob, { contentType: processedImage.mediaType, upsert: false });

    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      setStage("confirm");
      return;
    }

    const { data: savedRow, error: dbErr } = await supabase
      .from("wardrobe_items")
      .insert({ user_id: user.id, image_url: path, category, color, season, notes: "" })
      .select()
      .single();

    if (dbErr) {
      setError(`Could not save: ${dbErr.message}`);
      setStage("confirm");
      return;
    }

    setToast("Added to closet ✓");
    onItemAdded?.(savedRow);
    setStage("saved");
  }

  function toggleSeason(s) {
    setSeason((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    setAiFields((p) => ({ ...p, season: false }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const missingRequired = !category || !color;

  return (
    <>
      {/* Hidden capture input. capture="environment" hints rear camera on iOS Safari / Android Chrome;
          desktop browsers ignore it and fall back to a file picker. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Floating button — mobile only (hidden md+). z-[51] so it sits above
          the InstallPrompt banner (z-50) which also lives at the bottom of
          the screen on first-visit iOS Safari. */}
      <button
        type="button"
        aria-label="Add to closet"
        onClick={openCamera}
        className="md:hidden fixed right-5 z-[51] w-14 h-14 rounded-full bg-[#C4E552] text-[#2A3D2E] flex items-center justify-center shadow-xl shadow-[#2A3D2E]/30 active:scale-95 transition-transform"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Error toast (shown briefly if camera fails at any stage before confirm) */}
      {error && stage === "idle" && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[55] px-5 py-3 rounded-full bg-[#2A3D2E] text-[#F5F1E8] text-sm font-semibold shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 6rem)", fontFamily: "var(--font-inter)" }}
        >
          {error}
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[55] px-5 py-3 rounded-full bg-[#2A3D2E] text-[#C4E552] text-sm font-bold shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 6rem)", fontFamily: "var(--font-inter)" }}
        >
          {toast}
        </div>
      )}

      {/* Processing overlay — full screen during Vision call (2–5s typical) */}
      {stage === "processing" && (
        <div className="fixed inset-0 z-50 bg-[#2A3D2E]/85 backdrop-blur-sm flex flex-col items-center justify-center px-6" style={{ fontFamily: "var(--font-inter)" }}>
          {preview && (
            <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-[#C4E552]/40 mb-6 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="w-full h-full object-cover"/>
            </div>
          )}
          <div className="w-7 h-7 border-2 border-white/25 border-t-[#C4E552] rounded-full animate-spin mb-4"/>
          <p className="text-[#F5F1E8] text-base font-semibold">Analyzing your item…</p>
          <p className="text-[#F5F1E8]/55 text-xs mt-1.5">Detecting category, colour, and season</p>
        </div>
      )}

      {/* Confirm sheet — review auto-tags, edit if needed, save */}
      {(stage === "confirm" || stage === "saving") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ fontFamily: "var(--font-inter)" }}>
          <div className="absolute inset-0 bg-[#2A3D2E]/70 backdrop-blur-sm"/>
          <div className="relative w-full sm:max-w-md bg-[#F5F1E8] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)]">

            {/* Photo */}
            {preview && (
              <div className="aspect-square w-full bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="w-full h-full object-cover"/>
              </div>
            )}

            <div className="px-6 pt-5 pb-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
                  Confirm your item
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C4E552]/30 text-[#2A3D2E] text-[10px] font-semibold">
                  ✦ AI auto-tagged
                </span>
              </div>

              {/* Category — pill, tap to override */}
              <button
                type="button"
                onClick={() => setPicker("category")}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between cursor-pointer transition-colors ${
                  !category
                    ? "border-[#E84848]/40 bg-[#E84848]/5"
                    : "border-[#2A3D2E]/12 bg-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#2A3D2E]/45 uppercase tracking-widest w-20">Category</span>
                  <span className={`text-sm font-semibold ${category ? "text-[#2A3D2E]" : "text-[#E84848]/80"}`}>
                    {category || "Tap to set"}
                  </span>
                  {aiFields.category && category && (
                    <span className="text-[10px] text-[#C9A87C] font-semibold">✦</span>
                  )}
                </span>
                <span className="text-[#2A3D2E]/35 text-xs">Edit ›</span>
              </button>

              {/* Colour — pill, tap to override */}
              <button
                type="button"
                onClick={() => setPicker("color")}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between cursor-pointer transition-colors ${
                  !color
                    ? "border-[#E84848]/40 bg-[#E84848]/5"
                    : "border-[#2A3D2E]/12 bg-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#2A3D2E]/45 uppercase tracking-widest w-20">Colour</span>
                  {color && (
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                      style={{ background: COLORS.find((c) => c.id === color)?.hex ?? "#ccc" }}
                    />
                  )}
                  <span className={`text-sm font-semibold ${color ? "text-[#2A3D2E]" : "text-[#E84848]/80"}`}>
                    {color || "Tap to set"}
                  </span>
                  {aiFields.color && color && (
                    <span className="text-[10px] text-[#C9A87C] font-semibold">✦</span>
                  )}
                </span>
                <span className="text-[#2A3D2E]/35 text-xs">Edit ›</span>
              </button>

              {/* Seasons — multi-select pill, tap to override */}
              <button
                type="button"
                onClick={() => setPicker("season")}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#2A3D2E]/12 bg-white text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-[#2A3D2E]/45 uppercase tracking-widest w-20">Season</span>
                  <span className="text-sm font-semibold text-[#2A3D2E] truncate">
                    {season.length > 0 ? season.join(", ") : "Any"}
                  </span>
                  {aiFields.season && season.length > 0 && (
                    <span className="text-[10px] text-[#C9A87C] font-semibold">✦</span>
                  )}
                </span>
                <span className="text-[#2A3D2E]/35 text-xs">Edit ›</span>
              </button>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#E84848]/30">
                  <span className="text-sm">⚠</span>
                  <p className="text-sm text-[#2A3D2E] font-medium">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={stage === "saving" || missingRequired}
                  className="w-full py-3.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {stage === "saving" ? "Saving…" : missingRequired ? "Fill highlighted fields" : "Add to closet"}
                </button>
                <button
                  type="button"
                  onClick={() => { reset(); openCamera(); }}
                  disabled={stage === "saving"}
                  className="w-full py-3 text-[#2A3D2E]/65 font-semibold text-sm hover:text-[#2A3D2E] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Retake photo
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={stage === "saving"}
                  className="w-full py-2 text-[#2A3D2E]/40 text-xs hover:text-[#2A3D2E]/60 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add another? prompt — shown right after a successful save */}
      {stage === "saved" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ fontFamily: "var(--font-inter)" }}>
          <div className="absolute inset-0 bg-[#2A3D2E]/70 backdrop-blur-sm" onClick={reset}/>
          <div className="relative w-full sm:max-w-sm bg-[#F5F1E8] rounded-t-3xl sm:rounded-2xl shadow-2xl p-7 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
            <div className="w-12 h-12 rounded-full bg-[#C4E552]/30 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-[#2A3D2E]">
                <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#2A3D2E] mb-1.5" style={{ fontFamily: "var(--font-playfair)" }}>
              Added to your closet
            </h3>
            <p className="text-sm text-[#2A3D2E]/60 mb-6 leading-relaxed">
              Want to add another piece while the camera's warm?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { reset(); openCamera(); }}
                className="w-full py-3.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-[0.98] transition-all cursor-pointer"
              >
                Yes — take another photo
              </button>
              <button
                type="button"
                onClick={reset}
                className="w-full py-3 rounded-full border border-[#2A3D2E]/15 text-[#2A3D2E]/70 font-semibold text-sm hover:border-[#2A3D2E]/35 hover:text-[#2A3D2E] transition-colors cursor-pointer"
              >
                Done — back to dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Picker sheets — single-select for category/color, multi for season */}
      {picker === "category" && (
        <PickerSheet
          title="Category"
          options={CATEGORIES}
          value={category}
          onSelect={(c) => { setCategory(c); setAiFields((p) => ({ ...p, category: false })); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "color" && (
        <PickerSheet
          title="Primary colour"
          options={COLORS}
          value={color}
          onSelect={(c) => { setColor(c); setAiFields((p) => ({ ...p, color: false })); setPicker(null); }}
          onClose={() => setPicker(null)}
          renderOption={(opt, sel) => (
            <span className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10"
                style={{ background: opt.hex }}
              />
              {opt.id}
            </span>
          )}
        />
      )}
      {picker === "season" && (
        <PickerSheet
          title="Season"
          options={SEASONS}
          value={season}
          multi
          onSelect={toggleSeason}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
