"use client";

import { updateDraft } from "@/lib/letter/store";
import { designOf, layoutOf, type DesignId, type LayoutId } from "@/lib/letter/designs";

// 선택한 사진 페이지의 가로·세로·풀페이지 레이아웃을 저장한다.
export default function LayoutPick({ design, qid, value }: { design?: DesignId; qid: string; value?: LayoutId }) {
  const d = designOf(design);
  const current = layoutOf(d, value).id;
  return (
    <div className="layout-pick" role="group" aria-label="펼침 레이아웃">
      {d.layouts.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={current === l.id}
          onClick={() => updateDraft((dr) => ({ photoLayout: { ...dr.photoLayout, [qid]: l.id } }))}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
