"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BookPage, { type PageSpec } from "@/components/letter/BookPage";
import ScaledPage from "@/components/letter/ScaledPage";
import { SAMPLE_DATE, SAMPLE_DESIGN, SAMPLE_NAME, SAMPLE_PAGES } from "@/lib/letter/sample";

const LABELS = ["표지", "펼침 1 · 가로", "펼침 2 · 세로 1", "펼침 3 · 세로 2"];

// 넘기는 장 [앞면, 뒷면] — SAMPLE_PAGES 번호. 앞면은 오른쪽 면, 넘기면 뒷면이 다음 펼침의 왼쪽 면이 된다.
const SHEETS: [number, number | null][] = [
  [0, 1], // 표지 → 펼침 1 왼쪽
  [2, 3], // 펼침 1 오른쪽 → 펼침 2 왼쪽
  [4, 5], // 펼침 2 오른쪽 → 펼침 3 왼쪽
  [6, null], // 펼침 3 오른쪽 (마지막)
];

// p.06 — 실제 편지책과 같은 템플릿·매거진 디자인으로 그린 샘플 한 권 (lib/letter/sample.ts)
export default function BookPreview() {
  const [page, setPage] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    const section = el?.closest("section");
    if (!el || !section) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const sheets = gsap.utils.toArray<HTMLElement>(".book__page", el);
      const model = el.querySelector(".book__model");
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "book-pages",
          trigger: section,
          // p.01 번호가 상단 바 아래에 보이는 지점에서 더 일찍 고정한다.
          start: () => {
            const eyebrow = section.querySelector<HTMLElement>(".eyebrow");
            const headline = section.querySelector<HTMLElement>(".headline");
            if (!eyebrow || !headline) return "top top";
            // 나타나기 애니메이션(translate)에 흔들리지 않게 offsetTop으로 잰다
            const y = (node: HTMLElement) => {
              let sum = 0;
              for (let n: HTMLElement | null = node; n; n = n.offsetParent as HTMLElement | null) sum += n.offsetTop;
              return sum;
            };
            const eyebrowOffset = y(eyebrow) - y(section as HTMLElement);
            const bar = document.querySelector<HTMLElement>(".topbar")?.offsetHeight ?? 0;
            return `top+=${eyebrowOffset} top+=${bar + 16}`;
          },
          end: () => `+=${window.innerHeight * 3.2}`,
          pin: true,
          scrub: .65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      gsap.set(sheets, { rotationY: 0 });
      tl.to({}, { duration: .45 });
      tl.to(model, { xPercent: 50, duration: .4 }, "open");
      sheets.slice(0, -1).forEach((sheet, i) => {
        const at = i === 0 ? "open+=.4" : undefined;
        tl.to(sheet, { rotationY: -180, duration: 1 }, at);
        tl.to({}, { duration: .45 });
      });
      tl.to({}, { duration: .4 });
      tl.eventCallback("onUpdate", () => {
        // 넘긴 장은 나중에 넘긴 것이 위로(왼쪽 면), 안 넘긴 장은 앞쪽 장이 위로(오른쪽 면)
        sheets.forEach((sheet, i) => {
          const over = Number(gsap.getProperty(sheet, "rotationY")) < -90;
          sheet.style.zIndex = String(over ? 10 + i : 10 - i);
        });
        const turned = sheets.slice(0, -1).filter((sheet) => Number(gsap.getProperty(sheet, "rotationY")) < -90).length;
        setPage(turned);
      });
    });
    return () => mm.revert();
  }, []);
  const cls = (i: number) => `book__page ${page === i ? "is-active" : ""}`;

  return (
    <div className="book book--physical book--scroll" ref={root}>
      <div className="book__stage">
        <div className="book__ground" aria-hidden="true" />
        <div className="book__model">
          <div className="book__backboard" aria-hidden="true" />
          <div className="book__spine" aria-hidden="true"><span>Omoi Letter</span></div>
          <div className="book__foreedge" aria-hidden="true" />
          <div className="book__bottomedge" aria-hidden="true" />
          <div className="book__leaves">
            {SHEETS.map(([face, back], i) => (
              <div key={i} className={`${cls(i)} ${i === 0 ? "book__cover" : ""}`} aria-hidden={page !== i}>
                <div className="book__face book__face--tpl">
                  <SamplePage page={SAMPLE_PAGES[face]} />
                </div>
                <div className="book__reverse book__face--tpl" aria-hidden="true">
                  {back !== null && <SamplePage page={SAMPLE_PAGES[back]} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="book__scroll-hint">스크롤해서 편지를 펼쳐 보세요</p>
      <p className="book__label">
        {LABELS[page]} · 샘플 이미지
      </p>
    </div>
  );
}

export function SamplePage({ page }: { page: PageSpec }) {
  return (
    <ScaledPage>
      <BookPage page={page} design={SAMPLE_DESIGN} size="8x8" recipientName={SAMPLE_NAME} anniversaryDate={SAMPLE_DATE} />
    </ScaledPage>
  );
}
