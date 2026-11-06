"use client";
import { useEffect, useState } from "react";
import BookPage, { buildInnerPages, type PageSpec } from "@/components/letter/BookPage";
import { BLEED_MM, trimOf } from "@/lib/letter/rules";
import type { Draft } from "@/lib/letter/types";

export default function PrintBook({ draft, photoUrls }: { draft: Draft; photoUrls: Record<string, string> }) {
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  const trim = trimOf(draft.bookSize);
  const pages: PageSpec[] = [{ kind: "cover", photoId: draft.coverPhotoId }, ...buildInnerPages(draft), { kind: "back", photoId: draft.coverPhotoId }];
  useEffect(() => {
    let alive = true;
    (async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll<HTMLImageElement>(".admin-print-book img")].map(image => image.decode()));
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (alive) setReady(true);
    })().catch(() => alive && setError("사진이나 글꼴을 불러오지 못했어요. PDF를 다시 생성해 주세요."));
    return () => { alive = false; };
  }, [draft, photoUrls]);
  return <>
    <style>{`@page{size:${trim.w + BLEED_MM * 2}mm ${trim.h + BLEED_MM * 2}mm;margin:0}html,body{margin:0!important;padding:0!important;background:white!important}body::before,body::after{display:none!important}.admin-print-book{width:${trim.w + BLEED_MM * 2}mm;margin:0;padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}.admin-print-book .bp{break-after:page;break-inside:avoid;box-shadow:none}.admin-print-book .bp:last-child{break-after:auto}.admin-print-book .bp::after{display:none!important}@media screen{.admin-print-book{margin:20px auto}.admin-print-book .bp{margin-bottom:20px}}`}</style>
    {error && <p data-print-error role="alert">{error}</p>}
    <div className="admin-print-book" data-print-ready={ready ? "true" : "false"} data-page-count={pages.length}>
      {pages.map((page, i) => <BookPage key={i} page={page} design={draft.design} size={draft.bookSize} bleed recipientName={draft.recipientName} anniversaryDate={draft.anniversaryDate}
        photoUrls={photoUrls} photoTransform={page.kind === "cover" ? draft.coverPhotoTransform : page.kind === "leaf" && page.qid ? draft.photoTransforms?.[page.qid] : undefined} />)}
    </div>
  </>;
}
