"use client";
import { browserSupabase } from "@/lib/supabase/client";
import { getPhoto, putPhoto, restoreCloudDraft, setCloudMetadata } from "@/lib/letter/store";
import type { Draft } from "@/lib/letter/types";
import { draftSchema } from "./validation";

export function photoIds(draft: Draft) {
  return [...new Set([draft.coverPhotoId, ...Object.values(draft.photoByQuestion), ...(draft.bookPhotos ?? []).map(p => p.photoId)].filter((id): id is string => !!id))];
}
async function checkUser(userId: string) {
  const db = browserSupabase(); const { data: { user }, error } = await db.auth.getUser();
  if (error || user?.id !== userId) throw new Error("로그인이 변경되었어요. 다시 로그인해 주세요.");
  return db;
}
export async function saveBook(draft: Draft, userId: string) {
  const db = await checkUser(userId);
  const id = draft.cloudId ?? crypto.randomUUID();
  // Persist the id before uploading so retries never create duplicate books.
  setCloudMetadata(userId, draft.createdAt, { cloudId: id });
  const payload = draftSchema.parse(draft);
  const existing = await db.from("book_assets").select("object_path").eq("book_id", id);
  if (existing.error) throw new Error("저장소를 확인하지 못했어요. 다시 시도해 주세요.");
  const uploaded = new Set((existing.data ?? []).map(a => a.object_path));
  const assets: Record<string, { path: string; mime: string; size: number }> = {};
  for (const photoId of photoIds(draft)) {
    const blob = await getPhoto(photoId, userId);
    if (!blob) throw new Error("저장할 사진을 찾지 못했어요. 이 책을 열었던 기기에서 다시 저장해 주세요.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type) || blob.size > 26214400) throw new Error("사진은 25MB 이하의 JPG·PNG·WebP로 넣어 주세요.");
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))].map(n => n.toString(16).padStart(2, "0")).join("");
    const path = `${userId}/${id}/${hash}`;
    if (!uploaded.has(path)) {
      const { error } = await db.storage.from("book-photos").upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: "3600" });
      if (error && !("statusCode" in error && String(error.statusCode) === "409")) throw new Error("사진을 보관하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
      uploaded.add(path);
    }
    assets[photoId] = { path, mime: blob.type, size: blob.size };
  }
  await checkUser(userId);
  const { data: revision, error } = await db.rpc("save_my_book", { p_id: id, p_expected_revision: draft.cloudRevision ?? 0, p_draft: payload, p_assets: assets });
  if (error) {
    if (error.code === "40001") throw new Error("다른 기기에 더 최신 기록이 있어요. 보관함에서 최신 책을 다시 열어 주세요. 현재 기기의 작업은 그대로 남아 있어요.");
    throw new Error("책을 보관하지 못했어요. 잠시 후 다시 저장해 주세요.");
  }
  setCloudMetadata(userId, draft.createdAt, { cloudId: id, cloudRevision: Number(revision), cloudSavedAt: draft.updatedAt });
  return id;
}

export async function openBook(id: string, userId: string) {
  const db = await checkUser(userId);
  const { data: row, error } = await db.from("books").select("draft,revision").eq("id", id).eq("user_id", userId).single();
  if (error || !row) throw new Error("책을 열지 못했어요.");
  const draft = draftSchema.parse(row.draft) as Draft;
  const { data: assets, error: assetError } = await db.from("book_assets").select("photo_id,object_path,mime_type").eq("book_id", id);
  if (assetError) throw new Error("사진 목록을 불러오지 못했어요.");
  for (const asset of assets ?? []) {
    if (!asset.object_path.startsWith(`${userId}/${id}/`)) throw new Error("사진 경로를 확인할 수 없어요.");
    const { data, error } = await db.storage.from("book-photos").download(asset.object_path);
    if (error || !data) throw new Error("사진을 불러오지 못했어요. 다시 시도해 주세요.");
    await putPhoto(asset.photo_id, new Blob([data], { type: asset.mime_type }), userId);
  }
  await checkUser(userId);
  restoreCloudDraft(userId, { ...draft,
    cloudId: id, cloudRevision: row.revision, cloudSavedAt: draft.updatedAt,
  });
}
