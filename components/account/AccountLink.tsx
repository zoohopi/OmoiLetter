"use client";
import Link from "next/link";
import { useAccount } from "./AccountProvider";

export default function AccountLink({ start = false }: { start?: boolean }) {
  const { user, loading } = useAccount();
  return (
    <Link className="account-nav-link" href={start ? user ? "/start" : "/login?next=%2Fstart" : user ? "/account" : "/login"}>
      {user && !start ? (
        <svg className="account-nav-link__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" /><path d="M5 20v-2a7 7 0 0 1 14 0v2" />
        </svg>
      ) : (
        <span className="account-nav-link__envelope" aria-hidden="true">✉️<span className="account-nav-link__heart">♥</span></span>
      )}
      <span>{loading ? "…" : start ? "제작하기" : user ? "내정보" : "로그인"}</span>
    </Link>
  );
}


