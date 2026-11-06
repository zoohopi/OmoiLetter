"use client";

import { useState } from "react";
import type { Draft } from "@/lib/letter/types";
import { updateDraft } from "@/lib/letter/store";
import { setQuestionPhoto } from "@/lib/letter/photoActions";
import BookPage, { buildInnerPages } from "./BookPage";
import ScaledPage from "./ScaledPage";
import LayoutPick from "./LayoutPick";
import { photoPageDesign } from "@/lib/letter/designs";
import PhotoTools, { photoEditorProps } from "./PhotoTools";

export default function PhotoPages({ draft, index, onSelect, editable = true, placingLetterId, dropPageId, onPlaceLetter, onDropHover }: { draft: Draft; index: number; onSelect: (n: number) => void; editable?: boolean; placingLetterId?: string | null; dropPageId?: string | null; onPlaceLetter?: (letterId: string, pageId: string) => void; onDropHover?: (pageId: string | null) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pages = buildInnerPages(draft);
  const selected = Math.min(index, Math.max(0, pages.length - 1));
  const pairs = Array.from({ length: Math.ceil(pages.length / 2) }, (_, i) => pages.slice(i * 2, i * 2 + 2));

  return <section className="photo-page-list" aria-label="모든 사진 페이지">
    {error && <p className="ph-error" role="alert">{error}</p>}
    {pairs.map((pair, row) => <div className="photo-page-list__spread" key={row}>
      <div className={`compose-pages ${pair.length === 1 ? "compose-pages--single" : ""}`}>
        {pair.map((page, offset) => {
          const n = row * 2 + offset;
          const id = page.kind === "leaf" ? page.qid ?? "" : "";
          return <div key={id} className={`photo-page ${n === selected ? "is-selected" : ""} ${dropPageId === id ? "is-drop-target" : ""}`} data-page-index={n} data-letter-drop-id={onPlaceLetter ? id : undefined}
            onPointerDown={() => onSelect(n)}
            onClick={() => { if(placingLetterId && onPlaceLetter)onPlaceLetter(placingLetterId,id); }}
            onDragOver={(e) => { if(!onPlaceLetter || !e.dataTransfer.types.includes("application/x-omoi-letter"))return;e.preventDefault();e.dataTransfer.dropEffect="move";onDropHover?.(id); }}
            onDragLeave={(e) => { if(!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget))onDropHover?.(null); }}
            onDrop={(e) => {const letterId=e.dataTransfer.getData("application/x-omoi-letter");if(!letterId||!onPlaceLetter)return;e.preventDefault();onPlaceLetter(letterId,id);onDropHover?.(null);}}>
            <ScaledPage><BookPage page={page} design={draft.design} size={draft.bookSize} recipientName={draft.recipientName} anniversaryDate={draft.anniversaryDate}
              {...photoEditorProps(draft, id, editable && editingId === id && n === selected ? "image" : null, (mode) => { onSelect(n); setEditingId(mode ? id : null); }, editable)}
              photoEdit={editable ? { busy, onPhoto: (file) => {
                setBusy(true); setError("");
                void setQuestionPhoto(id, file).catch(() => setError("사진을 열지 못했어요.")).finally(() => setBusy(false));
              } } : undefined} />
            </ScaledPage>
            <button className="link-btn photo-page__select" type="button" aria-pressed={n === selected} aria-label={`내지 ${n + 1}쪽 선택`}
              onClick={() => { onSelect(n); setEditingId(null); }}>내지 {n + 1}쪽</button>
          </div>;
        })}
      </div>
      {editable && Math.floor(selected / 2) === row && pages[selected]?.kind === "leaf" && (() => {
        const page = pages[selected]; if (page.kind !== "leaf" || !page.qid) return null;
        const id = page.qid;
        if (!layoutHasPhoto(draft, page)) return null;
        return <div className="photo-page-list__controls">
          <LayoutPick design={draft.design} qid={id} value={page.layout} />
          <div className="compose-controls">
            <button className="link-btn" disabled={busy} onClick={() => {
              updateDraft((d) => ({ bookPhotos: d.bookPhotos?.filter((p) => p.id !== id), letters: d.letters?.map((l) => l.pageId === id ? { ...l, pageId: null } : l) }));
              setEditingId(null);
            }}>이 페이지 삭제</button>
          </div>
          <PhotoTools draft={draft} scope={id} mode={editingId === id ? "image" : null} setMode={(mode) => setEditingId(mode ? id : null)} />
        </div>;
      })()}
    </div>)}
  </section>;
}

function layoutHasPhoto(draft: Draft, page: Extract<ReturnType<typeof buildInnerPages>[number], {kind:"leaf"}>) {
  return !page.photoPage || photoPageDesign(draft.design,page.layout,Boolean(page.answer.trim())).els.some(el=>el.t==="photo");
}
