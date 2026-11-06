"use client";

import { useRef, useState, type CSSProperties } from "react";
import { QUESTIONS } from "@/lib/letter/questions";

export default function QuestionShelf({ onPick }: { onPick: (question: string) => void }) {
  const [active, setActive] = useState(0);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(0);
  const wheelTime = useRef(0);
  const turn = (delta: number) => setActive((n) => (n + delta + QUESTIONS.length) % QUESTIONS.length);
  return <section className="question-shelf" aria-label="돌려 보는 질문 편지지">
    <svg width="0" height="0" aria-hidden="true" style={{position:"absolute",pointerEvents:"none"}}><defs>
      <filter id="omoi-logo-blue" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0.25098 0 0 0 0 0.403922 0 0 0 0 0.627451 1.2756 4.2912 0.4332 0 -3" />
      </filter>
    </defs></svg>
    <p className="question-shelf__intro">마음에 닿는 질문을 한 장 뽑아 보세요.</p>
    <div className="question-shelf__stage" tabIndex={0} aria-label="질문 편지지 탐색. 좌우 방향키 또는 옆으로 밀어서 넘기기"
      onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); turn(e.key === "ArrowLeft" ? -1 : 1); } }}
      onPointerDown={(e) => { pointer.current = { x: e.clientX, y: e.clientY }; }}
      onPointerMove={(e) => {
        const start = pointer.current; if (!start) return;
        const dx = e.clientX-start.x, dy = e.clientY-start.y;
        if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)*1.4) {
          turn(dx > 0 ? -1 : 1); pointer.current = null; suppressClick.current = Date.now()+450;
        }
      }} onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }}
      onWheel={(e) => {
        const delta = Math.abs(e.deltaX)>Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
        if (Math.abs(delta)>18 && Date.now()-wheelTime.current>250) { turn(delta>0?1:-1); wheelTime.current=Date.now(); }
      }}>
      <div className="question-shelf__rail" aria-hidden="true" />
      {QUESTIONS.map((q,i) => {
        let offset = (i-active+QUESTIONS.length)%QUESTIONS.length;
        if (offset>QUESTIONS.length/2) offset-=QUESTIONS.length;
        const isActive=offset===0;
        return <button key={q.id} type="button" className={`question-paper ${isActive ? "is-front" : ""}`} tabIndex={isActive?0:-1}
          aria-label={`${q.text}${isActive ? " — 편지지 뽑기" : " — 가운데로 보기"}`} aria-current={isActive ? "true" : undefined}
          style={{ "--offset":offset, "--sign":Math.sign(offset), "--turn":isActive?"-5deg":`${offset>0?-77:77}deg`, "--tilt":isActive?"-3deg":"0deg", zIndex:100-Math.abs(offset)*10 } as CSSProperties}
          onClick={() => { if(Date.now()<suppressClick.current)return; if(isActive)onPick(q.text);else setActive(i); }}>
          <span className="question-paper__edge" aria-hidden="true" />
          <span className="question-paper__face" data-long-question={q.text.length > 28}>
            <span className="question-paper__meta question-paper__logo-oval"><span className="question-paper__logo-mark" role="img" aria-label="Omoi Letter 메인 로고 · FROM · TO · Unspoken feelings, bound into a book of letters." /></span>
            <span className="question-paper__question">{q.text}</span>
            <span className="question-paper__footer">{isActive ? "이 편지지 뽑기 ↗" : "마음을 담는 질문"}</span>
          </span>
        </button>;
      })}
    </div>
    <div className="question-shelf__navigation">
      <button type="button" className="question-shelf__arrow" aria-label="이전 질문" onClick={()=>turn(-1)}>←</button>
      <p aria-live="polite" aria-atomic="true"><span>{QUESTIONS[active].flow}</span> {String(active+1).padStart(2,"0")} / {String(QUESTIONS.length).padStart(2,"0")}</p>
      <button type="button" className="question-shelf__arrow" aria-label="다음 질문" onClick={()=>turn(1)}>→</button>
    </div>

  </section>;
}

