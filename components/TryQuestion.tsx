"use client";

import { useEffect, useRef, useState } from "react";
import { SamplePage } from "@/components/BookPreview";
import type { PageSpec } from "@/components/letter/BookPage";

// p.04 — 인터뷰 예시. '인터뷰하기'를 누르면 따옴표·질문·'답변하기'가 페이드인되고,
// '답변하기'를 누르면 답이 한 글자씩 페이드인으로 나타난다. 다 쓰면 뒤에 펼친 편지책(매거진 디자인)이
// 페이드인되고, 글씨는 보이는 그대로 줄마다 책의 제자리로 옮겨가 안착한다. (방문자가 직접 쓰지 않음)
const QUESTION_LINES = ["두 분은 어디서 처음 만나셨나요?", "또 첫인상은 어떠셨나요?"];
// 예시 답 — 실제 고객의 글이 아니라는 것을 화면에 '예시'로 표시한다.
const ANSWER_LINES = ["동석이 생일 파티에서 너를 처음 봤었어.", "밝은 모습으로 케이크를 들고 오던 모습이,", "너무 귀여워서 아직도 기억에 남아."];
const SAMPLE = ANSWER_LINES.join("\n");
// 줄마다 첫 글자의 번호 (한 글자씩 나타나는 순서가 줄을 넘어 이어진다)
const LINE_START = ANSWER_LINES.map((_, i) => ANSWER_LINES.slice(0, i).reduce((sum, l) => sum + l.length + 1, 0));
const STEP_MS = 85; // 한 글자 간격
const SETTLE_MS = 900; // 다 쓴 뒤 잠깐 머무는 시간
const BOOK_FADE_MS = 700; // 뒤에 책이 나타나는 시간
const FLY_MS = 1200; // 글씨가 책 제자리로 가는 시간

// 책 펼침: 왼쪽 글 면 + 오른쪽 사진 면 (매거진 가로 레이아웃)
const LEAF = { kind: "leaf", layout: "landscape", no: 1, photoId: "/sample/mag-1.jpg", question: QUESTION_LINES.join("\n"), answer: SAMPLE } as const;
const LEFT: PageSpec = { ...LEAF, side: "left" };
const RIGHT: PageSpec = { ...LEAF, side: "right" };

type Phase = "write" | "book" | "fly" | "landed";

