"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// p.08 — 실제 인스타그램 게시물처럼 보여주는 예시.
// 매거진·미니멀 표지의 Blender 렌더. 지면 변경 시 원본 장면에서 다시 렌더한다.
const SLIDES = [
  { src: "/sample/book-renders/book-0-v2.webp", alt: "책상 위에 놓인 오모이레터 표지와 종이 단면" },
  { src: "/sample/book-renders/book-minimal-v3.webp", alt: "꽃다발을 든 두 사람의 사진이 담긴 미니멀 표지, 수직·수평을 맞춘 정면 구도" },
];

export default function InstaPost() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // 3.2초마다 다음 사진으로 넘어간다 (손으로 넘기면 잠시 멈춤)
  useEffect(() => {
    if (paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 3200);
    return () => clearInterval(t);
  }, [paused]);

  const go = (i: number) => {
    setPaused(true);
    setIndex((i + SLIDES.length) % SLIDES.length);
  };

  return (
    <figure className="igp" aria-label="인스타그램 게시물 예시">
      {/* 상단: 프로필 */}
      <header className="igp__head">
        <span className="igp__avatar" aria-hidden="true" />
        <span className="igp__user">
          <b>my.dear.diary</b>
          <small>Omoi Letter · 편지책</small>
        </span>
        <span className="igp__more" aria-hidden="true">
          ···
        </span>
      </header>

      {/* 사진 영역 (4:5) */}
      <div className="igp__media">
        <div className="igp__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((slide, i) => (
            <div className="igp__slide" key={i} aria-hidden={i !== index}>
              <Image className="igp__render" src={slide.src} alt={slide.alt} width={1080} height={1350} sizes="(max-width: 440px) 100vw, 400px" />
            </div>
          ))}
        </div>
        <span className="igp__count">
          {index + 1}/{SLIDES.length}
        </span>
        <button className="igp__nav igp__nav--prev" type="button" onClick={() => go(index - 1)} aria-label="이전 사진">
          ‹
        </button>
        <button className="igp__nav igp__nav--next" type="button" onClick={() => go(index + 1)} aria-label="다음 사진">
          ›
        </button>
      </div>

      {/* 아이콘 줄 + 넘김 점 */}
      <div className="igp__actions" aria-hidden="true">
        <span className="igp__icons">
          <Icon d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.7 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.2 4.3 6.7-1.8 4.7-9.3 9.3-9.3 9.3z" fill />
          <Icon d="M20.5 12a8.5 8.5 0 1 1-3.6-6.9 8.5 8.5 0 0 1 3.6 6.9zM20.5 20.5l-2.3-4.1" />
          <Icon d="M21 3.5 10 14M21 3.5l-6.8 17-3.2-7.3L3.5 10z" />
        </span>
        <span className="igp__dots">
          {SLIDES.map((_, i) => (
            <i key={i} className={i === index ? "is-on" : ""} />
          ))}
        </span>
        <Icon d="M6 3.5h12v17l-6-4.5-6 4.5z" />
      </div>

      {/* 글 */}
      <figcaption className="igp__caption">
        <b>my.dear.diary</b> 생일 축하해 🎂 말로는 못 했던 마음, 한 권에 담았어.
        <span className="igp__tags"> #오모이레터 #OmoiLetter #편지책</span>
      </figcaption>
      <p className="igp__note">예시 게시물 · 샘플 이미지</p>
    </figure>
  );
}

function Icon({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill={fill ? "#ed4956" : "none"} stroke={fill ? "#ed4956" : "currentColor"} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
}
