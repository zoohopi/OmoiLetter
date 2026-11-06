"use client";

// 펼쳐진 책 한 권. index(몇 번째 펼침)가 바뀌면 오른쪽(앞으로) / 왼쪽(뒤로) 장이 3D로 넘어간다.
// render(i, side, live): i번째 펼침의 한 면. live=false면 넘어가는 중이라 고칠 수 없는 모습으로 그린다.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Side } from "./BookPage";

const FLIP_MS = 900;

type Flip = { from: number; to: number; dir: 1 | -1 };

export default function BookSpread({
  index,
  render,
  active,
}: {
  index: number;
  render: (i: number, side: Side, live: boolean) => ReactNode;
  /** 지금 채우는 면 (살짝 강조) */
  active?: Side;
}) {
  const [flip, setFlip] = useState<Flip | null>(null);
  const shown = useRef(index);

  useEffect(() => {
    const from = shown.current;
    if (from === index) return;
    shown.current = index;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setFlip({ from, to: index, dir: index > from ? 1 : -1 });
    const t = setTimeout(() => setFlip(null), FLIP_MS);
    return () => clearTimeout(t);
  }, [index]);

  // 넘어가는 동안: 앞으로면 왼쪽은 아직 이전 장, 오른쪽은 이미 다음 장이 깔려 있다 (뒤로는 반대)
  const leftBase = flip && flip.dir === 1 ? render(flip.from, "left", false) : render(index, "left", !flip);
  const rightBase = flip && flip.dir === -1 ? render(flip.from, "right", false) : render(index, "right", !flip);

  return (
    <div className="book3d">
      <div className={`book3d__book ${flip ? "is-flipping" : ""}`}>
        <div className={`book3d__page book3d__page--left ${active === "left" && !flip ? "is-active" : ""}`}>{leftBase}</div>
        <div className={`book3d__page book3d__page--right ${active === "right" && !flip ? "is-active" : ""}`}>{rightBase}</div>
        {flip && (
          <div key={`${flip.from}-${flip.to}`} className={`book3d__leaf book3d__leaf--${flip.dir === 1 ? "fwd" : "back"}`}>
            <div className="book3d__face">{render(flip.from, flip.dir === 1 ? "right" : "left", false)}</div>
            <div className="book3d__face book3d__face--back">{render(flip.to, flip.dir === 1 ? "left" : "right", false)}</div>
          </div>
        )}
        <div className="book3d__spine" aria-hidden />
      </div>
    </div>
  );
}
