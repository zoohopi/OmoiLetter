"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "./ScaledPage.css";

// 실제 크기(mm)로 그린 쪽을 들어갈 칸 너비에 맞춰 줄여 보여준다.
export default function ScaledPage({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const scale = o.clientWidth / i.offsetWidth;
      i.style.transform = `scale(${scale})`;
      o.style.height = `${i.offsetHeight * scale}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="scaled" ref={outer}>
      <div className="scaled__inner" ref={inner}>
        {children}
      </div>
    </div>
  );
}
