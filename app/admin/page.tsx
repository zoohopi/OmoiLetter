"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ORDER_STATUS, type AdminList, type AdminDetail, type Stage } from "@/lib/admin/types";

const TABS: { id: Stage; label: string }[] = [{ id: "todo", label: "발주할 것" }, { id: "progress", label: "발주 완료 · 배송 중" }, { id: "done", label: "배송 완료 · 취소" }];
const date = (value: string | null) => value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
const EVENT_LABEL: Record<string, string> = { mark_ordered: "발주 완료 기록", mark_shipped: "송장 등록 · 배송 시작", mark_delivered: "배송 완료", save_note: "관리 메모 저장", pdf_created: "포토북 PDF 생성" };
async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "처리하지 못했어요.");
  return data;
}
export default function AdminPage() {
  const [stage, setStage] = useState<Stage>("todo"), [search, setSearch] = useState(""), [query, setQuery] = useState(""), [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<AdminList | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [detail, setDetail] = useState<AdminDetail | null>(null), [selected, setSelected] = useState<string | null>(null), [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [detailError, setDetailError] = useState("");
  const [note, setNote] = useState(""), [carrier, setCarrier] = useState(""), [tracking, setTracking] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), detailRequest = useRef(0);
  const url = `/api/admin/orders?stage=${stage}&search=${encodeURIComponent(query)}&offset=${offset}&refresh=${refresh}`;
  const reload = useCallback(async () => { const result = await api<AdminList>(url); setData(result); }, [url]);
  useEffect(() => {
    let alive = true;
    api<AdminList>(url).then(result => { if (alive) { setData(result); setError(""); } }).catch(e => alive && setError(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [url]);
  const chooseStage = (next: Stage) => { setStage(next); setOffset(0); setData(null); setLoading(true); setRefresh(n => n + 1); };
  const open = async (id: string) => {
    const request = ++detailRequest.current;
    setSelected(id); setDetail(null); setDetailError(""); setDetailLoading(true); setMessage("");
    if (!dialog.current?.open) dialog.current?.showModal();
    try {
      const result = await api<AdminDetail>(`/api/admin/orders/${id}`);
      if (request !== detailRequest.current) return;
      setDetail(result); setNote(result.order.production_note); setCarrier(""); setTracking("");
    } catch (e) { if (request === detailRequest.current) setDetailError(e instanceof Error ? e.message : "주문을 불러오지 못했어요."); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  };
  const close = () => { if (busy) return; detailRequest.current++; dialog.current?.close(); setSelected(null); setDetail(null); };
  const action = async (kind: "mark_ordered" | "mark_shipped" | "mark_delivered" | "save_note") => {
    if (!detail || busy) return;
    if (kind === "mark_ordered" && !confirm("제작소에 직접 발주를 넣으셨나요? 확인하면 이 주문을 ‘발주 완료·제작 중’으로 옮깁니다.")) return;
    if (kind === "mark_delivered" && !confirm("배송 완료를 확인하셨나요?")) return;
    setBusy(true); setDetailError(""); setMessage("");
    try {
      await api(`/api/admin/orders/${detail.order.id}`, { action: kind, revision: detail.order.admin_revision, note, carrier, tracking });
      const result = await api<AdminDetail>(`/api/admin/orders/${detail.order.id}`); setDetail(result); setNote(result.order.production_note);
      await reload(); setMessage(kind === "mark_ordered" ? "발주 완료·제작 중으로 옮겼어요." : kind === "mark_shipped" ? "송장을 등록하고 배송 중으로 옮겼어요." : kind === "mark_delivered" ? "배송 완료로 옮겼어요." : "메모를 저장했어요.");
    } catch (e) { setDetailError(e instanceof Error ? e.message : "처리하지 못했어요."); }
    finally { setBusy(false); }
  };
  const pdf = async () => {
    if (!detail || busy) return;
    setBusy(true); setDetailError(""); setMessage("PDF를 준비하고 있어요. 사진이 많으면 잠시 걸릴 수 있어요.");
    try {
      const response = await fetch(`/api/admin/orders/${detail.order.id}/pdf`, { cache: "no-store" });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "PDF를 만들지 못했어요."); }
      if (!response.headers.get("Content-Type")?.includes("application/pdf")) throw new Error("PDF 응답을 확인하지 못했어요.");
      const url = URL.createObjectURL(await response.blob()), a = document.createElement("a");
      a.href = url; a.download = `${detail.order.order_number}-photobook.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      const result = await api<AdminDetail>(`/api/admin/orders/${detail.order.id}`); setDetail(result);
      await reload(); setMessage("PDF를 내려받았어요. 제작소에 전달하기 전 파일을 확인해 주세요.");
    } catch (e) { setMessage(""); setDetailError(e instanceof Error ? e.message : "PDF를 만들지 못했어요."); }
    finally { setBusy(false); }
  };
  return <main className="admin-shell"><div className="admin-container">
    <header className="admin-header"><Link href="/">Omoi Letter <span>ADMIN</span></Link><nav><Link href="/account">내 계정</Link><Link href="/login?next=/admin">관리자 로그인</Link></nav></header>
    <div className="admin-heading"><div><p className="admin-eyebrow">DAILY PRODUCTION DESK</p><h1>오늘 보낼 마음</h1><p>고객·배송지·제작 파일을 확인하고 발주를 기록하세요.</p></div><button className="admin-button admin-button--light" onClick={() => { setLoading(true); setError(""); void reload().catch(e => setError(e.message)).finally(() => setLoading(false)); }} disabled={loading}>새로고침</button></div>
    <div className="admin-stats">{TABS.map(tab => <button key={tab.id} onClick={() => chooseStage(tab.id)} className={stage === tab.id ? "is-active" : ""}><span>{tab.label}</span><b>{data ? data.counts[tab.id] : "—"}</b></button>)}</div>
    <form className="admin-search" onSubmit={event => { event.preventDefault(); setQuery(search); setOffset(0); setData(null); setLoading(true); setRefresh(n => n + 1); }}><input aria-label="주문 검색" placeholder="주문번호, 고객 이름, 연락처, 받는 분 검색" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} /><button className="admin-button" type="submit">검색</button></form>
    {error && <div role="alert" className="admin-alert"><p>{error}</p><Link href="/login?next=/admin">관리자 계정으로 로그인 →</Link></div>}
    <section className="admin-orders"><div className="admin-section-title"><h2>{TABS.find(t => t.id === stage)?.label}</h2><span>오래된 주문부터 · 한국 시간 기준</span></div>
      {stage === "todo" && <p className="admin-hint">제작소에 발주를 넣은 뒤 ‘발주 완료’를 눌러 주세요. 결제 미연동 주문은 결제 여부를 별도로 확인하세요.</p>}
      {loading ? <p className="admin-empty" role="status">주문을 확인하고 있어요…</p> : data && data.orders.length === 0 ? <p className="admin-empty">{query ? "검색 결과가 없어요." : "이 구분에 해당하는 주문이 없어요."}</p> : data && <div className="admin-table-wrap"><table><thead><tr><th>주문·상태</th><th>고객</th><th>받는 분·배송지</th><th>제작 파일</th><th>관리</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td><span className={`admin-status admin-status--${order.status}`}>{ORDER_STATUS[order.status] || order.status}</span><b className="admin-book-name">{order.book_name || "편지책"}</b><small>{order.order_number}</small><small>주문 {date(order.created_at)}{order.production_ordered_at && <> · 발주 {date(order.production_ordered_at)}</>}</small></td><td><b>{order.customer_name || "이름 미등록"}</b><small>{order.customer_phone || order.email || "연락처 미등록"}</small></td><td><b>{order.shipping_address.recipient_name}</b><small>{order.shipping_address.phone}</small><p>{order.shipping_address.address1} {order.shipping_address.address2}</p></td><td><span className={order.pdf_ready ? "admin-pdf-ready" : ""}>{order.pdf_ready ? "PDF 보관됨" : "첫 다운로드 시 생성"}</span></td><td><button className="admin-button admin-button--light" onClick={() => void open(order.id)}>주문 열기</button></td></tr>)}</tbody></table></div>}
      {data && data.total > 50 && <div className="admin-pagination"><button disabled={offset === 0} onClick={() => { setOffset(Math.max(0, offset - 50)); setLoading(true); }}>이전</button><span>{offset + 1}–{Math.min(offset + 50, data.total)} / {data.total}건</span><button disabled={offset + 50 >= data.total} onClick={() => { setOffset(offset + 50); setLoading(true); }}>다음</button></div>}
    </section>
    <dialog className="admin-detail" ref={dialog} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="admin-detail-title"><div className="admin-detail-head"><h2 id="admin-detail-title">주문 상세</h2><button aria-label="주문 상세 닫기" disabled={busy} onClick={close}>×</button></div>
      {detailLoading && <p className="admin-empty">주문을 불러오는 중…</p>}{detailError && <p role="alert" className="admin-alert">{detailError}</p>}{message && <p role="status" className="admin-notice">{message}</p>}
      {selected && detail && <><div className="admin-detail-summary"><span className={`admin-status admin-status--${detail.order.status}`}>{ORDER_STATUS[detail.order.status]}</span><h3>{detail.order.book_snapshot.draft.recipientName}의 편지책</h3><small>{detail.order.order_number}</small><p>주문 {date(detail.order.created_at)} · 발주 {date(detail.order.production_ordered_at)}</p></div>
        <div className="admin-detail-grid"><section><h3>고객 정보</h3><dl><dt>이름</dt><dd>{detail.customer.name || "미등록"}</dd><dt>연락처</dt><dd>{detail.customer.phone || "미등록"}</dd><dt>이메일</dt><dd>{detail.customer.email || "제공 안 됨"}</dd></dl></section><section><h3>배송 받을 주소</h3><dl><dt>받는 분</dt><dd>{detail.order.shipping_address.recipient_name}</dd><dt>연락처</dt><dd>{detail.order.shipping_address.phone}</dd><dt>주소</dt><dd>({detail.order.shipping_address.postal_code})<br />{detail.order.shipping_address.address1}<br />{detail.order.shipping_address.address2}</dd><dt>배송 메모</dt><dd>{detail.order.shipping_address.delivery_note || "없음"}</dd></dl><p className="admin-hint">주문 당시 저장된 배송지입니다.</p></section></div>
        <section className="admin-detail-section"><h3>제작한 포토북 PDF</h3><p>{detail.order.book_snapshot.draft.design === "magazine" ? "매거진" : "미니멀"} · 표지 + 내지 + 뒷표지 · 217×217mm (재단 211mm + 사방 3mm)</p><div className="admin-detail-actions"><button className="admin-button" disabled={busy} onClick={() => void pdf()}>{busy ? "처리 중…" : "포토북 PDF 다운로드"}</button><a className="admin-button admin-button--light" target="_blank" rel="noreferrer" href={`/admin/print/${detail.order.id}`}>원고 미리보기 ↗</a></div><p className="admin-hint">주문 당시 원고와 원본 사진으로 생성·보관합니다. 제본용 표지 펼침과 책등 두께는 제작소 사양 확인이 필요합니다.</p></section>
        <section className="admin-detail-section"><h3>발주 관리</h3><label className="admin-label">제작소·발주 메모<textarea maxLength={2000} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="제작소명, 발주 번호, 요청 사항" /></label><div className="admin-detail-actions"><button className="admin-button admin-button--light" disabled={busy} onClick={() => void action("save_note")}>메모 저장</button>{["requested", "awaiting_payment", "paid"].includes(detail.order.status) && <button className="admin-button" disabled={busy} onClick={() => void action("mark_ordered")}>제작소에 발주 완료</button>}</div>
          {detail.order.status === "producing" && <form className="admin-shipment-form" onSubmit={event => { event.preventDefault(); void action("mark_shipped"); }}><h4>송장 등록 후 배송 중으로 이동</h4><label className="admin-label">택배사<input required maxLength={50} placeholder="예: CJ대한통운" value={carrier} onChange={e => setCarrier(e.target.value)} /></label><label className="admin-label">송장번호<input required minLength={4} maxLength={60} pattern="[a-zA-Z0-9 -]+" placeholder="송장번호 입력" value={tracking} onChange={e => setTracking(e.target.value)} /></label><button className="admin-button" disabled={busy}>송장 저장 · 배송 시작</button></form>}
          {detail.shipments.map(s => <p className="admin-tracking" key={s.id}>{s.carrier} · <b>{s.tracking_number}</b><br />발송 {date(s.shipped_at)}{s.delivered_at && <> · 도착 {date(s.delivered_at)}</>}</p>)}
          {detail.order.status === "shipped" && <button className="admin-button" disabled={busy} onClick={() => void action("mark_delivered")}>배송 완료로 표시</button>}
        </section><section className="admin-detail-section"><h3>처리 기록</h3><ul className="admin-timeline">{detail.events.map(event => <li key={event.id}><span>{EVENT_LABEL[event.action] || event.action}</span><time>{date(event.created_at)}</time></li>)}</ul></section>
      </>}
    </dialog>
  </div></main>;
}
