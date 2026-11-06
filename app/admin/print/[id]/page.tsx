"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { draftSchema } from "@/lib/account/validation";
import PrintBook from "@/components/admin/PrintBook";
import type { Draft } from "@/lib/letter/types";
import type { AdminDetail } from "@/lib/admin/types";

export default function AdminPrintPage() {
  return <Suspense fallback={<p>포토북을 불러오는 중…</p>}><AdminPrintBody /></Suspense>;
}
function AdminPrintBody() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ draft: Draft; urls: Record<string, string> } | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/orders/${id}`, { cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "주문을 불러오지 못했어요.");
      const detail = result as AdminDetail, draft = draftSchema.parse(detail.order.book_snapshot.draft) as Draft;
      const assets = detail.order.book_snapshot.assets ?? [];
      const ids = [draft.coverPhotoId, ...Object.values(draft.photoByQuestion), ...(draft.bookPhotos ?? []).map(p => p.photoId)].filter(Boolean);
      if (ids.some(id => !assets.some(a => a.photo_id === id))) throw new Error("주문 사진이 누락되어 있어요. PDF를 생성할 수 없어요.");
      if (alive) setData({ draft, urls: Object.fromEntries(assets.map(a => [a.photo_id, `/api/admin/orders/${id}/photos/${encodeURIComponent(a.photo_id)}`])) });
    }).catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, [id]);
  if (error) return <p data-print-error role="alert">{error}</p>;
  return data ? <PrintBook draft={data.draft} photoUrls={data.urls} /> : <p>포토북을 불러오는 중…</p>;
}
