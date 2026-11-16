"use client";

import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDraftGuard } from "@/lib/letter/guard";
import { updateDraft } from "@/lib/letter/store";
import { newId } from "@/lib/letter/image";
import { QUESTIONS } from "@/lib/letter/questions";
import useLetterDrag from "@/lib/letter/useLetterDrag";
import BookPage from "@/components/letter/BookPage";
import ScaledPage from "@/components/letter/ScaledPage";
import PhotoPages from "@/components/letter/PhotoPages";

import AIInterview from "@/components/letter/AIInterview";
import LetterComposer from "@/components/letter/LetterComposer";

export default function WritePage() {
  const draft = useDraftGuard({ requireCover: true });
  const router = useRouter();
  const isPlacement = usePathname() === "/letter/letters";
  const busy = false;
  const cardPress=useRef<{id:string;x:number;y:number}|null>(null);
  const suppressOpen=useRef(0);
  const [activeLetterId, setActiveLetterId] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [placementMessage,setPlacementMessage]=useState("");
  const drag=useLetterDrag((letterId,pageId)=>placeLetter(letterId,pageId));
  if (!draft) return null;

  const legacy = !draft.bookPhotos;
  const legacyEntries = Object.entries(draft.photoByQuestion).map(([id, photoId]) => ({ id, photoId }));
  const photos = draft.bookPhotos ?? legacyEntries;
  const letters = draft.letters ?? QUESTIONS.filter((q) => draft.answers[q.id]?.trim()).map((q) => ({
    id: `letter-${q.id}`, question: q.text, answer: draft.answers[q.id], pageId: photos.some((p) => p.id === q.id) ? q.id : null,
  }));
  const validCount = photos.length >= 9 && photos.length <= 19 && photos.every((p) => p.photoId);
  // Also migrates existing photo/question work without removing its source data.
  const save = (change: Parameters<typeof updateDraft>[0]) => updateDraft((d) => {
    const base = { ...d, bookPhotos: d.bookPhotos ?? photos, letters: d.letters ?? letters };
    return { bookPhotos: base.bookPhotos, letters: base.letters, ...change(base) };
  });

  function addLetter(question: string) {
    const id = newId();
    save((d) => ({ letters: [...d.letters!, { id, question, answer: "", pageId: null }] }));
    setActiveLetterId(id);
  }
  const activeLetter = letters.find((l) => l.id === activeLetterId);
  function closeLetter() {
    if (activeLetter && !activeLetter.question.trim() && !activeLetter.answer.trim())
      save((d) => ({ letters: d.letters!.filter((l) => l.id !== activeLetterId) }));
    if (activeLetter?.pageId) { const n = photos.findIndex((p) => p.id === activeLetter.pageId); if (n >= 0) setCursor(n); }
    setActiveLetterId(null);
  }

  function placeLetter(letterId:string,pageId:string) {
    const letter=letters.find(l=>l.id===letterId);
    if(!letter?.question.trim()||!letter.answer.trim()||!photos.some(p=>p.id===pageId))return;
    save(d=>({letters:d.letters!.map(l=>l.id===letterId?{...l,pageId}:l.pageId===pageId?{...l,pageId:null}:l)}));
    const n=photos.findIndex(p=>p.id===pageId);setCursor(n);drag.setPlacingId(null);drag.setHoverId(null);
    setPlacementMessage(`내지 ${n+1}쪽에 편지를 넣었어요.`);
  }
  const ready = validCount && letters.some((l) => l.question.trim() && l.answer.trim() && photos.some((p) => p.id === l.pageId));

  return <main className={`maker maker--compose letter-stage${isPlacement ? "" : " letter-stage--interview"}`}><div className="maker__inner maker__inner--wide">
    <p className="eyebrow">{isPlacement ? "STEP 4 · 편지" : "STEP 3 · 인터뷰"}</p>
    <h1 className="maker__title">{isPlacement ? "편지로 마음을 전해요" : "인터뷰로 마음을 꺼내요"}</h1>
    <p className="maker__lead">{isPlacement ? "작성한 편지를 원하는 페이지에 넣어 주세요." : "인터뷰를 통해 전하고 싶은 마음을 천천히 풀어보세요."}</p>
    {legacy && photos.length > 0 && <p className="compose-note">이전에 넣은 사진과 답변을 불러왔어요. 이어서 편집할 수 있어요.</p>}

    {!isPlacement && <div className="actions" style={{ justifyContent: "center" }}><button className="btn" type="button" onClick={() => setAiQuestion("전하고 싶은 마음")}>인터뷰하기</button></div>}


    {isPlacement && letters.length > 0 && <section className="chosen-letters" aria-label="뽑아 둔 편지지">
      <h2>뽑아 둔 편지지 <span>{letters.length}</span></h2>
      <p className="letter-drop-help">작성한 편지지를 아래 원하는 페이지로 끌어다 놓아 주세요.</p>
      <div className="letter-placement-work">
        <aside className="letter-tray" aria-label="내 편지 보관함">
          <div className="letter-tray__header"><span className="letter-tray__envelope" aria-hidden="true">✉</span><span>뽑아 둔 마음<small>MY LITTLE LETTERS</small></span><span className="letter-tray__count">{letters.length}</span></div>
          <p className="letter-tray__hint">한 장씩, 마음을 옮겨요.</p>
          <div className="chosen-letters__list">{letters.map((letter,i)=>{
          const complete=Boolean(letter.question.trim()&&letter.answer.trim());
          return <article className={`chosen-letter chosen-letter--sheet ${letter.pageId?"is-placed":""} ${drag.placingId===letter.id?"is-dragging":""}`} key={letter.id}
            draggable={false} onDragStart={e=>e.preventDefault()}
            onPointerDown={e=>{if(!complete||e.pointerType==="touch"||(e.target as HTMLElement).closest(".letter-drag-handle,.chosen-letter__remove,.chosen-letter__placement,.chosen-letter__unplace"))return;cardPress.current={id:letter.id,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
            onPointerMove={e=>{if(drag.ghost){drag.move(e);return;}const press=cardPress.current;if(press?.id===letter.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>6){suppressOpen.current=Date.now()+700;drag.start(e,letter.id);}}}
            onPointerUp={e=>{if(drag.ghost){suppressOpen.current=Date.now()+700;drag.end(e);}else if(cardPress.current?.id===letter.id){setActiveLetterId(letter.id);suppressOpen.current=Date.now()+700;}cardPress.current=null;}}
            onPointerCancel={e=>{drag.end(e,true);cardPress.current=null;}}>
            <button type="button" className="chosen-letter__open" onClick={()=>{if(Date.now()>suppressOpen.current)setActiveLetterId(letter.id);}} aria-label={`편지 ${i+1} 이어 쓰기`}>
              <div className={`chosen-letter__thumbnail ${letter.pageId?"is-folded":""}`}>
                {letter.pageId ? <div className="folded-letter" role="img" aria-label="반으로 접힌 편지 · 배치 완료">
                  <span className="folded-letter__back" aria-hidden="true" />
                  <span className="folded-letter__paper" aria-hidden="true"><span>{letter.question}</span></span>
                  <span className="folded-letter__flap" aria-hidden="true"><small>OMOI LETTER</small></span>
                  <span className="folded-letter__crease" aria-hidden="true" />
                  <span className="folded-letter__stamp" key={letter.pageId}><b>배치 완료</b><small>PLACED WITH CARE</small></span>
                </div> : <ScaledPage><BookPage page={{kind:"leaf",side:"left",layout:"portrait",no:i+1,photoId:null,question:letter.question||"나에게 질문하기",answer:letter.answer||"마음을 적어 주세요.",photoPage:true}}
                  design={draft.design} size={draft.bookSize} recipientName={draft.recipientName} anniversaryDate={draft.anniversaryDate} /></ScaledPage>}
              </div>
            </button>
            <div className="chosen-letter__placement">
              <button type="button" className="letter-drag-handle" aria-label={`편지 ${i+1} 드래그`} disabled={!complete}
                onPointerDown={e=>drag.start(e,letter.id)} onPointerMove={drag.move} onPointerUp={e=>drag.end(e)} onPointerCancel={e=>drag.end(e,true)}><span className="letter-grip" aria-hidden="true">{Array.from({length:6},(_,n)=><i key={n}/>)}</span>살짝 잡아 옮기기</button>
            </div>
            <div className="chosen-letter__bottom-row">
              <span className="chosen-letter__status">{letter.pageId?`${photos.findIndex(p=>p.id===letter.pageId)+1}쪽에 배치됨`:complete?"아직 배치 전":"이어서 작성하기"}</span>
              {letter.pageId && <button type="button" className="chosen-letter__remove" aria-label={`편지 ${i+1} 페이지 배치 해제`} title="편지를 빼고 사진 페이지로 되돌리기" onClick={() => {
                save(d => ({ letters:d.letters!.map(item => item.id === letter.id ? {...item,pageId:null} : item) }));
                drag.setPlacingId(null); drag.setHoverId(null);
                setPlacementMessage("편지를 페이지에서 뺐어요. 작성한 편지는 보관하고, 페이지에는 사진만 보여요.");
              }}>삭제</button>}
            </div>
          </article>;
        })}</div></aside>
        <section className={`letter-book-preview ${drag.placingId?"is-placing":""}`} aria-label="편지 넣을 페이지">
          <h2>편지 넣을 페이지</h2>
          <p className="letter-drop-status" role="status">{placementMessage||"원하는 페이지 위에 편지지를 놓아 주세요."}</p>
          <PhotoPages draft={{...draft,bookPhotos:photos,letters}} index={cursor} onSelect={setCursor} editable={false}
            placingLetterId={drag.placingId} dropPageId={drag.hoverId} onPlaceLetter={placeLetter} onDropHover={drag.setHoverId} />
        </section>
      </div>
    </section>}
    {drag.ghost && createPortal(<div className="letter-drag-ghost letter-drag-ghost--cute" style={{left:drag.ghost.x+12,top:drag.ghost.y-30}}><span>“</span>{letters.find(l=>l.id===drag.ghost?.id)?.question}</div>,document.body)}
    {aiQuestion && <AIInterview initialProgress={draft.interviewProgress} question={aiQuestion} onSelfQuestion={() => { setAiQuestion(null); addLetter(""); }} onClose={() => setAiQuestion(null)} onSave={(pages) => {
      save((d) => ({ letters: [...d.letters!, ...pages.map(page => ({ id:newId(), question:page.question, answer:page.answer, pageId:null }))], step: "letters", interviewProgress: undefined }));
      setAiQuestion(null);
      router.push("/letter/letters");
    }} />}
    {activeLetter && <LetterComposer key={activeLetter.id} letter={activeLetter}
      change={(patch) => save((d) => ({ letters: d.letters!.map((l) => l.id === activeLetter.id ? { ...l, ...patch } : l) }))}
      close={closeLetter} />}
    <div className="actions" style={{ justifyContent: "center" }}>
      <button className={isPlacement ? "btn" : "interview-next-link"} disabled={busy || (isPlacement ? !ready : !letters.some((letter) => letter.answer.trim()))} onClick={() => {
        save(() => ({ step: isPlacement ? "preview" : "letters" }));
        router.push(isPlacement ? "/letter/preview" : "/letter/letters");
      }}>{isPlacement ? "편지책 전체 미리보기 →" : "인터뷰 완료 · 편지 배치하기 →"}</button>

    </div>
    {isPlacement && !ready && <p className="compose-note">편지를 작성한 뒤 원하는 페이지에 끌어다 놓아 주세요.</p>}
  </div></main>;
}



