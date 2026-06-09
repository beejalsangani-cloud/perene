// Wardrobe capture pipeline for the native app. Mirrors apps/web's
// UploadModal.js: compress → POST /api/wardrobe/process (remove.bg + Claude
// vision) → upload to Supabase Storage → insert/update wardrobe_items.
//
// The canonical taxonomy lives in @perene/shared (CATEGORIES / SEASONS /
// COLOR_SWATCHES); the API validates against those exact strings. Keep the
// `seasons` → `season` mapping below in sync with the web app.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";
import { apiPost, ApiError } from "./api";

const MAX_UPLOAD_WIDTH = 1600; // gentle enough that remove.bg keeps garment detail

export interface WardrobeItem {
  id: string;
  image_url: string;
  category: string | null;
  color: string | null;
  season: string[] | null;
  notes: string | null;
  created_at?: string;
  signedUrl?: string | null;
}

export interface CompressedImage {
  base64: string;
  mediaType: string;
}

export interface ProcessMetadata {
  category: string | null;
  color: string | null;
  seasons: string[];
}

interface ProcessResponse {
  processedImage: { base64: string; mediaType: string };
  metadata: ProcessMetadata;
  bgRemoved: boolean;
  warnings: string[];
}

export type ProcessResult =
  | { ok: true; processedImage: CompressedImage; metadata: ProcessMetadata; bgRemoved: boolean; warnings: string[] }
  | { ok: false; dailyLimit: true; message: string }
  | { ok: false; dailyLimit: false; message: string };

// ── Compression ──────────────────────────────────────────────────────────────
// Resize to <=1600px wide (only downscale — never upscale a small photo) and
// re-encode as JPEG. Returns base64 ready for the process API.
export async function compressForUpload(
  uri: string,
  sourceWidth?: number
): Promise<CompressedImage> {
  let context = ImageManipulator.manipulate(uri);
  if (!sourceWidth || sourceWidth > MAX_UPLOAD_WIDTH) {
    context = context.resize({ width: MAX_UPLOAD_WIDTH });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return { base64: result.base64 ?? "", mediaType: "image/jpeg" };
}

// ── Server pipeline ──────────────────────────────────────────────────────────
// Calls /api/wardrobe/process. Never throws — the 429 daily-limit and network
// failures come back as { ok: false } so the confirm screen can react (block on
// daily-limit, fall back to the original photo otherwise).
export async function processImage(
  image: CompressedImage
): Promise<ProcessResult> {
  try {
    const data = await apiPost<ProcessResponse>("/api/wardrobe/process", {
      imageBase64: image.base64,
      mediaType: image.mediaType,
    });
    return {
      ok: true,
      processedImage: data.processedImage,
      metadata: data.metadata ?? { category: null, color: null, seasons: [] },
      bgRemoved: !!data.bgRemoved,
      warnings: data.warnings ?? [],
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      const body = err.body as { message?: string } | null;
      return {
        ok: false,
        dailyLimit: true,
        message:
          body?.message ??
          "You've hit today's upload limit. Try again tomorrow.",
      };
    }
    return {
      ok: false,
      dailyLimit: false,
      message:
        err instanceof Error
          ? err.message
          : "Could not process your photo — you can still save it as-is.",
    };
  }
}

// ── base64 → bytes ───────────────────────────────────────────────────────────
// Hermes (RN 0.81) exposes a global atob; guard with a clear error otherwise so
// a missing polyfill doesn't surface as a confusing upload failure.
function base64ToBytes(base64: string): Uint8Array {
  const decode = (globalThis as { atob?: (s: string) => string }).atob;
  if (!decode) throw new Error("base64 decoder (atob) unavailable in this runtime");
  const binary = decode(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Save (create or metadata edit) ───────────────────────────────────────────
export interface SaveInput {
  userId: string;
  // Image bytes to upload; null on edit when the photo is unchanged.
  image: CompressedImage | null;
  category: string;
  color: string;
  season: string[];
  notes: string;
  editItem?: WardrobeItem | null;
}

export async function saveWardrobeItem(input: SaveInput): Promise<WardrobeItem> {
  let imagePath = input.editItem?.image_url ?? null;

  if (input.image) {
    const bytes = base64ToBytes(input.image.base64);
    const ext = input.image.mediaType === "image/png" ? "png" : "jpg";
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    imagePath = `${input.userId}/${suffix}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("wardrobe")
      .upload(imagePath, bytes, {
        contentType: input.image.mediaType,
        upsert: false,
      });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    // Replace the old photo on edit only after the new one lands.
    if (input.editItem?.image_url) {
      await supabase.storage.from("wardrobe").remove([input.editItem.image_url]);
    }
  }

  const payload = {
    image_url: imagePath,
    category: input.category || null,
    color: input.color || null,
    season: input.season,
    notes: input.notes || null,
  };

  if (input.editItem) {
    const { data, error } = await supabase
      .from("wardrobe_items")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", input.editItem.id)
      .select()
      .single();
    if (error) throw new Error(`Could not save: ${error.message}`);
    return data as WardrobeItem;
  }

  const { data, error } = await supabase
    .from("wardrobe_items")
    .insert({ user_id: input.userId, ...payload })
    .select()
    .single();
  if (error) throw new Error(`Could not save: ${error.message}`);
  return data as WardrobeItem;
}

// ── Delete ───────────────────────────────────────────────────────────────────
export async function deleteWardrobeItem(item: WardrobeItem): Promise<void> {
  if (item.image_url) {
    await supabase.storage.from("wardrobe").remove([item.image_url]);
  }
  const { error } = await supabase
    .from("wardrobe_items")
    .delete()
    .eq("id", item.id);
  if (error) throw new Error(`Could not delete: ${error.message}`);
}