export default function TryQuestion() {
  const letterRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false); // '인터뷰하기'를 눌러 따옴표·질문이 나옴
  const [answering, setAnswering] = useState(false);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("write");

  // '답변하기'를 누른 뒤 한 글자씩
  useEffect(() => {
    if (!answering) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setCount(SAMPLE.length), 0);
      return () => clearTimeout(t);
    }
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= SAMPLE.length) {
          clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [answering]);

  // 책 속 따옴표·질문·답은 글씨가 안착할 때까지 숨겨 둔다
  useEffect(() => {
    // 안착할 때 0.45초 동안 서서히 나타난다 (날아온 글씨와 크로스페이드)
    targets(bookRef.current).forEach(({ el }) => {
      el.style.transition = "opacity 0.45s ease";
      el.style.opacity = phase === "landed" ? "1" : "0";
    });
  }, [phase]);

  // 'fly'로 바뀐 뒤(이동 transition이 켜진 다음 프레임)에 목적지를 준다 — 먼저 주면 순간이동한다
  useEffect(() => {
    if (phase !== "fly") return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => fly(letterRef.current, bookRef.current));
    });
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // 다 쓰면: 잠깐 머묾 → 뒤에 책 페이드인 → 글씨가 제자리로 → 안착
  useEffect(() => {
    if (count < SAMPLE.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = reduce
      ? [setTimeout(() => setPhase("landed"), SETTLE_MS)]
      : [
          setTimeout(() => setPhase("book"), SETTLE_MS),
          setTimeout(() => setPhase("fly"), SETTLE_MS + BOOK_FADE_MS),
          setTimeout(() => setPhase("landed"), SETTLE_MS + BOOK_FADE_MS + FLY_MS + 50),
        ];
    return () => timers.forEach(clearTimeout);
  }, [count]);

  return (
    <div className="try try--sample">
      <div className={`try__stage is-${phase}`}>
        {/* 다 쓴 글이 담기는 펼친 편지책 */}
        <div className="try__book" ref={bookRef} aria-hidden={phase === "write"}>
          <SamplePage page={LEFT} />
          <SamplePage page={RIGHT} />
        </div>

        <div className={`try__letter ${shown ? "is-shown" : ""}`} ref={letterRef} aria-label={`예시 질문: ${QUESTION_LINES.join(" ")}`}>
          <p className="try__quote" aria-hidden="true">
            <span className="try__fly" data-to="quote">“</span>
          </p>
          <p className="try__q">
            {QUESTION_LINES.map((line, i) => (
              <span key={i} className="try__line">
                <span className="try__fly" data-to="q" data-line={i}>
                  {line}
                </span>
              </span>
            ))}
          </p>
          {/* 답 자리는 미리 잡아 두고, 그 가운데에 '답변하기' 버튼 */}
          <div className="try__aw">
            <p className="try__a" aria-label={answering ? `예시 답: ${SAMPLE}` : undefined}>
              {ANSWER_LINES.map((line, li) => (
                <span key={li} className="try__line">
                  <span className="try__fly" data-to="a" data-line={li}>
                    {[...line].map((ch, i) => (
                      <span key={i} aria-hidden="true" className={`try__ch ${LINE_START[li] + i < count ? "is-on" : ""}`}>
                        {ch}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
            </p>
            {shown && !answering && (
              <button className="btn btn--small try__answer" type="button" onClick={() => setAnswering(true)}>
                답변하기
              </button>
            )}
          </div>
          {!shown && (
            <button className="btn try__start" type="button" onClick={() => setShown(true)}>
              인터뷰하기
            </button>
          )}
        </div>
      </div>
      <p className="preview__note">예시 · 쓴 그대로 편지지에 옮겨져요.</p>
    </div>
  );
}

/* ---------------- 글씨가 책 제자리로 (FLIP) ---------------- */

// 책 왼쪽 면에서 글씨가 안착할 곳: 따옴표, 질문(head), 답(body)
function targets(book: HTMLElement | null) {
  const left = book?.querySelector<HTMLElement>(".bp");
  if (!left) return [];
  const answer = left.querySelector<HTMLElement>(".tp-answer");
  const quote = [...left.querySelectorAll<HTMLElement>("div")].find((d) => d.childElementCount === 0 && d.textContent === "“");
  const head = answer?.firstElementChild as HTMLElement | null | undefined;
  const body = answer?.querySelector<HTMLElement>(".tp-answer__body");
  const list: { key: string; el: HTMLElement }[] = [];
  if (quote) list.push({ key: "quote", el: quote });
  if (head) list.push({ key: "q", el: head });
  if (body) list.push({ key: "a", el: body });
  return list;
}

// el 안 글에서 n번째 줄(줄바꿈 기준)이 그려진 자리
function lineRect(el: HTMLElement, n: number) {
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return el.getBoundingClientRect();
  const lines = (node.textContent ?? "").split("\n");
  const start = lines.slice(0, n).reduce((sum, l) => sum + l.length + 1, 0);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + (lines[n]?.length ?? 0));
  return range.getClientRects()[0] ?? range.getBoundingClientRect();
}

function fly(letter: HTMLElement | null, book: HTMLElement | null) {
  if (!letter || !book) return;
  const map = new Map(targets(book).map((t) => [t.key, t.el]));
  letter.querySelectorAll<HTMLElement>(".try__fly").forEach((src) => {
    const dest = map.get(src.dataset.to ?? "");
    if (!dest) return;
    // 줄 높이가 아닌 글자가 그려진 영역끼리 맞춘다 (책은 축소 보기라 글자 크기도 영역 높이로 잰다)
    const box = src.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(src);
    const from = range.getBoundingClientRect();
    const to = lineRect(dest, Number(src.dataset.line ?? 0));
    const scale = to.height / from.height;
    src.style.transformOrigin = `${from.left - box.left}px ${from.top - box.top}px`;
    src.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`;
  });
}
