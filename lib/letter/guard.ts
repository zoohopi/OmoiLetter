"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "./store";

/** 작성 중인 편지가 없으면 시작 화면으로, 확정된 편지면 완료 화면으로 보낸다. */
export function useDraftGuard({ allowSubmitted = false, requireCover = false } = {}) {
  const draft = useDraft();
  const router = useRouter();

  useEffect(() => {
    if (draft === null) router.replace("/start");
    else if (draft && draft.status === "submitted" && !allowSubmitted) router.replace("/letter/done");
    else if (draft && requireCover && !draft.coverPhotoId) router.replace("/start");
  }, [draft, router, allowSubmitted, requireCover]);

  if (!draft) return null;
  if (draft.status === "submitted" && !allowSubmitted) return null;
  if (requireCover && !draft.coverPhotoId) return null;
  return draft;
}
