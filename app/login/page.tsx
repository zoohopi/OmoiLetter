"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/components/account/AccountProvider";
import { browserSupabase } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/account/validation";

export default function LoginPage() {
  const { user, loading, configured } = useAccount(); const router = useRouter();
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  useEffect(() => {
    if (user) router.replace(safeReturnPath(new URLSearchParams(location.search).get("next")));
    else if (new URLSearchParams(location.search).has("error")) Promise.resolve().then(() => setError("로그인을 마치지 못했어요. 다시 시도해 주세요."));
  }, [user, router]);
  const login = async (provider: "kakao" | "google") => {
    setBusy(provider); setError("");
    try {
      const next = safeReturnPath(new URLSearchParams(location.search).get("next"));
      const callback = new URL("/auth/callback", location.origin); callback.searchParams.set("next", next);
      const { error } = await browserSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: callback.href } });
      if (error) throw error;
    } catch { setError("로그인에 연결하지 못했어요. 잠시 후 다시 시도해 주세요."); setBusy(""); }
  };
  return <main className="account-shell"><div className="account-login account-card">
    <Link className="account-brand" href="/">Omoi Letter</Link>
    <h1>당신의 마음을<br />오래 보관할게요.</h1>
    <p>로그인하면 만들던 책을 이어 쓰고,<br />주문과 배송 내역을 확인할 수 있어요.</p>
    {!configured && <p className="account-notice" role="status">로그인 연결을 준비 중이에요. 지금도 책을 만들 수 있고, 작업은 이 기기에 보관돼요.</p>}
    <button className="oauth-button oauth-button--kakao" disabled={!configured || !!busy || loading} onClick={() => void login("kakao")}><span aria-hidden>●</span>{busy === "kakao" ? "연결 중…" : "카카오로 시작하기"}</button>
    <button className="oauth-button oauth-button--google" disabled={!configured || !!busy || loading} onClick={() => void login("google")}><span aria-hidden>G</span>{busy === "google" ? "연결 중…" : "Google로 시작하기"}</button>
    {error && <p role="alert" className="account-error">{error}</p>}
    <p className="account-fine">처음 로그인하면 회원 계정이 만들어져요.<br />로그인 전 작성한 책은 보관함에서 직접 가져올 수 있어요.</p>
    <Link href="/" className="account-text-link">홈으로 돌아가기</Link>
  </div></main>;
}

