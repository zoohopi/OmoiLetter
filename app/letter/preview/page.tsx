"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftGuard } from "@/lib/letter/guard";
import { submitDraft, updateDraft } from "@/lib/letter/store";
import { setCoverPhoto, setQuestionPhoto } from "@/lib/letter/photoActions";
import { BOOK_LABEL, checkReady, MAX_ANSWER_LENGTH, todayString } from "@/lib/letter/rules";
import BookPage, { buildInnerPages, sideOf, type PageSpec } from "@/components/letter/BookPage";
import { photoEditorProps } from "@/components/letter/PhotoTools";
import ScaledPage from "@/components/letter/ScaledPage";
import LayoutPick from "@/components/letter/LayoutPick";
import type { Draft } from "@/lib/letter/types";

// 미리보기 = 인쇄 템플릿과 같은 컴포넌트를 줄여서 보여준다.
export default function PreviewPage() {
  const draft = useDraftGuard();
  const router = useRouter();
  if (!draft) return null;

  const inner = buildInnerPages(draft);
  // 내지는 질문마다 [왼쪽 | 오른쪽] 펼침 한 쌍
  const spreads: PageSpec[][] = [];
  for (let i = 0; i < inner.length; i += 2) spreads.push(inner.slice(i, i + 2));

  const problems = checkReady(draft);

  return (
    <main className="maker">
      <div className="maker__inner maker__inner--wide">
        <p className="eyebrow">STEP 4 · 미리보기</p>
        <h1 className="maker__title">{draft.recipientName}에게 갈 편지책</h1>
        <p className="maker__lead">
          {BOOK_LABEL} · 내지 {inner.length}쪽 · 실제 인쇄되는 모습 그대로예요.
          <br />
          표지·사진·글을 <b>두 번 눌러</b> 바로 고칠 수 있어요.
        </p>

        <div className="pv-list">
          <div className="pv-cover">
            <p className="pv-label">표지</p>
            <Page draft={draft} page={{ kind: "cover", photoId: draft.coverPhotoId }} />
          </div>

          {spreads.map((pages, i) => (
            <div key={i}>
              <p className="pv-label">펼침 {i + 1}</p>
              <div className={`pv-spread ${pages.length === 1 ? "pv-spread--single" : ""}`}>
                {pages.map((p, j) => (
                  <Page key={j} draft={draft} page={p} />
                ))}
              </div>
            </div>
          ))}

          <div className="pv-cover">
            <p className="pv-label">뒷표지</p>
            <Page draft={draft} page={{ kind: "back", photoId: draft.coverPhotoId }} />
          </div>
        </div>

        {problems.length > 0 && (
          <div className="checklist-box">
            <b>확정 전에 확인해 주세요</b>
            <ul>
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="actions">
          <Link className="link-btn" href="/letter/interview">
            ← 편지 고치기
          </Link>
          <Link className="link-btn" href="/letter/share">
            인스타그램용 사진 받기
          </Link>
          <button
            className="btn"
            type="button"
            disabled={problems.length > 0}
            onClick={() => {
              if (!confirm("확정하면 더 이상 고칠 수 없어요. 이대로 편지를 완성할까요?")) return;
              submitDraft();
              router.push("/letter/done");
            }}
          >
            이대로 편지 완성하기 ♥
          </button>
        </div>
      </div>
    </main>
  );
}

// 두 번 누르면 그 쪽만 고치는 상태가 된다. 표지·사진·글만 고칠 수 있다.
function Page({ draft, page }: { draft: Draft; page: PageSpec }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const leaf = page.kind === "leaf" && page.qid ? page : null;
  // 펼침에서 사진이 놓인 면은 사진을, 반대 면은 글을 고친다
  const photoSide = leaf ? Boolean(leaf.photoPage) || sideOf(draft.design, leaf.layout, "photo") === leaf.side : false;
  const editable = page.kind === "cover" || Boolean(leaf && (!draft.bookPhotos || photoSide));

  const runPhoto = async (job: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await job();
    } catch {
      setError("이 사진은 열 수 없어요. JPG나 PNG 사진으로 다시 골라 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const on = editing && editable;

  return (
    <div
      className={`pv-page ${editable ? "is-editable" : ""} ${on ? "is-editing" : ""}`}
      onDoubleClick={() => editable && setEditing(true)}
      title={editable && !on ? "두 번 눌러 고치기" : undefined}
    >
      <ScaledPage>
        <BookPage
          page={page}
          {...photoEditorProps(draft, page.kind === "cover" ? "cover" : leaf?.qid ?? "", null, () => {}, false)}
          design={draft.design}
          size={draft.bookSize}
          recipientName={draft.recipientName}
          anniversaryDate={draft.anniversaryDate}
          coverEdit={
            on && page.kind === "cover"
              ? {
                  onPhoto: (f) => void runPhoto(() => setCoverPhoto(f)),
                  onName: (v) => updateDraft(() => ({ recipientName: v })),
                  onDate: (v) => v && updateDraft(() => ({ anniversaryDate: v, lateAccepted: false })),
                  minDate: todayString(),
                  busy,
                }
              : undefined
          }
          photoEdit={
            on && leaf && photoSide
              ? { onPhoto: (f) => void runPhoto(() => setQuestionPhoto(leaf.qid!, f)), busy }
              : undefined
          }
          textEdit={
            on && leaf && !photoSide
              ? {
                  maxLength: MAX_ANSWER_LENGTH,
                  placeholder: "",
                  // 다 지우면 이 펼침이 책에서 빠지므로, 미리보기에서는 빈칸으로 만들지 않는다
                  onChange: (v) =>
                    v.trim() && updateDraft((d) => ({ answers: { ...d.answers, [leaf.qid!]: v } })),
                }
              : undefined
          }
        />
      </ScaledPage>
      {on && leaf && <LayoutPick design={draft.design} qid={leaf.qid!} value={leaf.layout} />}
      {on && (
        <div className="pv-edit-bar">
          <span>{leaf ? (photoSide ? "사진을 눌러 바꾸고, 레이아웃도 골라요" : "글을 바로 고쳐요") : "사진·이름·날짜를 바로 고쳐요"}</span>
          <button className="btn btn--small" type="button" onClick={() => setEditing(false)}>
            완료
          </button>
        </div>
      )}
      {error && <p className="ph-error">{error}</p>}
    </div>
  );
}
