"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftGuard } from "@/lib/letter/guard";
import PhotoPages from "@/components/letter/PhotoPages";
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
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(0);
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
            <Page draft={draft} page={{ kind: "cover", photoId: draft.coverPhotoId }} editing={editingPage === "cover"} setEditing={(on) => setEditingPage(on ? "cover" : null)} />
          </div>

          {draft.bookPhotos ? (
            <PhotoPages
              draft={draft}
              index={selectedPage}
              onSelect={(index) => {
                setSelectedPage(index);
                if (editingPage === "cover" || selectedPage !== index) setEditingPage(null);
              }}
              renderLetterPage={(page) => {
                const key = page.kind === "leaf" ? page.qid ?? "" : "";
                return <Page draft={draft} page={page} editing={editingPage === key} setEditing={(on) => setEditingPage(on ? key : null)} />;
              }}
            />
          ) : spreads.map((pages, i) => (
            <div key={i}>
              <p className="pv-label">펼침 {i + 1}</p>
              <div className="pv-spread">
                {pages.map((page, j) => {
                  const key = `inner-${i}-${j}`;
                  return <Page key={key} draft={draft} page={page} editing={editingPage === key} setEditing={(on) => setEditingPage(on ? key : null)} />;
                })}
              </div>
            </div>
          ))}

          <div className="pv-cover">
            <p className="pv-label">뒷표지</p>
            <Page draft={draft} page={{ kind: "back", photoId: draft.coverPhotoId }} editing={editingPage === "back"} setEditing={(on) => setEditingPage(on ? "back" : null)} />
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

        {fixOpen && <FixPopup draft={draft} problems={problems} onClose={() => setFixOpen(false)} />}

        <div className="actions preview-actions">
          <Link className="link-btn" href="/letter/interview">
            ← 편지 고치기
          </Link>
          <div className="preview-actions__row">
          <Link className="link-btn" href="/letter/share">
            인스타그램용 사진 받기
          </Link>
          <button
            className="btn btn--small preview-actions__finish"
            type="button"
            aria-disabled={problems.length > 0}
            onClick={() => {
              if (problems.length > 0) { setFixOpen(true); return; }
              if (!confirm("확정하면 더 이상 고칠 수 없어요. 이대로 편지를 완성할까요?")) return;
              submitDraft();
              router.push("/letter/done");
            }}
          >
            이대로 편지 완성하기 ♥
          </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// 두 번 누르면 그 쪽만 고치는 상태가 된다. 표지·사진·글만 고칠 수 있다.
