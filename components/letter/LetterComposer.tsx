"use client";

import { useEffect, useRef } from "react";
import { MAX_ANSWER_LENGTH } from "@/lib/letter/rules";
import type { Draft } from "@/lib/letter/types";

type Letter = NonNullable<Draft["letters"]>[number];
export default function LetterComposer({ letter, change, close }: { letter: Letter; change: (patch: Partial<Letter>) => void; close: () => void }) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=dialog.current;if(!el)return;el.showModal();const before=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{el.close();document.body.style.overflow=before;};},[]);
  return <dialog className="letter-composer letter-composer--book" ref={dialog} aria-labelledby="letter-composer-title" onCancel={e=>{e.preventDefault();close();}}>
    <div className="letter-composer__top"><span id="letter-composer-title">한 페이지의 질문과 답변</span><button type="button" aria-label="편지지 닫기" onClick={close}>닫기 ×</button></div>
    <div className="letter-writing-sheet">
      <span className="letter-writing-sheet__brand">A Letter for You</span>
      <span className="letter-writing-sheet__quote" aria-hidden="true">“</span>
      <label className="letter-writing-sheet__question">질문
        <textarea aria-label="편지지 질문" value={letter.question} maxLength={200} autoFocus={!letter.question} placeholder="나에게 질문해 보세요." onChange={e=>change({question:e.target.value})} />
      </label>
      <label className="letter-writing-sheet__answer">답변
        <textarea aria-label="편지지 내용" value={letter.answer} maxLength={MAX_ANSWER_LENGTH} autoFocus={Boolean(letter.question)} placeholder="마음을 천천히 적어 주세요." onChange={e=>change({answer:e.target.value})} />
      </label>
      <span className="letter-writing-sheet__footer">OMOI LETTER</span>
    </div>
    <div className="letter-composer__bottom"><p>{letter.answer.length} / {MAX_ANSWER_LENGTH}자 · 자동 저장</p><button className="btn btn--small" type="button" disabled={!letter.question.trim()||!letter.answer.trim()} onClick={close}>작성 완료 · 뽑아 둔 편지지로</button></div>
  </dialog>;
}
