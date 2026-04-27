"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";

export const CATEGORIES = ["Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessory", "Bag", "Other"];
export const SEASONS    = ["Spring", "Summer", "Fall", "Winter", "All-season"];
export const COLORS = [
  { id: "Black",   hex: "#1A1A1A" },
  { id: "White",   hex: "#F0EEEA" },
  { id: "Cream",   hex: "#F5F1E8" },
  { id: "Beige",   hex: "#D4C5A9" },
  { id: "Brown",   hex: "#8B6B3D" },
  { id: "Gray",    hex: "#9CA3AF" },
  { id: "Navy",    hex: "#1E3A5F" },
  { id: "Forest",  hex: "#2A3D2E" },
  { id: "Pastels", hex: "#F4B8D0" },
  { id: "Bold",    hex: "#E84848" },
  { id: "Other",   hex: "#C8C0B0" },
];

// Small "AI detected" pill shown next to section labels
function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C4E552]/30 text-[#2A3D2E] text-[10px] font-semibold">
      ✦ AI
    </span>
  );
}

export default function UploadModal({ isOpen, onClose, onSaved, user, editItem = null }) {
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [category,    setCategory]    = useState("");
  const [color,       setColor]       = useState("");
  const [season,      setSeason]      = useState([]);
  const [notes,       setNotes]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [analyzing,   setAnalyzing]   = useState(false);
  // tracks which fields were last filled by AI (cleared on manual interaction)
  const [aiFields,    setAiFields]    = useState({ category: false, color: false, season: false });
  const fileInputRef = useRef(null);

  // Seed form when switching between create / edit
  useEffect(() => {
    if (editItem) {
      setPreview(editItem.signedUrl ?? null);
      setCategory(editItem.category ?? "");
      setColor(editItem.color ?? "");
      setSeason(editItem.season ?? []);
      setNotes(editItem.notes ?? "");
    } else {
      setFile(null);
      setPreview(null);
      setCategory("");
      setColor("");
      setSeason([]);
      setNotes("");
    }
    setError("");
    setSaving(false);
    setAnalyzing(false);
    setAiFields({ category: false, color: false, season: false });
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  // ── AI analysis ───────────────────────────────────────────────────────────
  async function analyzeImage(f) {
    setAnalyzing(true);
    try {
      // Compress to a small size just for analysis (keeps payload small)
      let small;
      try {
        small = await imageCompression(f, { maxSizeMB: 0.3, maxWidthOrHeight: 512, useWebWorker: true });
      } catch {
        small = f;
      }

      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(small);
      });

      const res = await fetch("/api/wardrobe/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: small.type || "image/jpeg" }),
      });

      if (!res.ok) throw new Error("Analysis request failed");

      const { category: detCat, color: detColor, seasons: detSeasons } = await res.json();

      const suggested = { category: false, color: false, season: false };

      if (detCat) {
        setCategory(detCat);
        suggested.category = true;
      }
      if (detColor) {
        setColor(detColor);
        suggested.color = true;
      }
      if (detSeasons?.length) {
        setSeason(detSeasons);
        suggested.season = true;
      }

      setAiFields(suggested);
    } catch (err) {
      console.error("[UploadModal] analyze error:", err);
      // Fail silently — user fills fields manually
    } finally {
      setAnalyzing(false);
    }
  }

  // ── File helpers ──────────────────────────────────────────────────────────
  function pickFile(f) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError("Max file size is 5 MB."); return; }
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
    // Reset manual fields + kick off AI analysis
    setCategory("");
    setColor("");
    setSeason([]);
    setAiFields({ category: false, color: false, season: false });
    analyzeImage(f);
  }

  function toggleSeason(s) {
    setSeason((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    setAiFields((prev) => ({ ...prev, season: false }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!editItem && !file) { setError("Please select an image first."); return; }

    setSaving(true);
    setError("");

    let imagePath = editItem?.image_url ?? null;

    if (file) {
      let compressed;
      try {
        compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch {
        compressed = file;
      }

      const ext    = (compressed.type || "image/jpeg").split("/")[1] || "jpg";
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      imagePath    = `${user.id}/${suffix}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("wardrobe")
        .upload(imagePath, compressed, { contentType: compressed.type, upsert: false });

      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        setSaving(false);
        return;
      }

      if (editItem?.image_url) {
        await supabase.storage.from("wardrobe").remove([editItem.image_url]);
      }
    }

    const payload = { image_url: imagePath, category, color, season, notes };
    let savedRow, dbErr;

    if (editItem) {
      const { data, error } = await supabase
        .from("wardrobe_items")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editItem.id)
        .select()
        .single();
      savedRow = data; dbErr = error;
    } else {
      const { data, error } = await supabase
        .from("wardrobe_items")
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      savedRow = data; dbErr = error;
    }

    setSaving(false);
    if (dbErr) { setError(`Could not save: ${dbErr.message}`); return; }

    onSaved(savedRow);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#2A3D2E]/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div className="relative w-full sm:max-w-lg bg-[#F5F1E8] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 bg-[#F5F1E8] border-b border-[#2A3D2E]/8">
          <h2 className="text-xl font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
            {editItem ? "Edit item" : "Add new item"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2A3D2E]/8 flex items-center justify-center text-[#2A3D2E]/60 hover:bg-[#2A3D2E]/15 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-6">
          {/* ── Image upload / preview ─────────────────────────────────── */}
          {preview ? (
            <div className="relative">
              <div className="aspect-square w-full max-h-60 rounded-2xl overflow-hidden border border-[#2A3D2E]/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              </div>
              {/* Analyzing overlay */}
              {analyzing && (
                <div className="absolute inset-0 rounded-2xl bg-[#2A3D2E]/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-[#C4E552] rounded-full animate-spin" />
                  <p className="text-white text-xs font-semibold">Detecting details…</p>
                </div>
              )}
              {!analyzing && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setAiFields({ category: false, color: false, season: false });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 px-3 py-1 rounded-full bg-white/90 text-[#2A3D2E] text-xs font-semibold shadow-sm hover:bg-white transition-colors cursor-pointer"
                >
                  Replace
                </button>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                dragging
                  ? "border-[#C4E552] bg-[#C4E552]/10"
                  : "border-[#2A3D2E]/20 hover:border-[#2A3D2E]/40 hover:bg-white/50"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#2A3D2E]/8 flex items-center justify-center text-[#2A3D2E]/50">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#2A3D2E]">Drop photo here</p>
                <p className="text-xs text-[#2A3D2E]/45 mt-0.5">or click to browse · max 5 MB</p>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])} />

          {/* ── Category ──────────────────────────────────────────────── */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#2A3D2E]/55 uppercase tracking-widest mb-2">
              Category
              {aiFields.category && <AiBadge />}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button"
                  onClick={() => { setCategory(c); setAiFields((p) => ({ ...p, category: false })); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    category === c
                      ? "bg-[#2A3D2E] border-[#2A3D2E] text-[#F5F1E8]"
                      : "border-[#2A3D2E]/15 text-[#2A3D2E]/65 hover:border-[#2A3D2E]/35"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* ── Primary colour ────────────────────────────────────────── */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#2A3D2E]/55 uppercase tracking-widest mb-2">
              Primary colour
              {aiFields.color && <AiBadge />}
            </label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {COLORS.map(({ id, hex }) => (
                <button key={id} type="button" title={id}
                  onClick={() => { setColor(id); setAiFields((p) => ({ ...p, color: false })); }}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex-shrink-0 ${
                    color === id
                      ? "border-[#2A3D2E] scale-110 shadow-sm"
                      : "border-transparent hover:border-[#2A3D2E]/30"
                  }`}
                  style={{ background: hex }}
                />
              ))}
            </div>
            {color && (
              <p className="mt-1.5 text-xs text-[#2A3D2E]/50">
                Selected: <span className="font-medium text-[#2A3D2E]/80">{color}</span>
              </p>
            )}
          </div>

          {/* ── Season ────────────────────────────────────────────────── */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#2A3D2E]/55 uppercase tracking-widest mb-2">
              Season
              <span className="normal-case tracking-normal font-normal text-[#2A3D2E]/35">(select all that apply)</span>
              {aiFields.season && <AiBadge />}
            </label>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <button key={s} type="button" onClick={() => toggleSeason(s)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    season.includes(s)
                      ? "bg-[#C4E552] border-[#C4E552] text-[#2A3D2E]"
                      : "border-[#2A3D2E]/15 text-[#2A3D2E]/65 hover:border-[#2A3D2E]/35"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Notes ─────────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-[#2A3D2E]/55 uppercase tracking-widest mb-2">
              Notes <span className="normal-case tracking-normal font-normal text-[#2A3D2E]/35">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Runs small, dry clean only…"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/12 bg-white text-[#2A3D2E] placeholder-[#2A3D2E]/30 text-sm outline-none focus:border-[#C4E552] resize-none transition-colors"
            />
          </div>

          {/* ── Error + submit ─────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#2A3D2E]/12">
              <span className="text-sm">⚠</span>
              <p className="text-sm text-[#2A3D2E] font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pb-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-[#2A3D2E]/15 text-[#2A3D2E]/65 text-sm font-semibold hover:border-[#2A3D2E]/30 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving || analyzing}
              className="flex-1 py-3 rounded-xl bg-[#C4E552] text-[#2A3D2E] text-sm font-bold hover:bg-[#d4f562] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving…" : analyzing ? "Detecting…" : editItem ? "Save changes" : "Add to closet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
