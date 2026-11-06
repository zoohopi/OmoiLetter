"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDraftGuard } from "@/lib/letter/guard";
import { renderInstagramSlides, type Slide } from "@/lib/letter/instagram";

// 인스타그램 업로드용 사진 (4:5). 편지책 목업에 사진만 — 편지 글은 넣지 않는다.
export default function SharePage() {
  const draft = useDraftGuard({ allowSubmitted: true, requireCover: true });
  const [slides, setSlides] = useState<(Slide & { url: string })[] | null>(null);
  const [error, setError] = useState("");
  const [shareMsg, setShareMsg] = useState("");

  const key = draft ? `${draft.updatedAt}` : "";

  useEffect(() => {
    if (!draft) return;
    let alive = true;
    let made: string[] = [];
    Promise.resolve().then(() => {
      if (!alive) return [];
      setSlides(null); setError("");
      return renderInstagramSlides(draft);
    })
      .then((list) => {
        if (!alive) return;
        const withUrls = list.map((s) => ({ ...s, url: URL.createObjectURL(s.blob) }));
        made = withUrls.map((s) => s.url);
        setSlides(withUrls);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "이미지를 만들지 못했어요. 새로고침 후 다시 시도해 주세요."));
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
    // 편지가 바뀔 때만 다시 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!draft) return null;

  const download = (s: Slide & { url: string }) => {
    const a = document.createElement("a");
    a.href = s.url;
    a.download = s.name;
    a.click();
  };

  const downloadAll = async () => {
    if (!slides) return;
    for (const s of slides) {
      download(s);
      await new Promise((r) => setTimeout(r, 400)); // 브라우저가 여러 파일을 막지 않도록 간격
    }
  };

  // 휴대폰: 공유 시트 → 인스타그램 선택
  const files = slides?.map((s) => new File([s.blob], s.name, { type: "image/jpeg" })) ?? [];
  const canShare =
    typeof navigator !== "undefined" && "canShare" in navigator && files.length > 0 && navigator.canShare({ files });

  const share = async () => {
    setShareMsg("");
    try {
      await navigator.share({ files, title: "Omoi Letter" });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setShareMsg("공유하지 못했어요. 사진으로 저장한 뒤 인스타그램에서 올려 주세요.");
    }
  };

  return (
    <main className="maker">
      <div className="maker__inner maker__inner--wide">
        <p className="eyebrow">INSTAGRAM</p>
        <h1 className="maker__title">인스타그램에 올릴 사진</h1>
        <p className="maker__lead">
          표지와 사진을 실물 책처럼 담았어요. 편지 내용은 보여 주지 않아요. · 4:5 (1080 × 1350px)
        </p>

        <div className="actions" style={{ justifyContent: "flex-start" }}>
          {canShare && (
            <button className="btn" type="button" onClick={share}>
              인스타그램에 공유하기
            </button>
          )}
          <button className={canShare ? "btn btn--ghost" : "btn"} type="button" disabled={!slides} onClick={downloadAll}>
            사진 {slides?.length ?? ""}장 모두 저장
          </button>
        </div>
        {shareMsg && <p className="ph-error">{shareMsg}</p>}
        {error && <p className="ph-error">{error}</p>}

        {!slides && !error && <p className="maker__lead">사진을 만들고 있어요…</p>}
        {slides && (
          <ul className="ig-grid">
            {slides.map((s, i) => (
              <li key={s.name}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 이미지(blob) */}
                <img src={s.url} alt={i === 0 ? "내 책 표지" : `사진 내지 ${i}`} />
                <button className="link-btn" type="button" onClick={() => download(s)}>
                  이 사진 저장
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="actions">
          <Link className="link-btn" href={draft.status === "submitted" ? "/letter/done" : "/letter/preview"}>
            ← 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
