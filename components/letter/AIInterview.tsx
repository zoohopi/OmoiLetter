"use client";
import { useEffect, useRef, useState } from "react";
import type { InterviewProgress } from "@/lib/letter/types";
import { saveInterviewProgress } from "@/lib/letter/store";
import LetterPaperPicker from "./LetterPaperPicker";
import TipsStory from "./TipsStory";

type Turn = { question: string; answer: string };
// 한 통으로 모은 편지를 300자 기준으로 나눈다. 마지막에 남는 짧은 글은 앞 장에 붙인다(700자 → 300 + 400).
const PAGE_CHARS = 300;
function splitPages(text: string) {
  const pages: string[] = [];
  let rest = text.trim();
  for (let n = Math.max(1, Math.floor(rest.length / PAGE_CHARS)); n > 1; n--) {
    const space = Math.max(rest.lastIndexOf("\n", PAGE_CHARS), rest.lastIndexOf(" ", PAGE_CHARS));
    const cut = space > PAGE_CHARS * .7 ? space : PAGE_CHARS; // 가능하면 띄어쓰기/줄바꿈에서 자른다
    pages.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
  }
  pages.push(rest);
  return pages;
}

export default function AIInterview({ question, onSave, onClose, onSelfQuestion, initialProgress }: {
  initialProgress?: InterviewProgress; question: string; onSelfQuestion: () => void; onSave: (letters: Turn[], paper: 1 | 2 | 3) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const answerInput = useRef<HTMLTextAreaElement>(null);
  const cardPointer = useRef<{x:number;y:number}|null>(null);
  const savedSteps = useRef<Record<number, { question: string; answer: string; choices: string[] }>>(initialProgress?.savedSteps ?? {});
  const [showDeck, setShowDeck] = useState(false);
  const [paper, setPaper] = useState<1 | 2 | 3 | null>(initialProgress?.paper ?? null); // 편지 속지
  const [full, setFull] = useState<string | null>(null); // 전체 확인에서 고친 한 통의 편지
  // 2장에 들어올 때마다 "인터뷰 질문" 버튼을 알려 주는 안내
  const [deckCoach, setDeckCoach] = useState(true); // AI 질문 카드는 버튼을 눌러야 펼친다
  const [relationship, setRelationship] = useState(initialProgress?.relationship ?? "");
  const [turns, setTurns] = useState<Turn[]>(initialProgress?.turns ?? []);
  const [choices, setChoices] = useState<string[]>(initialProgress?.choices ?? ["편지를 받는 분과 어떤 관계이고, 평소에는 뭐라고 부르나요?", "그분은 당신에게 어떤 존재인가요? 평소 부르는 호칭도 알려 주세요.", "누구에게 편지를 쓰고 싶나요? 두 분의 관계와 서로 부르는 이름을 들려주세요."]);
  const [introExamples, setIntroExamples] = useState<string[]>(initialProgress?.introExamples ?? []);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>(initialProgress?.previousQuestions ?? []);
  const [current, setCurrent] = useState(initialProgress?.current ?? "");
  const [answer, setAnswer] = useState(initialProgress?.answer ?? "");
  const [from, setFrom] = useState(initialProgress?.from ?? "");
  const [polished, setPolished] = useState<string | null>(initialProgress?.polished ?? null);
  const [stage, setStage] = useState<"relationship" | "interview" | "review" | "from" | "options" | "paper" | "final">(initialProgress?.stage ?? "interview");
  const guideIndex = stage === "from" || stage === "options" || stage === "final" ? 5 : Math.min(turns.length, 4);
  const letterText = polished ?? [turns[0] ? `To. ${turns[0].answer}` : answer ? `To. ${answer}` : "To.", ...turns.slice(1).map((turn) => turn.answer), ...(turns.length && answer.trim() ? [answer.trim()] : []), ...((stage === "options" || stage === "final" || from.trim()) ? [`From. ${from}`] : [])].join("\n\n");
  const fullLetter = full ?? [turns[0] ? `To. ${turns[0].answer}` : "", ...turns.slice(1).map(turn => turn.answer), from.trim() ? `From. ${from.trim()}` : ""].filter(Boolean).join("\n\n");
  const pages = splitPages(fullLetter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => { el?.close(); };
  }, []);
  // 글자마다 저장하면 앱 전체가 다시 그려져 입력이 멈칫한다 → 입력이 잠깐 멈췄을 때 저장하고, 닫힐 때 마지막 내용을 저장한다.
  const latestProgress = useRef<() => void>(() => {});
  useEffect(() => {
    latestProgress.current = () => saveInterviewProgress({ paper:paper??undefined, question, relationship, turns, choices, previousQuestions, current, answer, from, polished, stage, introExamples, savedSteps:savedSteps.current });
    const timer = setTimeout(() => latestProgress.current(), 700);
    return () => clearTimeout(timer);
  }, [paper, question, relationship, turns, choices, previousQuestions, current, answer, from, polished, stage, introExamples]);
  const finished = useRef(false); // 편지를 만든 뒤엔 진행 상황을 다시 쓰지 않는다
  useEffect(() => () => { if (!finished.current) latestProgress.current(); }, []);
  async function request(action: "question" | "finish", nextTurns = turns, regenerate = false, mode?: "edit" | "spelling", currentAnswer = false, targetIndex?: number) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, relationship: relationship || nextTurns[0]?.answer || "관계와 호칭을 알아가는 중", turns: nextTurns, action, writingStep: targetIndex === -1 ? 4 : Math.min(targetIndex ?? nextTurns.length, 4), edit: mode === "edit", spelling: mode === "spelling", draft: action === "finish" ? (targetIndex === -1 ? fullLetter : targetIndex !== undefined ? turns[targetIndex].answer : currentAnswer ? answer.trim() : letterText) : undefined, currentAnswer, previousQuestions: regenerate ? [...previousQuestions, ...choices].slice(-24) : [] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === "question") { setTurns(nextTurns); setChoices(data.questions); if(nextTurns.length === 1) setIntroExamples(data.examples); setPreviousQuestions(regenerate ? [...previousQuestions, ...choices].slice(-24) : []); setCurrent(c => c === "직접 작성" ? c : data.questions[0]); setStage("interview"); }
      else if (targetIndex === -1) { setFull(data.answer); }
      else if (targetIndex !== undefined) { setPolished(null); setTurns(items => items.map((item,index) => index === targetIndex ? {...item,answer:data.answer} : item)); }
      else if (currentAnswer) { setPolished(null); setAnswer(data.answer); }
      else { setPolished(data.answer); }
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }
  const cardIndex = Math.max(0, choices.indexOf(current));
  function turnCard(direction: number) {
    if (busy || choices.length < 2) return;
    setCurrent(choices[(cardIndex + direction + choices.length) % choices.length]);
  }
  function recordAnswer() {
    if (pending.current || !answer.trim()) return;
    if(turns.length === 0 && savedSteps.current[0]?.answer !== answer.trim()) { setIntroExamples([]); delete savedSteps.current[1]; }
    savedSteps.current[turns.length] = { question: current, answer: answer.trim(), choices };
    const next = [...turns, { question: current || (turns.length > 0 ? choices[cardIndex] || "직접 작성" : "") || "그 사람은 당신에게 어떤 존재인가요? 받는 사람을 마음을 담아 불러 주세요.", answer: answer.trim() }];
    if (!relationship) setRelationship(answer.trim().slice(0, 200));
    if (next.length === 1) setDeckCoach(true);
    setPolished(null); setTurns(next); setAnswer(""); setCurrent(""); setChoices([]); setStage(next.length < 5 ? "interview" : "review"); // AI 질문은 "인터뷰 질문"을 눌렀을 때만 만든다
    if (next.length < 5) {
      const saved = savedSteps.current[next.length];
      if (saved) { setCurrent(saved.question); setAnswer(saved.answer); setChoices(saved.choices); setStage("interview"); }
    }
    else setStage("from");
  }
  function previousStep() {
    if (busy || !turns.length) return;
    savedSteps.current[turns.length] = { question:current, answer, choices };
    const previous = turns[turns.length - 1];
    const saved = savedSteps.current[turns.length - 1];
    if (turns.length === 2) setDeckCoach(true);
    setTurns(turns.slice(0, -1));
    setCurrent(previous.question);
    setAnswer(previous.answer);
    setChoices(saved?.choices ?? [previous.question]);
    setPolished(null); setStage("interview"); setError("");
  }
  return <dialog ref={dialog} className="ai-interview" aria-label="편지 인터뷰"
    onCancel={(e) => { e.preventDefault(); if (!busy && confirm("인터뷰를 닫을까요? 작성한 내용은 저장되어 다음에 이어 쓸 수 있어요.")) onClose(); }}>
    <header className="ai-interview__header">{stage === "relationship" && <h2 id="relationship-title">편지를 받는 분과 어떤 관계인가요?</h2>}<div className="ai-interview__header-actions"><button className="ai-interview__close" aria-label="인터뷰 닫기" type="button" disabled={busy} onClick={() => {
      if (confirm("인터뷰를 닫을까요? 작성한 내용은 저장되어 다음에 이어 쓸 수 있어요.")) onClose();
    }}>×</button></div></header>
    {(stage === "interview" || stage === "from") && <TipsStory key={turns.length === 0 ? 0 : guideIndex} guide={turns.length === 0 ? 0 : guideIndex} examples={introExamples} onDone={() => answerInput.current?.focus()} />}
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
      {(turns.length === 0 || answer.trim()) && <section className="ai-letter-live ai-letter-live--opening" aria-label="현재 작성 중인 내용"><p>{turns.length === 0 ? `To. ${answer}` : answer}</p></section>}
      {turns.length === 1 && deckCoach && <div className="ai-coach-dim" onClick={() => setDeckCoach(false)} />}
      {turns.length > 0 && <div className={`ai-center-toggle${turns.length === 1 && deckCoach ? " is-coached" : ""}`}><button type="button" className="ai-interview__tips-toggle" aria-expanded={showDeck} onClick={() => { if (!showDeck && !choices.length && !busy) void request("question", turns); setShowDeck(v => !v); setDeckCoach(false); }}>인터뷰 질문 {showDeck ? "▲" : "▼"}</button>{turns.length === 1 && deckCoach && <p className="ai-coach" role="note" onClick={() => setDeckCoach(false)}><span aria-hidden="true">↑</span>무엇을 써야 할지 막막하다면<br />인터뷰 질문을 열어보세요</p>}</div>}
      {turns.length > 0 && showDeck && !choices.length && <div className="ai-loading ai-loading--deck" role="status">{busy ? <><span className="ai-loading__spinner" aria-hidden="true" /><p>질문을 만들고 있어요</p><small>쓰신 이야기를 읽는 중이에요…</small></> : <><p>질문을 불러오지 못했어요.</p><button type="button" className="ai-question-refresh" onClick={() => void request("question", turns)}>↻ 질문 다시 받기</button></>}</div>}
      {turns.length > 0 && showDeck && choices.length > 0 && <section className="ai-question-deck" aria-label="질문 카드" aria-roledescription="캐러셀">
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
      <div className="ai-question-actions">
        <button type="button" className="ai-question-refresh" disabled={busy} onClick={() => void request("question", turns, true)}>↻ 질문 다시 받기</button>
        <button type="button" className="ai-question-direct" disabled={busy} aria-pressed={current === "직접 작성"} onClick={() => { setCurrent("직접 작성"); answerInput.current?.focus(); answerInput.current?.scrollIntoView({block:"center", behavior:"smooth"}); }}>내가 직접 쓰기</button>
      </div>
      </section>}
      <label>{turns.length === 0 ? "받는 분께 전하고 싶은 호칭을 적어 주세요." : "편지에 담고 싶은 말을 적어 주세요."}<textarea ref={answerInput} placeholder={turns.length === 0 ? "예: 무엇과도 바꿀 수 없는 소중한 오빠에게" : "지금 떠오르는 말 그대로 적어 주세요."} value={answer} maxLength={1500} onChange={(e) => { setPolished(null); setAnswer(e.target.value); }} required autoFocus /></label>
      <div className="ai-answer-tools">
        <button type="button" disabled={busy || !answer.trim()} onClick={() => void request("finish", turns, false, "edit", true)}><span aria-hidden="true">✧</span> AI 작가 첨삭</button>
        <button type="button" disabled={busy || !answer.trim()} onClick={() => void request("finish", turns, false, "spelling", true)}><span aria-hidden="true">✓</span> 맞춤법 검사</button>
      </div>
      <div className="ai-step-navigation"><button type="button" className="ai-answer-back" disabled={busy || !turns.length} onClick={previousStep}>← 이전으로</button>
      <button className="btn ai-answer-next" disabled={busy || !answer.trim()}>다음으로 <span aria-hidden="true">→</span></button></div>
    </form>}
    {stage === "interview" && turns.length > 0 && <button type="button" className="ai-review__finish" disabled={busy} onClick={() => setStage("from")}>인터뷰 마무리<span aria-hidden="true">→</span></button>}
    {stage === "from" && <form onSubmit={(e) => { e.preventDefault(); if (from.trim()) { setFull(null); setStage("options"); } }}>
      {from.trim() && <section className="ai-letter-live ai-letter-live--opening" aria-label="현재 작성 중인 내용"><p>From. {from}</p></section>}
      <label>보내는 분의 마음과 이름을 적어 주세요.<textarea ref={answerInput} placeholder="예: 언제나 네 편이 되고 싶은 영주가" value={from} maxLength={100} onChange={(e) => { setPolished(null); setFrom(e.target.value); }} required autoFocus /></label>
      <div className="ai-step-navigation"><button type="button" className="ai-answer-back" disabled={busy} onClick={previousStep}>← 이전으로</button>
      <button className="btn ai-answer-next" disabled={busy || !from.trim()}>다음으로 <span aria-hidden="true">→</span></button></div>
    </form>}
    {stage === "review" && !busy && <div className="ai-review">
      <p>답변은 저장했어요. 다음 질문을 다시 불러와 주세요.</p>
      <div className="ai-interview__actions">
        {turns.length < 5 && <button type="button" className="ai-review__more" disabled={busy} onClick={() => void request("question")}><span aria-hidden="true">＋</span>다음 질문 다시 불러오기</button>}

      </div>
      <button type="button" className="ai-review__finish" disabled={busy} onClick={() => setStage("from")}>인터뷰 마무리<span aria-hidden="true">→</span></button>
    </div>}
    {(stage === "options" || stage === "final") && <section className="ai-letter-pages" aria-label="편지 전체 확인">
      <h3 className="ai-letter-pages__title">편지 전체 확인</h3>
      <p className="ai-letter-pages__intro">To.부터 From.까지 처음부터 읽어 보세요.<br />내 말처럼 느껴지는지 확인하고, 필요한 곳만 고쳐 주세요.</p>
      <article className="ai-letter-page">
        <label>편지 내용<textarea className="ai-letter-full" value={fullLetter} disabled={busy} onChange={e => setFull(e.target.value)} /></label>
        <p>{fullLetter.trim().length}자 · 편지 {pages.length}장 <small>(300자 기준으로 나눠요)</small></p>
        <div className="ai-answer-tools">
          <button type="button" disabled={busy || !fullLetter.trim()} onClick={() => void request("finish", turns, false, "edit", true, -1)}>✧ AI 작가 첨삭</button>
          <button type="button" disabled={busy || !fullLetter.trim()} onClick={() => void request("finish", turns, false, "spelling", true, -1)}>✓ 맞춤법 검사</button>
        </div>
      </article>
      <div className="ai-step-navigation">
        <button type="button" className="ai-answer-back" disabled={busy} onClick={() => setStage("from")}>← 이전으로</button>
        <button className="btn ai-answer-next" disabled={busy || !fullLetter.trim()} onClick={() => setStage("paper")}>다음으로 · 속지 고르기 <span aria-hidden="true">→</span></button>
      </div>
    </section>}

    {stage === "paper" && <section className="ai-paper" aria-label="편지 속지 고르기">
      <h3 className="ai-letter-pages__title">편지 속지를 골라 주세요</h3>
      <p className="ai-letter-pages__intro">마음에 드는 속지를 눌러 선택해 주세요.</p>
      <LetterPaperPicker value={paper} onChange={setPaper}/>
      <div className="ai-step-navigation">
        <button type="button" className="ai-answer-back" onClick={() => setStage("options")}>← 이전으로</button>
        <button type="button" className="btn ai-answer-next" disabled={!paper} onClick={() => { if (!paper) return; finished.current = true; onSave(pages.map((page, index) => ({ question: `편지 ${index + 1}`, answer: page })), paper); }}>확인 · 편지 {pages.length}장 만들기</button>
      </div>
    </section>}
    {busy && stage !== "review" && <p role="status">이야기를 읽고 있어요…</p>}
    {error && <p role="alert" className="ph-error">{error}</p>}
  </dialog>;
}







