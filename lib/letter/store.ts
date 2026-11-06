"use client";

// 회원별 로컬 작업 캐시. 로그인한 계정의 원고는 Supabase에도 보관한다.
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Draft } from "./types";

let accountUserId: string | null = null;
const draftKey = () => accountUserId ? `omoi:draft:${accountUserId}` : "omoi:draft";
const historyKey = () => accountUserId ? `omoi:history:${accountUserId}` : "omoi:history";
const photoKey = (id: string, owner: string | null) => owner ? `member:${owner}:${id}` : id;
const EVENT = "omoi-draft";

/* ---------------- 원고 (localStorage) ---------------- */

let cachedRaw: string | null | undefined;
let cachedDraft: Draft | null = null;
type History = { past: Draft[]; future: Draft[]; draftId: string };
let history: History = { past: [], future: [], draftId: "" };
let historyLoaded = false;
let transaction = false;
let transactionSaved = false;
let lastEdit = { key: "", time: 0 };
const contentOf = (d: Draft) => {
  const { step, editorStage, interviewIndex, updatedAt, cloudId, cloudRevision, cloudSavedAt, ...content } = d;
  void step; void editorStage; void interviewIndex; void updatedAt; void cloudId; void cloudRevision; void cloudSavedAt;
  return JSON.stringify(content);
};
function loadHistory(current: Draft) {
  if (!historyLoaded) {
    historyLoaded = true;
    try { history = JSON.parse(sessionStorage.getItem(historyKey()) ?? "null") ?? history; } catch {}
  }
  if (history.draftId !== current.createdAt) history = { past: [], future: [], draftId: current.createdAt };
}
function saveHistory() {
  try { sessionStorage.setItem(historyKey(), JSON.stringify(history)); } catch {}
}
export function beginDraftEdit() { transaction = true; transactionSaved = false; }
export function endDraftEdit() { transaction = false; transactionSaved = false; lastEdit = { key: "", time: 0 }; }
export function useDraftHistory() {
  const draft = useDraft();
  if (draft && typeof window !== "undefined") loadHistory(draft);
  return { canUndo: Boolean(draft?.status === "draft" && history.past.length), canRedo: Boolean(draft?.status === "draft" && history.future.length) };
}
function restoreHistory(direction: "undo" | "redo") {
  const current = readDraft();
  if (!current || current.status !== "draft") return;
  loadHistory(current); endDraftEdit();
  const from = direction === "undo" ? history.past : history.future;
  const to = direction === "undo" ? history.future : history.past;
  const next = from.pop(); if (!next) return;
  to.push(current); saveHistory();
  writeDraft({ ...next, cloudId: current.cloudId, cloudRevision: current.cloudRevision, cloudSavedAt: current.cloudSavedAt, step: current.step, editorStage: current.editorStage, interviewIndex: current.interviewIndex, updatedAt: new Date().toISOString() });
}
export const undoDraft = () => restoreHistory("undo");
export const redoDraft = () => restoreHistory("redo");

function readDraft(): Draft | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(draftKey());
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedDraft = raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      cachedDraft = null;
    }
  }
  return cachedDraft;
}

