"use client";

import { useEffect, useState } from "react";
import AccountLink from "./account/AccountLink";
import { PAGES } from "@/lib/pages";

// 상단은 브랜드와 로그인/내정보 버튼, 읽기 진행선만 표시한다.
export default function Topbar() {
  const [index, setIndex] = useState(0);
  // 맨 첫 화면(사진·영상)이 보이는 동안에는 상단 표시를 숨긴다
  const [onHero, setOnHero] = useState(true);

  useEffect(() => {
    const sections = PAGES.map((p) => document.getElementById(p.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = PAGES.findIndex((p) => p.id === entry.target.id);
            if (i >= 0) setIndex(i);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));

    const hero = document.getElementById("hero");
    const heroIo = new IntersectionObserver(([e]) => setOnHero(e.isIntersecting), { threshold: 0.35 });
    if (hero) heroIo.observe(hero);

    return () => {
      io.disconnect();
      heroIo.disconnect();
    };
  }, []);
  const progress = ((index + 1) / PAGES.length) * 100;

  return (
    <>
      <div className={`progress ${onHero ? "is-hidden" : ""}`} style={{ width: `${progress}%` }} aria-hidden="true" />
      <header className={`topbar ${onHero ? "is-hidden" : ""}`}>
        <a className="topbar__brand" href={`#${PAGES[0].id}`}>
          Omoi Letter
        </a>
        <AccountLink />
      </header>
    </>
  );
}
