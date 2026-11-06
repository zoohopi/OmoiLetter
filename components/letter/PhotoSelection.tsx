"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { beginDraftEdit, endDraftEdit } from "@/lib/letter/store";
import type { PhotoTransform } from "@/lib/letter/types";

type Props = { anchor: RefObject<HTMLDivElement | null>; url: string; width: number; height: number; imageWidth: number; imageHeight: number; value: PhotoTransform; change: (v: PhotoTransform) => void; remove: () => void; finish: () => void };

export default function PhotoSelection({ anchor, url, width, height, imageWidth, imageHeight, value, change, remove, finish }: Props) {
  const [bounds, setBounds] = useState<{ left: number; top: number; unit: number } | null>(null);
  const gesture = useRef<{ x: number; y: number; value: PhotoTransform; unit: number; corner?: [number, number] } | null>(null);
  useLayoutEffect(() => {
    const el = anchor.current; if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBounds({ left: r.left, top: r.top, unit: r.width / width }); };
    measure(); const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, [anchor, width]);
  useEffect(() => { const handle = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); }; window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle); }, [finish]);
  if (!bounds) return null;
  const { unit } = bounds;
  const end = () => { gesture.current = null; endDraftEdit(); };
  return createPortal(<div className="photo-selection" role="group" aria-label="원본 사진 직접 편집"
    style={{ left: bounds.left + ((width - imageWidth * value.scale) / 2 + value.x) * unit,
      top: bounds.top + ((height - imageHeight * value.scale) / 2 + value.y) * unit,
      width: imageWidth * value.scale * unit, height: imageHeight * value.scale * unit }}
    onPointerDown={(e) => {
      if ((e.target as HTMLElement).closest(".photo-selection__delete, .photo-selection__done")) return;
      e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); beginDraftEdit();
      const corner = (e.target as HTMLElement).closest<HTMLElement>("[data-corner]")?.dataset.corner;
      gesture.current = { x: e.clientX, y: e.clientY, value, unit, corner: corner ? corner.split(",").map(Number) as [number, number] : undefined };
    }}
    onPointerMove={(e) => {
      const g = gesture.current; if (!g) return;
      const dx = (e.clientX - g.x) / g.unit, dy = (e.clientY - g.y) / g.unit;
      if (!g.corner) { change({ ...g.value, x: g.value.x + dx, y: g.value.y + dy }); return; }
      const [sx, sy] = g.corner;
      const w = imageWidth * g.value.scale, h = imageHeight * g.value.scale;
      const scale = Math.max(.1, Math.min(6, g.value.scale * (1 + (dx * sx * w + dy * sy * h) / (w * w + h * h))));
      change({ scale, x: g.value.x + sx * imageWidth * (scale - g.value.scale) / 2,
        y: g.value.y + sy * imageHeight * (scale - g.value.scale) / 2 });
    }} onPointerUp={end} onPointerCancel={end}>
    {/* eslint-disable-next-line @next/next/no-img-element -- local full image, deliberately no crop */}
    <img src={url} alt="불투명도 60% 원본 사진" draggable={false} />
    {([[-1,-1],[1,-1],[-1,1],[1,1]] as [number,number][]).map(([x,y]) => <button
      key={`${x},${y}`} type="button" data-corner={`${x},${y}`} className="photo-selection__handle"
      aria-label={`${y < 0 ? "위" : "아래"} ${x < 0 ? "왼쪽" : "오른쪽"} 사진 크기 조절`}
      style={{ left:x < 0 ? 0 : "100%", top:y < 0 ? 0 : "100%", cursor:x === y ? "nwse-resize" : "nesw-resize" }}
      onKeyDown={(e) => { if(e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); change({ ...value, scale: Math.max(.1, Math.min(6, value.scale + (e.key === "ArrowUp" ? .05 : -.05))) }); } }} />)}
    <button type="button" className="photo-selection__done" onPointerDown={(e) => e.stopPropagation()} onClick={finish}>완료</button>
    <button type="button" className="photo-selection__delete" aria-label="사진 삭제" onPointerDown={(e) => e.stopPropagation()} onClick={remove}>×</button>
  </div>, document.body);
}
