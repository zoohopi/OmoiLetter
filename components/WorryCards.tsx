"use client";

import { useEffect, useRef, useState } from "react";

// p.02 — 고민 카드. 한 장씩 보여 주고 옆으로 넘긴다 (스와이프 · 화살표 · 점).
// Three original film photographs, one scene for each concern.
const WORRIES: { text: string; lines?: string[]; img: string; alt: string }[] = [
  { text: "카드에 “생일 축하해, 사랑해” 쓰고 나면 더 쓸 말이 없습니다.", lines: ["카드에 “생일 축하해, 사랑해”", "쓰고 나면 더 쓸 말이 없습니다."], img: "/worries/01-writing-card-v1.webp", alt: "창가에서 짧은 카드 앞에 펜을 든 채 망설이는 손" },
  { text: "마음은 큰데, 말로 전하기엔 쑥스럽습니다.", img: "/worries/02-shy-letter-v1.webp", alt: "노을 진 강가에서 작은 편지를 쥔 채 나란히 앉은 두 사람" },
  { text: "이번 생일엔 정말 기억에 남는 걸 주고 싶습니다.", lines: ["이번 생일엔 정말 기억에", "남는 걸 주고 싶습니다."], img: "/worries/03-book-gift-v1.webp", alt: "생일을 맞아 사진과 마음을 담은 작은 책을 선물하는 손" },
];

export default function WorryCards() {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(false); // 처음 화면에 들어왔을 때 첫 카드 밑줄

  // 넘긴 위치로 지금 카드 번호를 잡는다
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.5 });
    io.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(WORRIES.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="worry-cards">
      <ul className="worries" ref={track} aria-label="고민 카드">
        {WORRIES.map((w, i) => (
          <li
            key={w.text}
            className={`worry worry--${i + 1} ${seen && i === index ? "is-in" : ""}`}
            aria-label={`${i + 1} / ${WORRIES.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 카드 그림 (정적 이미지) */}
            {w.img && <img className="worry__img" src={w.img} alt={w.alt} width={900} height={1125} loading="lazy" decoding="async" />}
            <p className="worry__text">
              <span className="worry__mark">{w.lines ? w.lines.map((line, j) => <span key={line}>{j > 0 && <br />}{line}</span>) : w.text}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="worry-cards__nav">
        <button type="button" className="worry-cards__arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="이전 카드">
          ‹
        </button>
        <span className="worry-cards__dots">
          {WORRIES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === index ? "is-on" : ""}
              onClick={() => go(i)}
              aria-label={`${i + 1}번째 카드`}
              aria-current={i === index}
            />
          ))}
        </span>
        <button
          type="button"
          className="worry-cards__arrow"
          onClick={() => go(index + 1)}
          disabled={index === WORRIES.length - 1}
          aria-label="다음 카드"
        >
          ›
        </button>
      </div>
    </div>
  );
}

