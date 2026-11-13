"use client";
import { useEffect, useRef, useState } from "react";

const WRITING_GUIDE = [
  { title: "받는 사람을 다정하게 불러 주세요", tip: "평소 부르는 이름에 그 사람이 내게 어떤 존재인지 덧붙여 보세요. 적은 말이 To. 뒤에 들어가요.", example: "무엇과도 바꿀 수 없는 소중한 오빠에게" },
  { title: "가벼운 안부로 이야기를 열어요", tip: "대화를 시작하듯 최근 일이나 함께 웃었던 순간을 적어 보세요. 상대에게 직접 말하는 문장으로 쓰면 자연스러워요.", example: "지난번에 같이 걷다가 길을 잃었던 거 기억나? 생각하면 아직도 웃음이 나." },
  { title: "편지를 쓰는 이유를 꺼내요", tip: "이 편지를 쓰는 이유를 한 가지 골라 보세요. 고마웠어, 미안했어, 응원하고 싶어처럼 짧게 시작해도 좋아요.", example: "오늘은 평소에 잘 표현하지 못했던 고마움을 전하고 싶어." },
  { title: "마음에 남은 장면을 더해요", tip: "둘만 아는 장면과 그때 느낀 마음을 적어 보세요. 그 일이 왜 소중했는지까지 더하면 당신만의 편지가 돼요. 이미 적었다면 전하고 싶은 의미만 더해도 좋아요.", example: "내가 지쳐 있던 날 조용히 옆에 있어 줬잖아. 그때 정말 안심이 됐어." },
  { title: "앞으로의 마음을 약속해요", tip: "고마웠다면 돌려주고 싶은 마음을, 미안했다면 바꾸고 싶은 행동을 적어 보세요. 지킬 수 있는 작은 약속 하나면 충분해요.", example: "나도 네가 힘든 날 먼저 안부를 물어볼게." },
  { title: "보내는 마음으로 편지를 닫아요", tip: "그 사람에게 어떤 사람으로 남고 싶은지, 이름과 함께 From.에 적어 주세요. To.부터 마지막 줄까지 읽으며 내 말처럼 느껴지는지 확인해 보세요. 원하는 경우에만 아래 버튼으로 다듬어요.", example: "언제나 네 편이 되고 싶은 영주가" },
];
type Turn = { question: string; answer: string };
export default function AIInterview({ question, onSave, onClose, onSelfQuestion }: {
  question: string; onSelfQuestion: () => void; onSave: (answer: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [editingTurn, setEditingTurn] = useState<number | null>(null);
  const [relationship, setRelationship] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [choices, setChoices] = useState<string[]>(["편지를 받는 분과 어떤 관계이고, 평소에는 뭐라고 부르나요?", "그분은 당신에게 어떤 존재인가요? 평소 부르는 호칭도 알려 주세요.", "누구에게 편지를 쓰고 싶나요? 두 분의 관계와 서로 부르는 이름을 들려주세요."]);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [answer, setAnswer] = useState("");
  const [from, setFrom] = useState("");
  const [polished, setPolished] = useState<string | null>(null);
  const [stage, setStage] = useState<"relationship" | "interview" | "review" | "options" | "final">("interview");
  const guideIndex = stage === "options" || stage === "final" ? 5 : Math.min(turns.length, 4);
  const guide = WRITING_GUIDE[guideIndex];
  const letterText = polished ?? [turns[0] ? `To. ${turns[0].answer}` : answer ? `To. ${answer}` : "To.", ...turns.slice(1).map((turn) => turn.answer), ...(turns.length && answer.trim() ? [answer.trim()] : []), ...((stage === "options" || stage === "final" || from.trim()) ? [`From. ${from}`] : [])].join("\n\n");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => { el?.close(); };
  }, []);
  async function request(action: "question" | "finish", nextTurns = turns, regenerate = false, mode?: "edit" | "spelling", currentAnswer = false) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, relationship: relationship || nextTurns[0]?.answer || "관계와 호칭을 알아가는 중", turns: nextTurns, action, writingStep: Math.min(nextTurns.length, 4), edit: mode === "edit", spelling: mode === "spelling", draft: action === "finish" ? (currentAnswer ? answer.trim() : letterText) : undefined, currentAnswer, previousQuestions: regenerate ? [...previousQuestions, ...choices].slice(-24) : [] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === "question") { setTurns(nextTurns); setChoices(data.questions); setPreviousQuestions(regenerate ? [...previousQuestions, ...choices].slice(-24) : []); setCurrent(""); setStage("interview"); }
      else if (currentAnswer) { setPolished(null); setAnswer(data.answer); }
      else { setPolished(data.answer); }
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }
  function recordAnswer() {
    if (pending.current || (turns.length > 0 && !current) || !answer.trim()) return;
    const next = [...turns, { question: current || "그 사람은 당신에게 어떤 존재인가요? 받는 사람을 마음을 담아 불러 주세요.", answer: answer.trim() }];
    if (!relationship) setRelationship(answer.trim().slice(0, 200));
    setPolished(null); setTurns(next); setAnswer(""); setCurrent(""); setChoices([]); setStage("review");
    if (next.length < 5) void request("question", next);
    else setStage("options");
  }
  return <dialog ref={dialog} className="ai-interview" aria-label="편지 인터뷰"
    onCancel={(e) => { e.preventDefault(); if (!busy && confirm("인터뷰를 닫을까요? 아직 편지에 넣지 않은 대화는 사라져요.")) onClose(); }}>
    <header className="ai-interview__header">{stage === "relationship" && <h2 id="relationship-title">편지를 받는 분과 어떤 관계인가요?</h2>}<button className="ai-interview__close" aria-label="인터뷰 닫기" type="button" disabled={busy} onClick={() => {
      if (confirm("인터뷰를 닫을까요? 아직 편지에 넣지 않은 대화는 사라져요.")) onClose();
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
    </aside> : <aside className="ai-writing-start">
      <h3>{guideIndex + 1}. {guide.title}</h3><p>{guide.tip}</p>
      <details><summary>이렇게 써 볼 수 있어요</summary><p>{guide.example}</p><small>예시를 참고해 나만의 이야기로 적어 주세요.</small></details>
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
    {turns.length > 0 && <details className="ai-previous-answers"><summary>이전에 쓴 내용 수정하기</summary>{turns.map((turn, i) => <div className="ai-interview__turn" key={i}>
      <p>{turn.question}</p>
      <textarea aria-label={`답변 ${i + 1} 수정`} value={turn.answer} readOnly={editingTurn !== i} onChange={(e) => { setPolished(null); setTurns((previous) => previous.map((item, index) => index === i ? { ...item, answer: e.target.value } : item)); }} maxLength={1500} />
      <button className="ai-interview__edit-answer" type="button" disabled={busy} onClick={() => setEditingTurn(editingTurn === i ? null : i)}>{editingTurn === i ? "수정 완료" : "답변 수정하기"}</button>
    </div>)}</details>}
    {stage === "interview" && <form onSubmit={(e) => { e.preventDefault(); recordAnswer(); }}>
      {turns.length > 0 && <><fieldset className="ai-question-choices" disabled={busy}>
        <legend>마음에 닿는 질문을 골라 주세요.</legend>
        {choices.map((item, index) => <button type="button" key={item} aria-pressed={current === item} className={current === item ? "is-selected" : ""} onClick={() => setCurrent(item)}><span>{index + 1}</span>{item}</button>)}
      </fieldset>
      <button type="button" className="ai-question-refresh" disabled={busy} onClick={() => void request("question", turns, true)}>↻ 질문 다시 받기</button></>}
      <section className="ai-letter-live ai-letter-live--opening" aria-label="작성 중인 편지"><p>{letterText}</p></section>
      <label>{turns.length === 0 ? "받는 분께 전하고 싶은 호칭을 적어 주세요." : "편지에 담고 싶은 말을 적어 주세요."}<textarea placeholder={turns.length === 0 ? "예: 무엇과도 바꿀 수 없는 소중한 오빠에게" : "지금 떠오르는 말 그대로 적어 주세요."} value={answer} maxLength={1500} onChange={(e) => { setPolished(null); setAnswer(e.target.value); }} required autoFocus /></label>
      <div className="ai-answer-tools">
        <button type="button" disabled={busy || !answer.trim()} onClick={() => void request("finish", turns, false, "edit", true)}><span aria-hidden="true">✧</span> AI 작가 첨삭</button>
        <button type="button" disabled={busy || !answer.trim()} onClick={() => void request("finish", turns, false, "spelling", true)}><span aria-hidden="true">✓</span> 맞춤법 검사</button>
      </div>
      <button className="btn ai-answer-next" disabled={busy || (turns.length > 0 && !current) || !answer.trim()}>다음으로 <span aria-hidden="true">→</span></button>
    </form>}
    {stage === "interview" && turns.length > 0 && <button type="button" className="ai-review__finish" disabled={busy} onClick={() => setStage("options")}>인터뷰 마무리<span aria-hidden="true">→</span></button>}
    {stage === "review" && <div className="ai-review">
      <p>{busy ? "다음 질문을 준비하고 있어요." : "답변은 저장했어요. 다음 질문을 다시 불러와 주세요."}</p>
      <div className="ai-interview__actions">
        {turns.length < 5 && <button type="button" className="ai-review__more" disabled={busy} onClick={() => void request("question")}><span aria-hidden="true">＋</span>다음 질문 다시 불러오기</button>}

      </div>
      <button type="button" className="ai-review__finish" disabled={busy} onClick={() => setStage("options")}>인터뷰 마무리<span aria-hidden="true">→</span></button>
    </div>}
    {(stage === "options" || stage === "final") && <><section className="ai-letter-live" aria-label="완성 중인 편지">
      <p>{letterText}</p>
      {(stage === "options" || stage === "final") && <label>보내는 마음 · From.<input value={from} disabled={busy} maxLength={100} placeholder="예: 언제나 오빠의 편인 영주가" onChange={(e) => { setPolished(null); setFrom(e.target.value); }} /></label>}
    </section>
    <div className="ai-answer-tools">
      <button type="button" disabled={busy || !turns.length || !!answer.trim()} onClick={() => void request("finish", turns, false, "edit")}>✧ AI 작가 첨삭</button>
      <button type="button" disabled={busy || !turns.length || !!answer.trim()} onClick={() => void request("finish", turns, false, "spelling")}>✓ 맞춤법 검사</button>
    </div>
    </>}
    {(stage === "options" || stage === "final") && <div>
      <label>완성한 편지 확인<textarea value={letterText} disabled={busy} onChange={(e) => setPolished(e.target.value)} /></label>
      <p>{letterText.length} / 500자</p>
      <button className="btn" disabled={busy || !turns.length || !from.trim() || letterText.length > 500} onClick={() => onSave(letterText.trim())}>확인 · 편지에 넣기</button>
    </div>}

    {busy && <p role="status">이야기를 읽고 있어요…</p>}
    {error && <p role="alert" className="ph-error">{error}</p>}
  </dialog>;
}







