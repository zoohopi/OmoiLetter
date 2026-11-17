"use client";

import { useRef, useState, type ReactNode } from "react";

// 쓰는 방법 팁 1~6: 탭(또는 스와이프)으로 넘기는 카드. 스크립트는 tips-script.md.
type Card = { text: ReactNode; scene: ReactNode };
const T = ({ children, d = 0 }: { children: ReactNode; d?: number }) => <span className="tip-in" style={{ animationDelay: `${d}ms` }}>{children}</span>;
const Type = ({ children, d = 0 }: { children: string; d?: number }) => <span className="tip-type" style={{ "--n": children.length, animationDelay: `${d}ms` } as React.CSSProperties}>{children}</span>;
const Formula = ({ children }: { children: ReactNode }) => <p className="tip-formula"><small>공식</small>{children}</p>;

function cards(guide: number, ex: string[]): { title: string; cards: Card[] } {
  switch (guide) {
    case 0: return { title: "1. 편지의 시작", cards: [
      { text: "편지는 받는 사람 이름부터 시작해요.", scene: <p className="tip-paper">To. 엄마</p> },
      { text: "이름 앞에 마음을 살짝 덧붙여 보세요.", scene: <p className="tip-paper">To. <Type d={300}>언제나 나를 믿어주는 우리 </Type>엄마</p> },
      { text: "이런 질문을 떠올려 보세요.", scene: <div className="tip-bubbles"><T>평소 뭐라고 부르나요?</T><T d={400}>나에게 어떤 존재인가요?</T><T d={800}>그렇게 느낀 순간은?</T></div> },
      { text: "", scene: <Formula>마음 한 마디 + 부르는 이름</Formula> },
    ] };
    case 1: return { title: "2. 서론 — 둘만 아는 일상", cards: [
      { text: "처음엔 가벼운 안부로 충분해요.", scene: <p className="tip-paper">{ex[0] || "요즘 잘 지내고 계세요?"}</p> },
      { text: "여기에 둘만 아는 일상 하나를 더해 보세요.", scene: <p className="tip-paper">{ex[0] || "요즘 잘 지내고 계세요?"}<br /><T d={300}><mark>{ex[1] || "할머니가 끓여주셨던 호박된장찌개가 문득 생각나요."}</mark></T></p> },
      { text: "두 분만 아는 사소한 이야기가 '날 생각하며 썼구나' 하는 마음을 전해요.", scene: <p className="tip-quote"><span aria-hidden="true">“</span>날 생각하며 썼구나<span aria-hidden="true">”</span></p> },
      { text: "", scene: <Formula>안부 → 둘만 아는 기억</Formula> },
    ] };
    case 2: return { title: "3. 마음 속 이야기를 가볍게 꺼내보세요", cards: [
      { text: "가장 전하고 싶은 말 하나를 골라요.", scene: <div className="tip-chips"><span className="is-picked">고마워</span><span>사랑해</span><span>미안해</span></div> },
      { text: "그 마음이 들었던 순간을 붙여요.", scene: <p className="tip-paper"><T>고3, 내가 가장 못났을 때조차 곁에 있어 줘서 </T><strong>고마워.</strong></p> },
      { text: "그때 느낀 감정으로 마무리해요.", scene: <p className="tip-paper">곁에 있어 줘서 고마워.<br /><T d={300}><mark>그때 네가 있어서 정말 안심됐어.</mark></T></p> },
      { text: "", scene: <Formula>전하고 싶은 말 → 그 순간 → 그때의 감정</Formula> },
    ] };
    case 3: return { title: "4. 지금 떠오르는 장면", cards: [
      { text: "앞에서 쓴 글을 읽다 보면 떠오르는 장면이 있나요?", scene: <div className="tip-photo is-blur" /> },
      { text: "그 모습을 자세히 그려 보세요.", scene: <><div className="tip-photo" /><T d={300}><p className="tip-caption">지쳐 있던 날, 조용히 옆에 있어 줬잖아.</p></T></> },
      { text: "가볍게 꺼낸 마음을 조금 더 깊이 전해 보세요.", scene: <><div className="tip-photo"><T d={200}><span className="tip-spark">♥</span></T></div><p className="tip-caption">그래서 그날이 나에게 소중해.</p></> },
      { text: "", scene: <Formula>장면 → 감정 → 나에게 남은 의미</Formula> },
    ] };
    case 4: return { title: "5. 마무리 - 앞으로의 약속", cards: [
      { text: "편지의 마무리는 앞으로의 약속으로 하면 좋아요.", scene: <p className="tip-paper">곁에 있어 줘서 고마워.<br /><T d={300}><mark>앞으로는 내가 너의 곁에 있을게.</mark></T></p> },
      { text: "마음에 따라 떠올려 보세요.", scene: <div className="tip-fork"><T>고마웠다면 → <strong>돌려주고 싶은 마음</strong></T><T d={400}>미안했다면 → <strong>바꾸고 싶은 행동</strong></T></div> },
      { text: "지킬 수 있는 작은 약속 하나면 돼요.", scene: <p className="tip-paper"><span className="tip-check" aria-hidden="true">✓</span><T d={200}>힘든 날엔 내가 먼저 안부를 물어볼게.</T></p> },
      { text: "", scene: <Formula>지금의 마음 → 앞으로의 작은 행동</Formula> },
    ] };
    default: return { title: "6. 맺음말 — From.", cards: [
      { text: "마지막엔 내 이름을 적어요.", scene: <p className="tip-paper tip-paper--end">From. 영주</p> },
      { text: "어떤 사람으로 남고 싶은지 함께 적어 보세요.", scene: <p className="tip-paper tip-paper--end">From. <Type d={300}>언제나 네 편이 되고 싶은 </Type>영주가</p> },
      { text: "처음부터 끝까지 읽고, 내 말 같은지 확인해요.", scene: <div className="tip-scroll"><div><p>To. 언제나 나를 믿어주는 우리 엄마</p><p>요즘 잘 지내고 계세요?</p><p>곁에 있어 줘서 고마워.</p><p>힘든 날엔 내가 먼저 안부를 물어볼게.</p><p>From. 언제나 네 편이 되고 싶은 영주가</p></div></div> },
      { text: "", scene: <Formula>남고 싶은 모습 + 내 이름</Formula> },
    ] };
  }
}