function writeDraft(draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(draftKey(), JSON.stringify(draft));
    else localStorage.removeItem(draftKey());
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Switch only the local namespace; never attach another member's book. */
export function setDraftAccount(userId: string | null) {
  if (accountUserId === userId) return;
  accountUserId = userId; cachedRaw = undefined; cachedDraft = null;
  history = { past: [], future: [], draftId: "" }; historyLoaded = false;
  endDraftEdit(); window.dispatchEvent(new Event(EVENT));
}
export function restoreCloudDraft(userId: string, draft: Draft) {
  if (accountUserId !== userId) throw new Error("로그인한 계정이 변경되었어요.");
  history = { past: [], future: [], draftId: "" }; saveHistory(); endDraftEdit();
  writeDraft(draft);
}
export function setCloudMetadata(userId: string, createdAt: string, metadata: Pick<Partial<Draft>, "cloudId" | "cloudRevision" | "cloudSavedAt">) {
  if (accountUserId !== userId) return;
  const current = readDraft();
  if (current?.createdAt === createdAt) writeDraft({ ...current, ...metadata });
}
export function copyCurrentDraft() {
  const current = readDraft();
  if (!current) return;
  const now = new Date().toISOString();
  history = { past: [], future: [], draftId: "" }; saveHistory(); endDraftEdit();
  writeDraft({ ...current, createdAt: now, updatedAt: now, cloudId: undefined, cloudRevision: undefined, cloudSavedAt: undefined });
}
export function getGuestDraft(): Draft | null {
  try { return JSON.parse(localStorage.getItem("omoi:draft") ?? "null"); } catch { return null; }
}
export async function importGuestDraft(userId: string) {
  if (accountUserId !== userId) throw new Error("로그인이 필요해요.");
  const guest = getGuestDraft(); if (!guest) throw new Error("이 기기에 보관된 책이 없어요.");
  const ids = new Set([guest.coverPhotoId, ...Object.values(guest.photoByQuestion), ...(guest.bookPhotos ?? []).map(p => p.photoId)]);
  for (const id of ids) {
    if (!id) continue;
    const photo = await getPhoto(id, null);
    if (!photo) throw new Error("사진을 찾지 못했어요. 원래 작성한 기기에서 가져와 주세요.");
    await putPhoto(id, photo, userId);
  }
  // Keep the guest copy until the customer explicitly removes it.
  restoreCloudDraft(userId, { ...guest, cloudId: undefined, cloudRevision: undefined, cloudSavedAt: undefined });
}

/** undefined = 불러오는 중(서버 렌더링), null = 작성 중인 편지 없음 */
export function useDraft(): Draft | null | undefined {
  return useSyncExternalStore(subscribe, readDraft, () => undefined);
}

export function createDraft(): Draft {
  const now = new Date().toISOString();
  const draft: Draft = {
    version: 1,
    status: "draft",
    step: "order",
    interviewIndex: 0,
    occasion: "lover-birthday",
    recipientName: "",
    anniversaryDate: "",
    lateAccepted: false,
    bookSize: "8x8",
    answers: {},
    photoByQuestion: {},
    coverPhotoId: null,
    design: "minimal",
    createdAt: now,
    updatedAt: now,
  };
  writeDraft(draft);
  return draft;
}

/** 확정된 원고는 고치지 않는다 (01. ARCHITECTURE.md 4장 '확정 후 잠금') */
export function updateDraft(change: (d: Draft) => Partial<Draft>) {
  const current = readDraft();
  if (!current || current.status === "submitted") return;
  const patch = change(current);
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  if (contentOf(next) !== contentOf(current)) {
    loadHistory(current);
    const key = Object.keys(patch).filter((k) => !["step", "editorStage", "interviewIndex"].includes(k)).sort().join(",");
    const now = Date.now();
    if (transaction ? !transactionSaved : key !== lastEdit.key || now - lastEdit.time > 700 || !["recipientName", "answers"].includes(key)) {
      history.past.push(current); history.past = history.past.slice(-60);
    }
    if (transaction) transactionSaved = true;
    lastEdit = { key, time: now }; history.future = []; saveHistory();
  }
  writeDraft(next);
}

export function submitDraft() {
  const current = readDraft();
  if (!current) return;
  const now = new Date().toISOString();
  writeDraft({ ...current, status: "submitted", submittedAt: now, updatedAt: now });
}

export async function discardDraft() {
  history = { past: [], future: [], draftId: "" }; saveHistory(); endDraftEdit();
  writeDraft(null);
  // Other saved books may still reference these photos; retain the local cache.
}

/* ---------------- 사진 (IndexedDB) ---------------- */

const DB_NAME = "omoi";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const req = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => { db.close(); resolve(req.result); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? req.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("사진 저장이 중단되었어요.")); };
  });
}

export function putPhoto(id: string, blob: Blob, owner: string | null = accountUserId) {
  const key = photoKey(id, owner);
  return tx("readwrite", (s) => s.put(blob, key));
}

export function getPhoto(id: string, owner: string | null = accountUserId) {
  const key = photoKey(id, owner);
  return tx<Blob | undefined>("readonly", (s) => s.get(key));
}

export function deletePhoto(id: string) {
  const key = photoKey(id, accountUserId);
  return tx("readwrite", (s) => s.delete(key));
}


/** 사진 id → 화면에 띄울 임시 주소 */
export function usePhotoUrl(id: string | null | undefined) {
  const owner = accountUserId;
  const [entry, setEntry] = useState<{ id: string; owner: string | null; url: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let url: string | null = null;
    let alive = true;
    getPhoto(id)
      .then((blob) => {
        if (!alive || !blob) return;
        url = URL.createObjectURL(blob);
        setEntry({ id, owner, url });
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, owner]);

  return id && entry?.id === id && entry.owner === owner ? entry.url : null;
}