function Page({ draft, page, editing, setEditing }: { draft: Draft; page: PageSpec; editing: boolean; setEditing: (on: boolean) => void }) {
  const [photoMode, setPhotoMode] = useState<"image" | null>(null);
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
  const attachedLetters = leaf ? draft.letters?.filter(l => l.pageId === leaf.qid && l.answer.trim()) ?? [] : [];
  const isLetter = Boolean(leaf && (attachedLetters.length || !photoSide));

  return (
    <div
      className={`pv-page ${editable ? "is-editable" : ""} ${on ? "is-editing" : ""} ${isLetter ? "pv-page--letter" : ""}`}
      onDoubleClickCapture={(event) => {
        if (!editable || (event.target instanceof Element && event.target.closest("input, textarea, button"))) return;
        setEditing(true);
        if (photoSide && leaf?.photoId) setPhotoMode("image");
      }}
      title={editable && !on ? "두 번 눌러 고치기" : undefined}
    >
      <ScaledPage>
        <BookPage
          page={page}
          {...photoEditorProps(draft, page.kind === "cover" ? "cover" : leaf?.qid ?? "", on ? photoMode : null, (mode) => { setEditing(true); setPhotoMode(mode); }, true)}
          design={draft.design}
          size={draft.bookSize}
          recipientName={draft.recipientName}
          coverType={draft.coverType} coverTitle={draft.coverTitle} anniversaryDate={draft.anniversaryDate}
          coverEdit={
            page.kind === "cover"
              ? {
                  onPhoto: (f) => void runPhoto(() => setCoverPhoto(f)),
                  onTitle: (v) => updateDraft(() => ({ coverTitle: v })),
                  onName: (v) => updateDraft(() => ({ recipientName: v })),
                  onDate: (v) => v && updateDraft(() => ({ anniversaryDate: v, lateAccepted: false })),
                  minDate: todayString(),
                  busy,
                }
              : undefined
          }
          photoEdit={
            leaf && photoSide
              ? { onPhoto: (f) => void runPhoto(() => setQuestionPhoto(leaf.qid!, f)), busy }
              : undefined
          }
          textEdit={
            leaf && isLetter
              ? {
                  maxLength: MAX_ANSWER_LENGTH,
                  placeholder: "",
                  onQuestion: (value) => updateDraft(current => ({
                    letters: current.letters?.map(letter => letter.id === attachedLetters[0]?.id ? { ...letter, question: value } : letter),
                  })),
                  onChange: (value) => updateDraft(current => {
                    if (!attachedLetters.length) return { answers: { ...current.answers, [leaf.qid!]: value } };
                    const suffix = attachedLetters.slice(1).map(letter => letter.answer).join("\n\n");
                    const answer = suffix && value.endsWith("\n\n" + suffix)
                      ? value.slice(0, -(suffix.length + 2))
                      : value;
                    return { letters: current.letters?.map(letter => letter.id === attachedLetters[0].id ? { ...letter, answer } : letter) };
                  }),
                }
              : undefined
          }
        />
      </ScaledPage>
      {on && leaf && !attachedLetters.length && <LayoutPick design={draft.design} qid={leaf.qid!} value={leaf.layout} />}
      {on && !isLetter && (
        <div className="pv-edit-bar">
          <span>{leaf ? (photoSide ? "사진을 눌러 바꾸고, 레이아웃도 골라요" : "글을 바로 고쳐요") : "사진·이름·날짜를 바로 고쳐요"}</span>

        </div>
      )}
      {error && <p className="ph-error">{error}</p>}
    </div>
  );
}

// 확정 전에 빠진 것: 첫 단계 정보(받는 분·기념일·늦은 도착 동의)는 이 창에서 바로 고치고, 나머지는 고칠 화면으로 안내한다.
function FixPopup({ draft, problems, onClose }: { draft: Draft; problems: string[]; onClose: () => void }) {
  const go = (p: string) =>
    p.includes("표지") ? ["/start", "표지 고르러 가기"] :
    p.includes("사진") ? ["/letter/photos", "사진 고르러 가기"] :
    p.includes("편지") || p.includes("질문") ? ["/letter/interview", "편지 쓰러 가기"] : null;
  return (
    <div className="late-popup" role="dialog" aria-modal="true" aria-labelledby="fix-popup-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="late-popup__card fix-popup">
        <b id="fix-popup-title">{problems.length ? "완성 전에 채워 주세요" : "모두 채웠어요!"}</b>
        {problems.length > 0 && <ul className="fix-popup__list">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        {(!draft.recipientName.trim() || !draft.anniversaryDate) && <div className="fix-popup__fields">
          <label>받으시는 분 (To.)<input type="text" maxLength={12} autoFocus value={draft.recipientName} onChange={(e) => updateDraft(() => ({ recipientName: e.target.value }))} placeholder="이름 또는 애칭" /></label>
          <label>기념일<input type="date" min={todayString()} value={draft.anniversaryDate} onChange={(e) => updateDraft(() => ({ anniversaryDate: e.target.value, lateAccepted: false }))} /></label>
        </div>}
        {problems.some((p) => p.includes("도착에 동의")) && <label className="fix-popup__check"><input type="checkbox" checked={draft.lateAccepted} onChange={(e) => updateDraft(() => ({ lateAccepted: e.target.checked }))} /> 기념일 이후 도착해도 괜찮아요.</label>}
        <div className="late-popup__actions">
          {[...new Map(problems.map(go).filter((x): x is string[] => Boolean(x)).map((x) => [x[0], x])).values()].map(([href, label]) => <Link key={href} className="btn btn--ghost" href={href}>{label}</Link>)}
          <button className="btn" type="button" onClick={onClose}>{problems.length ? "닫기" : "확인"}</button>
        </div>
      </div>
    </div>
  );
}