export default function TipsStory({ guide, examples, onDone }: { guide: number; examples: string[]; onDone: () => void }) {
  const { title, cards: list } = cards(guide, examples);
  const [i, setI] = useState(0);
  const start = useRef<number | null>(null);
  const go = (d: number) => { const n = i + d; if (n >= list.length) onDone(); else setI(Math.max(0, n)); };
  const last = i === list.length - 1;
  return <section className="tip-story" aria-label={`${title} 팁`} aria-roledescription="캐러셀"
    onPointerDown={e => { start.current = e.clientX; }}
    onPointerUp={e => { const s = start.current; start.current = null; if (s === null) return; const dx = e.clientX - s; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); else go(e.clientX < e.currentTarget.getBoundingClientRect().left + e.currentTarget.clientWidth / 3 ? -1 : 1); }}
    onKeyDown={e => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }} tabIndex={0}>
    <div className="tip-story__dots" aria-hidden="true">{list.map((_, n) => <span key={n} className={n === i ? "is-on" : ""} />)}</div>
    <h3>{title}</h3>
    <div key={i} className="tip-story__card" aria-live="polite">
      <div className="tip-story__scene">{list[i].scene}</div>
      {list[i].text && <p className="tip-story__text">{list[i].text}</p>}
    </div>
    <p className="tip-story__hint">{last ? "탭하면 바로 써 볼 수 있어요" : `탭해서 넘기기 · ${i + 1} / ${list.length}`}</p>
  </section>;
}
