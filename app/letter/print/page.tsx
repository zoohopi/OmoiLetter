"use client";

import { useDraftGuard } from "@/lib/letter/guard";
import { BLEED_MM, trimOf } from "@/lib/letter/rules";
import { photoEditorProps } from "@/components/letter/PhotoTools";
import BookPage, { buildInnerPages } from "@/components/letter/BookPage";

// 인쇄 확인용 (내부). 재단여백 3mm를 포함한 실제 크기 — 브라우저 "PDF로 저장"으로 확인한다.
// 정식 인쇄 파일은 확정 후 서버(Playwright)가 같은 템플릿으로 만든다. (01. ARCHITECTURE.md)
export default function PrintPage() {
  const draft = useDraftGuard({ allowSubmitted: true });
  if (!draft) return null;

  const trim = trimOf(draft.bookSize);
  const pageW = trim.w + BLEED_MM * 2;
  const pageH = trim.h + BLEED_MM * 2;
  const inner = buildInnerPages(draft);
  const common = {
    size: draft.bookSize,
    bleed: true,
    recipientName: draft.recipientName,
    anniversaryDate: draft.anniversaryDate,
    design: draft.design,
    coverPhotoTransform: draft.coverPhotoTransform,
  };

  return (
    <>
      <style>{`@page { size: ${pageW}mm ${pageH}mm; margin: 0; } @media print { .mk-head { display: none; } .maker-print { padding: 0 !important; } }`}</style>
      <main className="maker maker-print">
        <div className="print-bar">
          <b>인쇄 확인용 화면 (내부)</b>
          <ul>
            <li>
              작업 사이즈 {pageW}×{pageH}mm (재단 {trim.w}×{trim.h}mm + 사방 {BLEED_MM}mm). 점선이 재단선이에요.
            </li>
            <li>앞표지·뒷표지 각 1쪽 + 내지 {inner.length}쪽. 무선 제본 표지(앞·책등·뒤 펼침)는 책등 두께 확인 후 따로 만들어요.</li>
            <li>Ctrl+P → 대상 &quot;PDF로 저장&quot;, 여백 &quot;없음&quot;, 배경 그래픽 켜기.</li>
          </ul>
          <button className="btn btn--small" type="button" onClick={() => window.print()}>
            인쇄 / PDF로 저장
          </button>
        </div>
        <div className="print-pages">
          <BookPage {...common} {...photoEditorProps(draft, "cover", null, () => {}, false)} page={{ kind: "cover", photoId: draft.coverPhotoId }} />
          {inner.map((p, i) => (
            <BookPage key={i} {...common} {...photoEditorProps(draft, p.kind === "leaf" ? p.qid ?? "" : "", null, () => {}, false)} page={p} />
          ))}
          <BookPage {...common} page={{ kind: "back", photoId: draft.coverPhotoId }} />
        </div>
      </main>
    </>
  );
}
