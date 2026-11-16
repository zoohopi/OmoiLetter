"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { InterviewProgress } from "@/lib/letter/types";
import { saveInterviewProgress } from "@/lib/letter/store";

type Turn = { question: string; answer: string };
export default function AIInterview({ question, onSave, onClose, onSelfQuestion, initialProgress }: {
  initialProgress?: InterviewProgress; question: string; onSelfQuestion: () => void; onSave: (letters: Turn[]) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const exampleAttempt = useRef<string | null>(null);
  const answerInput = useRef<HTMLTextAreaElement>(null);
  const cardPointer = useRef<{x:number;y:number}|null>(null);
  const savedSteps = useRef<Record<number, { question: string; answer: string; choices: string[] }>>(initialProgress?.savedSteps ?? {});
  const [relationship, setRelationship] = useState(initialProgress?.relationship ?? "");
  const [turns, setTurns] = useState<Turn[]>(initialProgress?.turns ?? []);
  const [choices, setChoices] = useState<string[]>(initialProgress?.choices ?? ["편지를 받는 분과 어떤 관계이고, 평소에는 뭐라고 부르나요?", "그분은 당신에게 어떤 존재인가요? 평소 부르는 호칭도 알려 주세요.", "누구에게 편지를 쓰고 싶나요? 두 분의 관계와 서로 부르는 이름을 들려주세요."]);
  const [introExamples, setIntroExamples] = useState<string[]>(initialProgress?.introExamples ?? []);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>(initialProgress?.previousQuestions ?? []);
  const [current, setCurrent] = useState(initialProgress?.current ?? "");
  const [answer, setAnswer] = useState(initialProgress?.answer ?? "");
  const [from, setFrom] = useState(initialProgress?.from ?? "");
  const [polished, setPolished] = useState<string | null>(initialProgress?.polished ?? null);
  const [stage, setStage] = useState<"relationship" | "interview" | "review" | "options" | "final">(initialProgress?.stage ?? "interview");
  const guideIndex = stage === "options" || stage === "final" ? 5 : Math.min(turns.length, 4);
  const letterText = polished ?? [turns[0] ? `To. ${turns[0].answer}` : answer ? `To. ${answer}` : "To.", ...turns.slice(1).map((turn) => turn.answer), ...(turns.length && answer.trim() ? [answer.trim()] : []), ...((stage === "options" || stage === "final" || from.trim()) ? [`From. ${from}`] : [])].join("\n\n");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => { el?.close(); };
  }, []);
  useEffect(() => {
    saveInterviewProgress({ question, relationship, turns, choices, previousQuestions, current, answer, from, polished, stage, introExamples, savedSteps:savedSteps.current });
  }, [question, relationship, turns, choices, previousQuestions, current, answer, from, polished, stage, introExamples]);
  async function request(action: "question" | "finish", nextTurns = turns, regenerate = false, mode?: "edit" | "spelling", currentAnswer = false, targetIndex?: number) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, relationship: relationship || nextTurns[0]?.answer || "관계와 호칭을 알아가는 중", turns: nextTurns, action, writingStep: Math.min(targetIndex ?? nextTurns.length, 4), edit: mode === "edit", spelling: mode === "spelling", draft: action === "finish" ? (targetIndex !== undefined ? turns[targetIndex].answer : currentAnswer ? answer.trim() : letterText) : undefined, currentAnswer, previousQuestions: regenerate ? [...previousQuestions, ...choices].slice(-24) : [] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === "question") { setTurns(nextTurns); setChoices(data.questions); if(nextTurns.length === 1) setIntroExamples(data.examples); setPreviousQuestions(regenerate ? [...previousQuestions, ...choices].slice(-24) : []); setCurrent(data.questions[0]); setStage("interview"); }
      else if (targetIndex !== undefined) { setPolished(null); setTurns(items => items.map((item,index) => index === targetIndex ? {...item,answer:data.answer} : item)); }
      else if (currentAnswer) { setPolished(null); setAnswer(data.answer); }
      else { setPolished(data.answer); }
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }
  const loadExamples = useEffectEvent(() => {
    const key = turns[0]?.answer ?? "";
    if (pending.current || exampleAttempt.current === key) return;
    exampleAttempt.current = key;
    void request("question", turns);
  });
  useEffect(() => {
    if (guideIndex === 1 && stage === "interview" && !introExamples.length && !busy) loadExamples();
  }, [guideIndex, stage, introExamples.length, busy]);
  const cardIndex = Math.max(0, choices.indexOf(current));
  function turnCard(direction: number) {
    if (busy || choices.length < 2) return;
    setCurrent(choices[(cardIndex + direction + choices.length) % choices.length]);
  }
  function recordAnswer() {
    if (pending.current || (turns.length > 0 && !choices.length && current !== "직접 작성") || !answer.trim()) return;
    if(turns.length === 0 && savedSteps.current[0]?.answer !== answer.trim()) { setIntroExamples([]); delete savedSteps.current[1]; }
    savedSteps.current[turns.length] = { question: current, answer: answer.trim(), choices };
    const next = [...turns, { question: current || (turns.length > 0 ? choices[cardIndex] : "") || "그 사람은 당신에게 어떤 존재인가요? 받는 사람을 마음을 담아 불러 주세요.", answer: answer.trim() }];
    if (!relationship) setRelationship(answer.trim().slice(0, 200));
    setPolished(null); setTurns(next); setAnswer(""); setCurrent(""); setChoices([]); setStage("review");
    if (next.length < 5) {
      const saved = savedSteps.current[next.length];
      if (saved) { setCurrent(saved.question); setAnswer(saved.answer); setChoices(saved.choices); setStage("interview"); }
      else void request("question", next);
    }
    else setStage("options");
  }
  function previousStep() {
    if (busy || !turns.length) return;
    savedSteps.current[turns.length] = { question:current, answer, choices };
    const previous = turns[turns.length - 1];
    const saved = savedSteps.current[turns.length - 1];
    setTurns(turns.slice(0, -1));
    setCurrent(previous.question);
    setAnswer(previous.answer);
    setChoices(saved?.choices ?? [previous.question]);
    setPolished(null); setStage("interview"); setError("");
  }
  return <dialog ref={dialog} className="ai-interview" aria-label="편지 인터뷰"
    onCancel={(e) => { e.preventDefault(); if (!busy && confirm("인터뷰를 닫을까요? 작성한 내용은 저장되어 다음에 이어 쓸 수 있어요.")) onClose(); }}>
    <header className="ai-interview__header">{stage === "relationship" && <h2 id="relationship-title">편지를 받는 분과 어떤 관계인가요?</h2>}<button className="ai-interview__close" aria-label="인터뷰 닫기" type="button" disabled={busy} onClick={() => {
      if (confirm("인터뷰를 닫을까요? 작성한 내용은 저장되어 다음에 이어 쓸 수 있어요.")) onClose();
    }}>×</button></header>
    {turns.length === 0 ? <aside className="ai-writing-start">
      <h3>1. 편지의 시작</h3>
      <div className="ai-writing-start__examples" aria-label="마음을 덧붙이기 전과 후">
        <p><span>아빠에게</span><span aria-hidden="true">→</span><strong>늘 내 편이 되어주는 아빠에게</strong></p>
        <p><span>To. 엄마</span><span aria-hidden="true">→</span><strong>To. 언제나 나를 믿어주는 우리 엄마</strong></p>
      </div>
      <p>편지는 <strong>To. 받는 사람</strong>이 누구인지 적는 것부터 시작해요.</p>
      <p>이름 앞에 그 사람을 향한 마음을 살짝 덧붙여 보세요.</p>
      <ul><li>평소 그 사람을 뭐라고 부르나요?</li><li>그 사람은 당신에게 어떤 존재인가요?</li><li>그렇게 느꼈던 순간이 있나요?</li></ul>
    </aside> : guideIndex === 1 ? <aside className="ai-writing-start">
      <h3>2. 서론 - 둘만 아는 일상으로 말 걸기</h3>
      <p>처음부터 깊은 마음을 꺼내지 않아도 괜찮아요.<br />평소 대화하듯 가벼운 안부로 시작해 보세요.</p>
      {introExamples[0] && <blockquote>{introExamples[0]}</blockquote>}
      <p>여기에 <strong>둘만 아는 일상이나 기억 하나</strong>를 덧붙여 보세요. 받는 분이 둘만의 추억이 회상되며 편지가 읽기가 더 즐겁습니다.</p>
      {introExamples[1] && <blockquote>{introExamples[1]}</blockquote>}
      <small>받는 분에 맞춘 예시예요. 실제 추억에 맞게 바꿔 써 주세요.</small>
      {!introExamples.length && <p role="status">{busy ? "받는 분에 맞는 예시를 준비하고 있어요…" : "예시를 불러오지 못했어요. 아래 질문 다시 받기로 재시도할 수 있어요."}</p>}
      <p>핵심은 <strong>이 편지가 누구에게나 보낼 수 있는 글이 아니라는 느낌</strong>을 처음부터 주는 거예요.</p>
    </aside> : guideIndex === 2 ? <aside className="ai-writing-start">
      <h3>3. 본론 — 꼭 전하고 싶은 마음</h3>
      <p>이번 편지에서 가장 전하고 싶은 말은 무엇인가요?<br />고마워, 사랑해, 미안해처럼 짧은 말부터 시작해 보세요.</p>
      <blockquote>고3, 내가 가장 못났을 때조차도 내 곁에 있어 줘서 고마워.</blockquote>
      <p>여기에 <strong>그 마음이 들었던 순간</strong>을 덧붙여 보세요.</p>
      <blockquote>자존감이 바닥이고 그 기간이 짧지 않았는데 옆에 있어 줬잖아.</blockquote>
      <p>마지막으로 <strong>그때 느낀 마음</strong>을 전해 보세요.</p>
      <blockquote>그때는 표현을 못 했지만, 자기가 옆에 있어 많이 안심됐어.</blockquote>
      <p><strong>전하고 싶은 말 → 그 마음이 들었던 순간 → 그때의 감정</strong></p>
      <p>이 세 가지가 이어지면, 짧은 말에도 당신만의 마음이 담깁니다.</p>
    </aside> : guideIndex === 3 ? <aside className="ai-writing-start">
      <h3>4. 마음에 남은 장면을 더해요</h3>
      <p>둘만 아는 장면 하나를 떠올려 보세요.<br />그때 무슨 일이 있었고, 어떤 마음이 들었나요?</p>
      <blockquote>내가 지쳐 있던 날 조용히 옆에 있어 줬잖아.<br />그때 정말 안심이 됐어.</blockquote>
      <p>그 일이 <strong>나에게 왜 소중했는지</strong> 덧붙여 보세요.</p>
      <p className="ai-writing-start__hint">앞에서 이미 이야기했다면, 그 기억이 남긴 의미만 더해도 좋아요.</p>
      <p><strong>기억에 남은 장면 → 그때의 감정 → 나에게 남은 의미</strong></p>
    </aside> : guideIndex === 4 ? <aside className="ai-writing-start">
      <h3>5. 결론 — 앞으로의 마음을 약속해요</h3>
      <p>전한 마음을 앞으로 어떻게 보여 주고 싶나요?<br />지킬 수 있는 작은 약속 하나를 적어 보세요.</p>
      <blockquote>나도 네가 힘든 날 먼저 안부를 물어볼게.</blockquote>
      <p>고마웠다면 <strong>돌려주고 싶은 마음</strong>을,<br />미안했다면 <strong>바꾸고 싶은 행동</strong>을 떠올려 보세요.</p>
      <p><strong>지금의 마음 → 앞으로 보여 줄 작은 행동</strong></p>
    </aside> : <aside className="ai-writing-start">
      <h3>6. 맺음말 — 어떤 나로부터</h3>
      <p>그 사람에게 어떤 사람으로 남고 싶나요?<br />마지막에는 그 마음과 내 이름을 함께 적어 주세요.</p>
      <blockquote>From. 언제나 네 편이 되고 싶은 영주가</blockquote>
      <p><strong>곁에 있고 싶은 모습 → 보내는 사람의 이름</strong></p>
      <p className="ai-writing-start__hint">To.부터 마지막 줄까지 읽어 보세요.<br />내 말처럼 느껴지는지 확인하고, 원하는 경우에만 다듬어요.</p>
    </aside>}
    {question !== "전하고 싶은 마음" && <p className="ai-interview__topic">{question}</p>}

    {stage === "relationship" && <form onSubmit={(e) => { e.preventDefault(); void request("question"); }}>
      <label aria-labelledby="relationship-title">
        <textarea value={relationship} maxLength={200} onChange={(e) => setRelationship(e.target.value)} placeholder="예: 3년을 함께한 연인에게 생일 편지를 쓰고 싶어요." required />
      </label>
      <div className="ai-interview__start-actions">
        <button className="btn" disabled={busy || !relationship.trim()}>인터뷰 시작하기</button>
        <button type="button" className="account-text-link" disabled={busy} onClick={onSelfQuestion}>나에게 스스로 질문하기 +</button>
      </div>
    </form>}
    {stage === "interview" && <form onSubmit={(e) => { e.preventDefault(); recordAnswer(); }}>
      {turns.length > 0 && <><section className="ai-question-deck" aria-label="질문 카드" aria-roledescription="캐러셀">
        <p className="ai-question-deck__label">마음에 닿는 질문을 골라 주세요.</p>
        <div className="ai-question-deck__stack" tabIndex={0} aria-label="좌우 방향키로 질문 넘기기"
          onKeyDown={e => { if(e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); turnCard(e.key === "ArrowLeft" ? -1 : 1); } }}
          onPointerDown={e => { if(busy || e.button !== 0) return; cardPointer.current={x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerUp={e => { const start=cardPointer.current; cardPointer.current=null; if(!start)return; const dx=e.clientX-start.x,dy=e.clientY-start.y; if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy))turnCard(dx<0?1:-1); }}
          onPointerCancel={() => {cardPointer.current=null;}}>
          {choices.length > 1 && <><span className="ai-question-deck__back ai-question-deck__back--left" aria-hidden="true" /><span className="ai-question-deck__back ai-question-deck__back--right" aria-hidden="true" /></>}
          <div key={choices[cardIndex]} className="ai-question-deck__front" aria-live="polite"><small>QUESTION {String(cardIndex+1).padStart(2,"0")}</small><p>{choices[cardIndex]}</p></div>
        </div>
        <div className="ai-question-deck__navigation">
          <button type="button" disabled={busy || choices.length<2} aria-label="이전 질문" onClick={() => turnCard(-1)}>←</button>
          <span>{cardIndex+1} / {choices.length}</span>
          <button type="button" disabled={busy || choices.length<2} aria-label="다음 질문" onClick={() => turnCard(1)}>→</button>
        </div>
      </section>
      <div className="ai-question-actions">
        <button type="button" className="ai-question-refresh" disabled={busy} onClick={() => void request("question", turns, true)}>↻ 질문 다시 받기</button>
        <button type="button" className="ai-question-direct" disabled={busy} aria-pressed={current === "직접 작성"} onClick={() => { setCurrent("직접 작성"); answerInput.current?.focus(); answerInput.current?.scrollIntoView({block:"center", behavior:"smooth"}); }}>내가 직접 쓰기</button>
      </div></>}
      {(turns.length === 0 || answer.trim()) && <section className="ai-letter-live ai-letter-live--opening" aria-label="현재 작성 중인 내용"><p>{turns.length === 0 ? `To. ${answer}` : answer}</p></section>}
      <label>{turns.length === 0 ? "받는 분께 전하고 싶은 호칭을 적어 주세요." : "편지에 담고 싶은 말을 적어 주세요."}<textarea ref={answerInput} placeholder={turns.length === 0 ? "예: 무엇과도 바꿀 수 없는 소중한 오빠에게" : "지금 떠오르는 말 그대로 적어 주세요."} value={answer} maxLength={1500} onChange={(e) => { setPolished(null); setAnswer(e.target.value); }} required autoFocus /></label>
      <div className="ai-answer-tools">
        <button type="button" disabled={busy || !answer.trim()} onClick={() => void request("finish", turns, false, "edit", true)}><span aria-hidden="true">✧</span> AI 작가 첨삭</button>
        <button type="button" disabled={busy || !answer.trim()} onClick={() => void request("finish", turns, false, "spelling", true)}><span aria-hidden="true">✓</span> 맞춤법 검사</button>
      </div>
      <div className="ai-step-navigation"><button type="button" className="ai-answer-back" disabled={busy || !turns.length} onClick={previousStep}>← 이전으로</button>
      <button className="btn ai-answer-next" disabled={busy || (turns.length > 0 && !choices.length && current !== "직접 작성") || !answer.trim()}>다음으로 <span aria-hidden="true">→</span></button></div>
    </form>}
    {stage === "interview" && turns.length > 0 && <button type="button" className="ai-review__finish" disabled={busy} onClick={() => setStage("options")}>인터뷰 마무리<span aria-hidden="true">→</span></button>}
    {stage === "review" && <div className="ai-review">
      <p>{busy ? "다음 질문을 준비하고 있어요." : "답변은 저장했어요. 다음 질문을 다시 불러와 주세요."}</p>
      <div className="ai-interview__actions">
        {turns.length < 5 && <button type="button" className="ai-review__more" disabled={busy} onClick={() => void request("question")}><span aria-hidden="true">＋</span>다음 질문 다시 불러오기</button>}

      </div>
      <button type="button" className="ai-review__finish" disabled={busy} onClick={() => setStage("options")}>인터뷰 마무리<span aria-hidden="true">→</span></button>
    </div>}
    {(stage === "options" || stage === "final") && <section className="ai-letter-pages" aria-label="질문별 편지 확인">
      <p className="ai-letter-pages__intro">질문 하나가 편지 한 장이 돼요.<br />각 편지를 확인한 뒤 원하는 책 페이지에 배치해 주세요.</p>
      {turns.map((turn,index) => <article className="ai-letter-page" key={index}>
        <small>편지 {index+1}</small>
        <h4>{index === 0 ? "To. 받는 분께" : turn.question}</h4>
        <label>편지 내용<textarea value={turn.answer} disabled={busy} onChange={e => {setPolished(null); setTurns(items => items.map((item,i) => i === index ? {...item,answer:e.target.value} : item));}} /></label>
        <p className={turn.answer.length > 500 ? "ph-error" : ""}>{turn.answer.length} / 500자</p>
        <div className="ai-answer-tools">
          <button type="button" disabled={busy || !turn.answer.trim()} onClick={() => void request("finish", turns, false, "edit", true, index)}>✧ AI 작가 첨삭</button>
          <button type="button" disabled={busy || !turn.answer.trim()} onClick={() => void request("finish", turns, false, "spelling", true, index)}>✓ 맞춤법 검사</button>
        </div>
      </article>)}
      <article className="ai-letter-page">
        <small>편지 {turns.length+1}</small><h4>From. 보내는 마음</h4>
        <label>보내는 분의 문구<input value={from} disabled={busy} maxLength={100} placeholder="예: 언제나 네 편이 되고 싶은 영주가" onChange={e => {setPolished(null);setFrom(e.target.value);}} /></label>
      </article>
      <div className="ai-step-navigation">
        <button type="button" className="ai-answer-back" disabled={busy} onClick={previousStep}>← 이전으로</button>
        <button className="btn ai-answer-next" disabled={busy || !turns.length || !from.trim() || turns.some(turn => !turn.answer.trim() || turn.answer.length > 500)} onClick={() => onSave([...turns.map((turn,index) => ({question:index === 0 ? "To." : turn.question,answer:turn.answer.trim()})), {question:"From.",answer:from.trim()}])}>확인 · 편지 {turns.length+1}장 만들기</button>
      </div>
    </section>}

    {busy && <p role="status">이야기를 읽고 있어요…</p>}
    {error && <p role="alert" className="ph-error">{error}</p>}
  </dialog>;
}







