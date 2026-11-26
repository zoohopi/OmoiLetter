"use client";

import { useRef } from "react";

type PostcodeData = { zonecode: string; roadAddress: string; jibunAddress: string; buildingName: string; apartment: "Y" | "N" };
type DaumPostcode = new (options: { oncomplete: (data: PostcodeData) => void }) => { open: () => void };
declare global { interface Window { daum?: { Postcode: DaumPostcode } } }

const SCRIPT = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let loading: Promise<void> | null = null;
const loadPostcode = () => loading ??= new Promise<void>((resolve, reject) => {
  const script = document.createElement("script");
  script.src = SCRIPT; script.async = true;
  script.onload = () => resolve();
  script.onerror = () => { loading = null; reject(new Error("주소 검색을 불러오지 못했어요.")); };
  document.head.appendChild(script);
});

/** 우편번호·주소는 주소 검색 팝업에서 고른 값만 들어간다. 직접 입력은 막는다. */
export default function PostcodeFields({ onChange }: { onChange?: () => void }) {
  const postal = useRef<HTMLInputElement>(null);
  const address = useRef<HTMLInputElement>(null);
  const detail = useRef<HTMLInputElement>(null);

  const search = async () => {
    try { await loadPostcode(); } catch (e) { alert((e as Error).message); return; }
    if (!window.daum) return;
    new window.daum.Postcode({
      oncomplete: data => {
        const extra = data.apartment === "Y" && data.buildingName ? ` (${data.buildingName})` : "";
        if (postal.current) postal.current.value = data.zonecode;
        if (address.current) address.current.value = (data.roadAddress || data.jibunAddress) + extra;
        onChange?.();
        detail.current?.focus();
      },
    }).open();
  };
  const block = (e: React.SyntheticEvent) => e.preventDefault();
  const open = () => void search();

  return <>
    <label>우편번호<span className="postcode-row"><input ref={postal} name="postalCode" type="text" required pattern="[0-9]{5}" inputMode="none" autoComplete="off" placeholder="주소 검색으로 입력" title="주소 검색 버튼을 눌러 주소를 골라 주세요." onBeforeInput={block} onPaste={block} onDrop={block} onClick={open} /><button type="button" className="account-button account-button--outline" onClick={open}>주소 검색</button></span></label>
    <label>주소<input ref={address} name="address1" required minLength={3} maxLength={200} autoComplete="off" placeholder="주소 검색으로 입력" title="주소 검색 버튼을 눌러 주소를 골라 주세요." onBeforeInput={block} onPaste={block} onDrop={block} onClick={open} /></label>
    <label>상세 주소<input ref={detail} name="address2" maxLength={200} autoComplete="shipping address-line2" placeholder="동·호수 등" onChange={onChange} /></label>
  </>;
}
