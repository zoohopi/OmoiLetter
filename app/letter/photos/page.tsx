"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftGuard } from "@/lib/letter/guard";
import { deletePhoto, putPhoto, updateDraft, usePhotoUrl } from "@/lib/letter/store";
import { newId, prepareImage } from "@/lib/letter/image";
import PhotoPages from "@/components/letter/PhotoPages";
import { QUESTIONS } from "@/lib/letter/questions";

function PhotoThumbnail({ id, number }: { id: string; number: number }) {
  const url = usePhotoUrl(id);
  return <figure style={{ margin: 0 }}>
    {/* eslint-disable-next-line @next/next/no-img-element -- local uploaded photo preview */}
    {url && <img src={url} alt={`선택한 사진 ${number}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, display: "block" }} />}
    <figcaption style={{ textAlign: "center", fontSize: 12, paddingTop: 6 }}>{number}</figcaption>
  </figure>;
}

export default function PhotosPage() {
  const draft = useDraftGuard({ requireCover: true });
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPage, setSelectedPage] = useState(0);
  if (!draft) return null;

  async function select(files: FileList | null) {
    if (!files?.length) return;
    if ((draft?.bookPhotos?.length ?? 0) + files.length > 19) { setError("내지 사진은 최대 19장까지 넣을 수 있어요."); return; }
    setBusy(true); setError("");
    const prepared: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const { blob } = await prepareImage(file);
        const id = newId(); await putPhoto(id, blob); prepared.push(id);
      }
      updateDraft((d) => {
        const old = d.bookPhotos ?? Object.entries(d.photoByQuestion).map(([id, photoId]) => ({ id, photoId }));
        const photos = [...old, ...prepared.map((photoId) => ({ id: newId(), photoId }))];
        const letters = d.letters ?? QUESTIONS.filter((q) => d.answers[q.id]?.trim()).map((q) => ({
          id: `letter-${q.id}`, question: q.text, answer: d.answers[q.id], pageId: old.some((p) => p.id === q.id) ? q.id : null,
        }));
        return { bookPhotos: photos, photoTransforms: d.photoTransforms,
          letters: letters.map((l) => l.pageId && !photos.some((p) => p.id === l.pageId) ? { ...l, pageId: null } : l),
          step: "photos", editorStage: "photos" };
      });
      setSelectedPage(0);
    } catch {
      await Promise.all(prepared.map((id) => deletePhoto(id).catch(() => {})));
      setError("사진을 열지 못했어요. JPG나 PNG 사진으로 다시 선택해 주세요.");
    } finally { setBusy(false); }
  }

  return <main className="maker maker--compose photos-step"><div className="maker__inner maker__inner--wide">
    <h1 className="maker__title">사진으로 시작하고, 마음을 더해요</h1>
    <p className="maker__lead">내지 사진 9~19장을 먼저 넣어 책을 구성해 주세요.</p>
    {(draft.bookPhotos?.length ?? 0) < 19 && <button className="btn photos-step__pick" type="button" disabled={busy} onClick={() => input.current?.click()}>
      {busy ? "사진을 책에 넣고 있어요…" : draft.bookPhotos?.length ? "사진 추가하기" : "사진 선택하기"}
    </button>}
    <input ref={input} type="file" accept="image/*" multiple hidden disabled={busy} aria-label="내지 사진 9~19장 선택"
      onChange={(e) => { void select(e.target.files); e.target.value = ""; }} />
        {error && <p className="ph-error" role="alert">{error}</p>}
    {Boolean(draft.bookPhotos?.length) && (draft.bookPhotos?.length ?? 0) < 9 && <section aria-label="선택한 사진 미리보기">
      <p className="maker__lead">사진 {draft.bookPhotos!.length}장이 들어갔어요. {9 - draft.bookPhotos!.length}장 이상 더 넣어 주세요.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 14, maxWidth: 720, margin: "24px auto" }}>
        {draft.bookPhotos!.map((photo, i) => <PhotoThumbnail key={photo.id} id={photo.photoId} number={i + 1} />)}
      </div>
    </section>}
    {(draft.bookPhotos?.length ?? 0) >= 9 && <>
      <PhotoPages draft={draft} index={selectedPage} onSelect={setSelectedPage} />
      <div className="actions photos-step__next">
        <button className="btn" disabled={busy || !draft.bookPhotos || draft.bookPhotos.length < 9 || draft.bookPhotos.length > 19 || draft.bookPhotos.some((p) => !p.photoId)}
          onClick={() => { updateDraft(() => ({ step: "interview", editorStage: "letters" })); router.push("/letter/interview"); }}>사진 편집 완료 · 편지 쓰기 →</button>
      </div>
    </>}
  </div></main>;
}

