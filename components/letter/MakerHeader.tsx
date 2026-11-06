"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useDraft } from "@/lib/letter/store";
import AccountLink from "@/components/account/AccountLink";
import { useAccount } from "@/components/account/AccountProvider";
import type { Step } from "@/lib/letter/types";

const STEPS: { step: Step; label: string; href: string }[] = [
  { step: "order", label: "1 표지", href: "/start" },
  { step: "photos", label: "2 사진", href: "/letter/photos" },
  { step: "interview", label: "3 편지", href: "/letter/interview" },
  { step: "preview", label: "4 미리보기", href: "/letter/preview" },
];

// 20초 단위 시계. 서버 렌더링(미리 그리기) 때는 0 — 현재 시각을 고정해 버리지 않도록.
const TICK = 20_000;
function subscribeClock(cb: () => void) {
  const t = setInterval(cb, TICK);
  return () => clearInterval(t);
}
const readClock = () => Math.floor(Date.now() / TICK) * TICK;

function savedLabel(iso: string, now: number) {
  const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "저장됨 · 방금 전";
  if (sec < 3600) return `저장됨 · ${Math.floor(sec / 60)}분 전`;
  return `저장됨 · ${Math.floor(sec / 3600)}시간 전`;
}

export default function MakerHeader() {
  const pathname = usePathname();
  const account = useAccount();
  const draft = useDraft();
  const now = useSyncExternalStore(subscribeClock, readClock, () => 0);

  const current = STEPS.findIndex((s) => pathname.startsWith(s.href));
  const reached = draft ? STEPS.findIndex((s) => s.step === draft.step) : -1;
  const locked = draft?.status === "submitted";

  return (
    <header className="mk-head">
      <div className="mk-head__row">
        <Link className="mk-head__brand" href="/">
          Omoi Letter
        </Link>
        {draft && <span className={`mk-saved account-sync-state ${account.saveError ? "is-error" : ""}`} title={account.saveError || undefined}>{account.user ? account.saveError ? "계정 저장 실패 · 보관함에서 다시 시도" : account.saving ? "계정에 보관 중…" : draft.cloudSavedAt === draft.updatedAt ? "계정에 저장됨" : "이 기기에 저장됨" : locked ? "확정됨 · 이 기기에 저장됨" : `이 기기에 ${savedLabel(draft.updatedAt, now)}`}</span>}
        <AccountLink />
      </div>
      {current >= 0 && (
        <ol className="mk-steps">
          {STEPS.map((s, i) => {
            const cls = i === current ? "is-current" : i <= Math.max(reached, current) ? "is-done" : "";
            const canGo = !locked && i <= Math.max(reached, current);
            return (
              <li key={s.step} className={cls}>
                {canGo ? <Link href={s.href}>{s.label}</Link> : <span>{s.label}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </header>
  );
}
