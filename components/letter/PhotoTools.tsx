"use client";

import { useEffect, useState } from "react";
import type { Draft, PhotoTransform } from "@/lib/letter/types";
import { beginDraftEdit, endDraftEdit, updateDraft, usePhotoUrl } from "@/lib/letter/store";
import { designOf, layoutOf, photoPageDesign } from "@/lib/letter/designs";
import type { PhotoAdjust } from "./BookPage";

type Mode = "image" | null;
const INITIAL: PhotoTransform = { scale: 1, x: 0, y: 0 };
export function photoEditorProps(draft: Draft, scope: string, mode: Mode, setMode: (mode: Mode) => void, interactive = true) {
  const photoTransform = scope === "cover" ? draft.coverPhotoTransform : draft.photoTransforms?.[scope];
  const photoAdjust: PhotoAdjust | undefined = interactive ? {
    finish: () => { endDraftEdit(); setMode(null); }, mode, activate: () => setMode("image"), change: (value) => setTransform(scope, value),
    remove: () => {
      updateDraft((d) => {
        if (scope === "cover") return { coverPhotoId: null, coverPhotoTransform: INITIAL };
        const photoByQuestion = { ...d.photoByQuestion }; delete photoByQuestion[scope];
        return { photoByQuestion, bookPhotos: d.bookPhotos?.map((p) => p.id === scope ? { ...p, photoId: "" } : p),
          photoTransforms: { ...d.photoTransforms, [scope]: INITIAL } };
      }); setMode(null);
    },
  } : undefined;
  return { photoTransform, photoAdjust };
}

function setTransform(scope: string, value: PhotoTransform) {
  updateDraft((d) => scope === "cover" ? { coverPhotoTransform: value } : { photoTransforms: { ...d.photoTransforms, [scope]: value } });
}

export default function PhotoTools({ draft, scope, mode, setMode }: { draft: Draft; scope: string; mode: Mode; setMode: (mode: Mode) => void }) {
  const photoId = scope === "cover" ? draft.coverPhotoId : draft.bookPhotos?.find((p) => p.id === scope)?.photoId ?? draft.photoByQuestion[scope];
  const url = usePhotoUrl(photoId);
  const [size, setSize] = useState<{ url: string; w: number; h: number } | null>(null);
  useEffect(() => {
    if (!url) return;
    const img = new Image(); let active = true;
    img.onload = () => { if (active) setSize({ url, w: img.naturalWidth, h: img.naturalHeight }); };
    img.src = url; return () => { active = false; };
  }, [url]);
  const image = (scope === "cover" ? draft.coverPhotoTransform : draft.photoTransforms?.[scope]) ?? INITIAL;
  const value = image;
  const design = designOf(draft.design);
  const layout = layoutOf(design, draft.photoLayout?.[scope]);
  const page = scope === "cover" ? design.cover : draft.bookPhotos ? photoPageDesign(draft.design, draft.photoLayout?.[scope], Boolean(draft.letters?.some((l) => l.pageId === scope && l.answer.trim()))) : layout[layout.photoSide];
  const rect = page.els.find((el) => el.t === "photo")?.r;
  const baseW = rect ? rect[2] - rect[0] : 0, baseH = rect ? rect[3] - rect[1] : 0;
  const pixels = size?.url === url ? size : null;
  const fillScale = pixels && rect ? Math.max((baseW / baseH) / (pixels.w / pixels.h), (pixels.w / pixels.h) / (baseW / baseH)) : 1;

  return <div className="photo-tools" aria-label="사진 구도 조절">
    <p>사진을 더블클릭 해보세요<br />사진 크기, 구도 조절, 삭제가 가능해요</p>
    {mode ? <>
      <p>원본 사진이 60% 불투명도로 보여요. 사진을 드래그해 옮기고, 모서리 점으로 크기를 조절해 주세요.</p>
      <label>사진 배율 · {Math.round(value.scale * 100)}%
        <input aria-label="사진 배율" type="range" min="10" max="600" step="1" value={Math.round(value.scale * 100)}
          onPointerDown={beginDraftEdit} onPointerUp={endDraftEdit} onPointerCancel={endDraftEdit} onBlur={endDraftEdit}
          onChange={(e) => setTransform(scope, { ...value, scale: Number(e.target.value) / 100 })} />
      </label>
      <div className="photo-tools__modes">
        <button className="link-btn" type="button" onClick={() => setTransform(scope, { ...value, x: 0, y: 0 })}>중앙 맞춤</button>
        <button className="link-btn" type="button" onClick={() => setTransform(scope, { scale: 1 / fillScale, x: 0, y: 0 })}>원본 전체 맞추기</button>
        <button className="link-btn" type="button" onClick={() => setTransform(scope, { scale: 1, x: 0, y: 0 })}>틀 채우기</button>
        <button className="btn btn--small" type="button" onClick={() => { endDraftEdit(); setMode(null); }}>조절 완료</button>
      </div>
    </> : null}
    {mode && url && <div className="photo-original-preview">
      <p className="field__hint">원본 전체 보기 · 사진은 잘라 저장하지 않아요.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob preview */}
      <img src={url} alt="잘리지 않은 원본 사진 전체" />
    </div>}
  </div>;
}
