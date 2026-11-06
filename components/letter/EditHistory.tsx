"use client";

import { useEffect } from "react";
import { undoDraft, redoDraft, useDraftHistory } from "@/lib/letter/store";

export default function EditHistory({ disabled = false }: { disabled?: boolean }) {
  const { canUndo, canRedo } = useDraftHistory();
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (disabled || target.closest("input, textarea, select, [contenteditable=true]") || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault(); if (event.shiftKey) redoDraft(); else undoDraft();
      } else if (event.key.toLowerCase() === "y") { event.preventDefault(); redoDraft(); }
    };
    window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle);
  }, [disabled]);
  return <div className="edit-history" role="group" aria-label="편집 이력">
    <button className="link-btn" type="button" disabled={disabled || !canUndo} onClick={undoDraft}>↶ 실행 취소</button>
    <button className="link-btn" type="button" disabled={disabled || !canRedo} onClick={redoDraft}>↷ 다시 실행</button>
  </div>;
}
