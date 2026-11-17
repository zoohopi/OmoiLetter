"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// 실물 촬영 영상(배경 제거)을 프레임 이미지로 나눠, 스크롤에 맞춰 한 바퀴 돌린다.
const FRAMES = 97;
const src = (i: number) => `/product-book/turn/${String(i).padStart(2, "0")}.webp`;

export default function BookTurn() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const section = root.current, cv = canvas.current;
    if (!section || !cv) return;
    const g = cv.getContext("2d")!;
    const images = Array.from({ length: FRAMES }, (_, i) => { const img = new Image(); img.decoding = "async"; img.src = src(i); return img; });
    let current = 0;
    const draw = (i: number) => {
      current = i;
      // 아직 안 받은 프레임이면 가장 가까운 받은 프레임을 그린다.
      for (let d = 0; d < FRAMES; d++) for (const j of [i - d, i + d]) {
        const img = images[j];
        if (img?.complete && img.naturalWidth) { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); return; }
      }
    };
    images.forEach((img, i) => { img.onload = () => { if (Math.abs(i - current) <= 1) draw(current); }; });
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const state = { frame: 0 };
      gsap.to(state, {
        frame: FRAMES - 1, ease: "none", snap: "frame", duration: FRAMES / 24,
        onUpdate: () => draw(Math.round(state.frame)),
        scrollTrigger: { trigger: section, start: "top 70%" /* 화면에 들어오면 한 번만 재생 */, once: true },
      });
    });
    draw(0);
    return () => { mm.revert(); images.forEach(img => { img.onload = null; }); };
  }, []);
  return <section className="product-book" ref={root} aria-label="오모이레터 편지책">
    <canvas className="product-book__turn" ref={canvas} width={800} height={800} role="img" aria-label="스크롤하면 돌아가는 오모이레터 편지책" />
    <p className="product-book__price"><del aria-label="정가 79,000원">79,000원</del><span aria-hidden="true">→</span><strong aria-label="할인가 49,000원">49,000원</strong></p>
    <p className="product-book__caption">사진과 마음이 담긴 한 권의 편지책</p>
    <p className="product-book__note">*30페이지 기준</p>
  </section>;
}
