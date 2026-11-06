"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { getGuestDraft, importGuestDraft, useDraft, createDraft, copyCurrentDraft } from "@/lib/letter/store";
import { openBook } from "@/lib/account/cloud";

type Address = { id: string; label: string; recipient_name: string; phone: string; postal_code: string; address1: string; address2: string; delivery_note: string };
type Book = { id: string; title: string; status: "draft" | "submitted"; updated_at: string; revision: number };
type Shipment = { carrier: string | null; tracking_number: string | null; status: string };
type Order = { id: string; order_number: string; status: string; book_id: string; created_at: string; shipping_address: { recipient_name: string; address1: string; address2: string }; shipments: Shipment[] };
type AccountData = { isAdmin?: boolean; user: { email: string | null }; profile: { display_name: string; phone: string } | null; books: Book[]; addresses: Address[]; orders: Order[] };
const STATUS: Record<string, string> = { requested: "주문 요청 접수", awaiting_payment: "결제 대기", paid: "결제 완료", producing: "제작 중", shipped: "배송 중", delivered: "배송 완료", cancelled: "취소됨", preparing: "발송 준비", returned: "반송됨" };
async function request(url: string, body?: unknown) {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "처리하지 못했어요. 다시 시도해 주세요.");
  return data;
}
const fields = (event: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(event.currentTarget));

