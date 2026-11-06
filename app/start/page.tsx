"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MakerHeader from "@/components/letter/MakerHeader";
import BookPage from "@/components/letter/BookPage";
import PhotoTools, { photoEditorProps } from "@/components/letter/PhotoTools";
import ScaledPage from "@/components/letter/ScaledPage";
import { createDraft, discardDraft, putPhoto, updateDraft, useDraft } from "@/lib/letter/store";
import { newId, prepareImage } from "@/lib/letter/image";
import { BOOK_LABEL, isPastDeadline, nightsUntil, todayString } from "@/lib/letter/rules";
import { coverShowsName, DESIGN_LIST, designOf } from "@/lib/letter/designs";
import "../letter/maker.css";

// 시작 = 표지 만들기. 책(8×8)을 바로 보여주고, 표지 위에서 사진·이름·기념일을 바로 넣는다.
// 비회원은 기기에, 로그인한 회원은 계정에도 원고와 사진을 보관한다.
export default function StartPage() {
  const draft = useDraft();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoMode, setPhotoMode] = useState<"image" | null>(null);

  // 처음 들어오면 빈 편지 한 권을 만든다.
  useEffect(() => {
    if (draft === null) createDraft();
  }, [draft]);

  if (!draft) return null;

  if (draft.status === "submitted") {
    return (
      <>
        <MakerHeader />
        <main className="maker maker--compose start-page">
          <div className="maker__inner">
            <h1 className="maker__title">확정된 편지가 있어요</h1>
            <div className="actions">
              <Link className="btn btn--small" href="/letter/done">
                확인하기
              </Link>
              <NewLetterButton />
            </div>
          </div>
        </main>
      </>
    );
  }

  const onPhoto = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const { blob } = await prepareImage(file);
      const id = newId();
      await putPhoto(id, blob);
      updateDraft(() => ({ coverPhotoId: id, coverPhotoTransform: { scale: 1, x: 0, y: 0 } }));
    } catch {
      setError("이 사진은 열 수 없어요. JPG나 PNG 사진으로 다시 골라 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const hasDate = Boolean(draft.anniversaryDate);
  const nights = hasDate ? nightsUntil(draft.anniversaryDate) : 0;
  const past = hasDate && nights >= 0 && isPastDeadline(draft.anniversaryDate);
  const todo = [
    { done: Boolean(draft.coverPhotoId), text: "사진을 눌러 표지 사진을 정해 주세요." },
    { done: Boolean(draft.recipientName.trim()), text: "받는 분의 이름 또는 애칭을 적어 주세요." },
    { done: hasDate && nights >= 0, text: "기념일은 언제인가요? 날짜를 눌러 골라 주세요." },
  ];
  const ready = todo.every((t) => t.done) && (!past || draft.lateAccepted);

  return (
    <>
      <MakerHeader />
      <main className="maker maker--compose start-page">
        <div className="maker__inner">
          <p className="eyebrow">STEP 1 · 디자인과 표지</p>
          <h1 className="maker__title">어떤 책으로 마음을 전할까요</h1>
          <section className="start-design-choice" aria-label="책 디자인 선택">
            <div className="layout-pick" role="group" aria-label="책 디자인">
              {DESIGN_LIST.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={designOf(draft.design).id === d.id}
                  onClick={() => updateDraft(() => ({ design: d.id }))}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <p className="field__hint">{draft.design === "magazine" ? "사진과 글이 어우러지는 매거진 디자인" : "여백과 사진에 집중하는 미니멀 디자인"}</p>
          </section>
          <div className="start-book">
            <ScaledPage>
              <BookPage
                page={{ kind: "cover", photoId: draft.coverPhotoId }}
                design={draft.design}
                size="8x8"
                recipientName={draft.recipientName}
                anniversaryDate={draft.anniversaryDate}
                {...photoEditorProps(draft, "cover", photoMode, setPhotoMode)}
                coverEdit={{
                  onPhoto: (f) => void onPhoto(f),
                  onName: (v) => updateDraft(() => ({ recipientName: v })),
                  onDate: (v) => updateDraft(() => ({ anniversaryDate: v, lateAccepted: false })),
                  minDate: todayString(),
                  busy,
                }}
              />
            </ScaledPage>
            <p className="field__hint center">{BOOK_LABEL} · 무선 제본</p>
            {draft.coverPhotoId && <PhotoTools draft={draft} scope="cover" mode={photoMode} setMode={setPhotoMode} />}

          </div>
          <ul className="start-todo">
            {todo.map((t) => (
              <li key={t.text} className={t.done ? "is-done" : ""}>
                {t.text}
              </li>
            ))}
          </ul>
          {/* 표지에 이름 자리가 없는 디자인(미니멀)은 받는 분을 여기서 받는다 */}
          {!coverShowsName(draft.design) && (
            <label className="field">
              <span className="field__label">받는 분</span>
              <input
                className="input"
                value={draft.recipientName}
                maxLength={12}
                placeholder="이름 또는 애칭"
                onChange={(e) => updateDraft(() => ({ recipientName: e.target.value }))}
              />
            </label>
          )}
          {error && <p className="ph-error">{error}</p>}


          {hasDate && nights < 0 && <p className="notice">지난 날짜예요. 다가오는 기념일을 골라 주세요.</p>}
          {past && (
            <div className="notice">
              <b>이번 기념일 전에 닿기는 어려울 것 같아요.</b>
              <p style={{ marginTop: 6 }}>편지를 완성한 뒤 제작과 배송에 4일이 걸려요. 그래도 마음은 늦지 않았어요.</p>
              <label>
                <input
                  type="checkbox"
                  checked={draft.lateAccepted}
                  onChange={(e) => updateDraft(() => ({ lateAccepted: e.target.checked }))}
                />
                기념일 이후에 도착해도 괜찮아요.
              </label>
            </div>
          )}

          <div className="actions">
            <NewLetterButton />
            <button
              className="btn"
              type="button"
              disabled={!ready || busy}
              onClick={() => {
                updateDraft((d) => ({ bookSize: "8x8", step: d.step === "order" ? "photos" : d.step, editorStage: "photos" }));
                router.push("/letter/photos");
              }}
            >
              표지 완성 · 내지 사진 고르기 →
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function NewLetterButton() {
  return (
    <button
      className="link-btn"
      type="button"
      onClick={async () => {
        if (!confirm("새로 시작하면 지금 저장된 편지와 사진이 지워져요. 새로 시작할까요?")) return;
        await discardDraft();
        createDraft();
      }}
    >
      처음부터 새로
    </button>
  );
}
