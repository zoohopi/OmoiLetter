"use client";
import { useEffect, useRef, useState } from "react";

type Turn = { question: string; answer: string };
export default function AIInterview({ question, onSave, onClose, onSelfQuestion }: {
  question: string; onSelfQuestion: () => void; onSave: (answer: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [editingTurn, setEditingTurn] = useState<number | null>(null);
  const [relationship, setRelationship] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [current, setCurrent] = useState("");
  const [answer, setAnswer] = useState("");
  const [stage, setStage] = useState<"relationship" | "interview" | "review" | "options" | "final">("relationship");
  const [edit, setEdit] = useState(false);
  const [spelling, setSpelling] = useState(false);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => { el?.close(); };
  }, []);
  async function request(action: "question" | "finish", nextTurns = turns) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, relationship, turns: nextTurns, action, edit, spelling }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === "question") { setTurns(nextTurns); setCurrent(data.question); setAnswer(""); setStage("interview"); }
      else { onSave(data.answer); }
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }
  function recordAnswer() {
    const next = [...turns, { question: current, answer: answer.trim() }];
    setTurns(next); setAnswer(""); setStage("review");
  }
  return <dialog ref={dialog} className="ai-interview" aria-label="편지 인터뷰"
    onCancel={(e) => { e.preventDefault(); if (!busy && confirm("인터뷰를 닫을까요? 아직 편지에 넣지 않은 대화는 사라져요.")) onClose(); }}>
    <header className="ai-interview__header">{stage === "relationship" && <h2 id="relationship-title">편지를 받는 분과 어떤 관계인가요?</h2>}<button className="ai-interview__close" aria-label="인터뷰 닫기" type="button" disabled={busy} onClick={() => {
      if (confirm("인터뷰를 닫을까요? 아직 편지에 넣지 않은 대화는 사라져요.")) onClose();
    }}>×</button></header>
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
    {stage !== "relationship" && <p className="ai-interview__relationship">{relationship}</p>}
    {turns.map((turn, i) => <div className="ai-interview__turn" key={i}>
      <p>{turn.question}</p>
      <textarea aria-label={`답변 ${i + 1} 수정`} value={turn.answer} readOnly={editingTurn !== i} onChange={(e) => setTurns((previous) => previous.map((item, index) => index === i ? { ...item, answer: e.target.value } : item))} maxLength={1500} />
      <button className="ai-interview__edit-answer" type="button" disabled={busy} onClick={() => setEditingTurn(editingTurn === i ? null : i)}>{editingTurn === i ? "수정 완료" : "답변 수정하기"}</button>
    </div>)}
    {stage === "interview" && <form onSubmit={(e) => { e.preventDefault(); recordAnswer(); }}>
      <label>{current}<textarea value={answer} maxLength={1500} onChange={(e) => setAnswer(e.target.value)} required autoFocus /></label>
      <button className="btn" disabled={busy || !answer.trim()}>답변 확인하기</button>
    </form>}
    {stage === "review" && <div className="ai-review">
      <p>답변을 확인해 주세요. 더 나누고 싶은 이야기가 있나요?</p>
      <div className="ai-interview__actions">
        {turns.length < 3 && <button type="button" className="ai-review__more" disabled={busy} onClick={() => void request("question")}><span aria-hidden="true">＋</span>질문 하나 더 받기</button>}

      </div>
      <button type="button" className="ai-review__finish" disabled={busy} onClick={() => setStage("options")}>인터뷰 마무리<span aria-hidden="true">→</span></button>
    </div>}
    {stage === "options" && <div>
      <fieldset disabled={busy}><legend>편지로 정리할 때 도와드릴까요?</legend>
        <label><input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} /> 내용과 문장 흐름 첨삭</label>
        <label><input type="checkbox" checked={spelling} onChange={(e) => setSpelling(e.target.checked)} /> 맞춤법·띄어쓰기 검사</label>
      </fieldset>
      <button className="btn" disabled={busy} onClick={() => {
        if (!edit && !spelling) { setResult(turns.map((turn) => turn.answer).join("\n\n")); setStage("final"); }
        else void request("finish");
      }}>확인 · 편지에 넣기</button>
    </div>}
    {stage === "final" && <div>
      <label>편지에 들어갈 내용<textarea value={result} onChange={(e) => setResult(e.target.value)} /></label>
      <p>{result.length} / 500자 · 직접 수정한 뒤 편지에 넣어 주세요.</p>
      <div className="ai-interview__actions">
        <button type="button" onClick={() => setStage("options")}>이전으로</button>
        <button className="btn" disabled={!result.trim() || result.length > 500} onClick={() => onSave(result.trim())}>확인 · 편지에 넣기</button>
      </div>
    </div>}

    {busy && <p role="status">이야기를 읽고 있어요…</p>}
    {error && <p role="alert" className="ph-error">{error}</p>}
  </dialog>;
}