export default function AccountPage() {
  const { user, loading, configured, saving, saveError, saveNow, signOut } = useAccount();
  const draft = useDraft(); const router = useRouter();
  const [record, setRecord] = useState<{ owner: string; data: AccountData } | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const data = record?.owner === user?.id ? record?.data : null;
  const [tab, setTab] = useState("books"), [busy, setBusy] = useState(false), [guest, setGuest] = useState(false);
  const [orderBook, setOrderBook] = useState<string | null>(null);
  const reload = useCallback(async () => { if (!user) return; const data = await request("/api/account"); setRecord({ owner: user.id, data }); }, [user]);
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!user) return;
    let alive = true;
    request("/api/account").then(data => { if (alive) { setRecord({ owner: user.id, data }); setGuest(!!getGuestDraft()); } }).catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, [user, loading, router]);
  const run = async (job: () => Promise<void>) => {
    if (busy || saving) return; setBusy(true); setError(""); setMessage("");
    try { await job(); } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); } finally { setBusy(false); }
  };
  if (loading) return <main className="account-shell"><p>보관함을 여는 중이에요…</p></main>;
  if (!user) return <main className="account-shell"><Link href="/login">로그인하고 내 책 보관하기 →</Link>{!configured && <p>로그인 연결을 준비 중이에요.</p>}</main>;
  const save = async () => { const id = await saveNow(); if (!id) throw new Error("책을 저장하지 못했어요. 아래 저장 상태를 확인해 주세요."); await reload(); setMessage("책을 보관했어요."); };
  const continueBook = (book: Book) => void run(async () => {
    if (draft && draft.cloudSavedAt !== draft.updatedAt) { if (!await saveNow()) throw new Error("지금 작업한 책을 먼저 저장해 주세요."); }
    await openBook(book.id, user.id); router.push(book.status === "submitted" ? "/letter/done" : "/start");
  });
  return <main className="account-shell"><div className="account-container">
    <header className="account-header"><Link href="/" className="account-brand">Omoi Letter</Link>{data?.isAdmin && <Link href="/admin" className="account-text-link">관리자 페이지 →</Link>}<button className="account-text-link" disabled={busy || saving} onClick={() => void run(async () => { await signOut(); router.replace("/"); })}>로그아웃</button></header>
    <p className="account-eyebrow">MY OMOI LETTER</p><h1>{data?.profile?.display_name || "당신"}의 책 보관함</h1>
    <p className="account-intro">쓰고 있던 마음부터, 전해진 책까지.</p>
    <nav className="account-tabs" aria-label="마이페이지"><button className={tab === "books" ? "is-active" : ""} onClick={() => setTab("books")}>내 책</button><button className={tab === "orders" ? "is-active" : ""} onClick={() => setTab("orders")}>주문·배송</button><button className={tab === "profile" ? "is-active" : ""} onClick={() => setTab("profile")}>회원정보·배송지</button></nav>
    {error && <p role="alert" className="account-error">{error}</p>}{saveError && <div role="alert" className="account-error"><p>{saveError}</p>{saveError.includes("다른 기기에") && <button className="account-button account-button--outline" onClick={() => { copyCurrentDraft(); setMessage("현재 작업을 새 책으로 보관하고 있어요. 기존 최신 책도 그대로 남아요."); }}>현재 작업을 새 책으로 보관</button>}</div>}{message && <p role="status" className="account-notice">{message}</p>}
    {tab === "books" && <>
      {draft && <section className="account-card account-current"><div><h2>지금 작업 중인 책</h2><p>{draft.recipientName || "나의 편지책"}</p><p className="account-fine" role="status">{saving ? "사진과 책을 보관하는 중…" : draft.cloudSavedAt === draft.updatedAt ? "계정에 저장됨" : "이 기기에 저장됨 · 계정에 보관 대기"}</p></div><div className="account-actions"><Link className="account-button" href={draft.status === "submitted" ? "/letter/done" : "/start"}>이어서 보기</Link><button className="account-button account-button--outline" disabled={busy || saving} onClick={() => void run(save)}>지금 보관하기</button></div></section>}
      {guest && <section className="account-card"><h2>로그인 전에 만들던 책이 있나요?</h2><p>이 기기에 있는 책을 내 계정으로 가져올 수 있어요.</p><button className="account-button account-button--outline" disabled={busy || saving} onClick={() => void run(async () => {
        if (draft && draft.cloudSavedAt !== draft.updatedAt && !await saveNow()) throw new Error("현재 책을 먼저 보관해 주세요.");
        await importGuestDraft(user.id); setMessage("책을 가져왔어요. 사진과 원고를 계정에 보관하고 있어요.");
      })}>이 기기의 책 가져오기</button></section>}
      <div className="account-section-heading"><h2>보관한 책 {data?.books.length ?? 0}권</h2><button className="account-text-link" disabled={busy || saving} onClick={() => void run(async () => {
        if (draft && draft.cloudSavedAt !== draft.updatedAt && !await saveNow()) throw new Error("현재 책을 먼저 보관해 주세요.");
        createDraft(); router.push("/start");
      })}>새 책 만들기 +</button></div>
      <div className="account-book-grid">{data?.books.map(book => <article key={book.id} className="account-card"><p className="account-eyebrow">{book.status === "submitted" ? "완성한 책" : "작성 중"}</p><h3>{book.title}</h3><p className="account-fine">{new Date(book.updated_at).toLocaleDateString("ko-KR")} 저장</p><div className="account-actions"><button className="account-button" disabled={busy || saving} onClick={() => continueBook(book)}>책 열기</button>{book.status === "submitted" && <button className="account-button account-button--outline" onClick={() => { setOrderBook(book.id); setTab("orders"); }}>주문 요청</button>}</div></article>)}</div>
      {data && !data.books.length && <p className="account-empty">첫 편지책을 만들어 보세요. 로그인한 동안 작업은 자동으로 보관돼요.</p>}
    </>}
    {tab === "orders" && <>
      {orderBook && <form className="account-card account-form" onSubmit={event => { event.preventDefault(); const values = fields(event); void run(async () => { await request("/api/orders", { bookId: orderBook, addressId: values.addressId }); setOrderBook(null); await reload(); setMessage("주문 요청을 접수했어요. 결제·제작 확정 전 단계예요."); }); }}><h2>이 책을 어디로 보내 드릴까요?</h2><label>배송지<select name="addressId" required defaultValue=""><option value="" disabled>저장한 배송지를 선택해 주세요</option>{data?.addresses.map(a => <option key={a.id} value={a.id}>{a.label} · {a.recipient_name} · {a.address1}</option>)}</select></label>{!data?.addresses.length && <button type="button" className="account-text-link" onClick={() => setTab("profile")}>배송지 먼저 추가하기 →</button>}<p className="account-fine">주문 요청만 저장합니다. 결제나 제작이 자동으로 진행되지는 않아요.</p><button className="account-button" disabled={busy || !data?.addresses.length}>주문 요청 저장</button></form>}
      {data?.orders.map(order => <article className="account-card" key={order.id}><div className="account-section-heading"><h2>{STATUS[order.status] || order.status}</h2><span className="account-fine">{new Date(order.created_at).toLocaleDateString("ko-KR")}</span></div><p className="account-fine">{order.order_number}</p><p>{order.shipping_address.recipient_name} · {order.shipping_address.address1} {order.shipping_address.address2}</p>{order.shipments.map((s, i) => <p key={i}>{STATUS[s.status] || s.status} · {s.carrier || "택배사 등록 전"} {s.tracking_number || ""}</p>)}</article>)}
      {data && !data.orders.length && !orderBook && <p className="account-empty">아직 주문한 책이 없어요. 완성한 책에서 주문을 요청할 수 있어요.</p>}
    </>}
    {tab === "profile" && <div className="account-details-grid"><form className="account-card account-form" key={data?.profile?.display_name ?? "profile"} onSubmit={event => { event.preventDefault(); const values = fields(event); void run(async () => { await request("/api/account", { action: "profile", data: values }); await reload(); setMessage("회원정보를 저장했어요."); }); }}><h2>회원정보</h2><p className="account-fine">{data?.user.email || "이메일 제공 안 됨"}</p><label>이름 또는 애칭<input name="displayName" required maxLength={50} defaultValue={data?.profile?.display_name} autoComplete="name" /></label><label>연락처<input name="phone" required maxLength={20} defaultValue={data?.profile?.phone} type="tel" autoComplete="tel" /></label><button className="account-button" disabled={busy}>회원정보 저장</button></form>
      <div><section className="account-card"><h2>보관한 배송지</h2>{data?.addresses.map(a => <div className="account-address" key={a.id}><b>{a.label} · {a.recipient_name}</b><p>{a.phone}<br />({a.postal_code}) {a.address1} {a.address2}<br />{a.delivery_note}</p><button className="account-text-link" disabled={busy} onClick={() => void run(async () => { await request("/api/account", { action: "delete-address", id: a.id }); await reload(); })}>삭제</button></div>)}{!data?.addresses.length && <p>아직 저장된 배송지가 없어요.</p>}</section>
      <form className="account-card account-form" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const values = fields(event); void run(async () => { await request("/api/account", { action: "address", data: values }); form.reset(); await reload(); setMessage("배송지를 보관했어요."); }); }}><h2>배송지 추가</h2><label>배송지 이름<input name="label" required maxLength={30} placeholder="집, 선물 받을 곳" /></label><label>받는 분<input name="recipientName" required maxLength={50} autoComplete="shipping name" /></label><label>연락처<input name="phone" required maxLength={20} type="tel" autoComplete="shipping tel" /></label><label>우편번호<input name="postalCode" required pattern="[0-9]{5}" maxLength={5} inputMode="numeric" autoComplete="shipping postal-code" /></label><label>주소<input name="address1" required minLength={3} maxLength={200} autoComplete="shipping address-line1" /></label><label>상세 주소<input name="address2" maxLength={200} autoComplete="shipping address-line2" /></label><label>배송 메모<input name="deliveryNote" maxLength={200} /></label><button className="account-button" disabled={busy}>배송지 저장</button></form></div></div>}
  </div></main>;
}
