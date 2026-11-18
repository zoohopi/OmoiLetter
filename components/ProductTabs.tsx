"use client";
import { useState } from "react";

// 가안. 실제 후기·문의가 모이면 아래 데이터를 실제 값으로 바꿔야 한다.
const REVIEWS = [
  { text: "남친 3주년 선물로 했는데 진짜 울었어요ㅠㅠㅠ 질문 따라 쓰다 보니까 저도 몰랐던 마음이 막 나오더라구요🥹 사진 고르는 것도 재밌었고 책 퀄리티도 생각보다 훨씬 좋아요!! 다음 기념일에도 또 할 예정💜", who: "연인에게 · 3주년 기념일", photo: "/reviews/01-unboxing-v2.webp" },
  { text: "부모님 결혼 30주년에 맞춰 주문했습니다. 평소 표현을 잘 못하는 편이라 편지를 쓸 수 있을까 걱정했는데, 질문에 하나씩 답하다 보니 자연스럽게 완성됐습니다. 어머니께서 침대 맡에 두고 자주 펼쳐 보신다고 하네요. 7일 전에 주문해야 한다는 점만 미리 알고 계시면 좋겠습니다.", who: "부모님께 · 결혼 30주년", photo: "/reviews/02-open-book-v2.webp" },
  { text: "친구 생일선물로 줬어요. 앨범보다 훨씬 좋네요ㅎㅎ", who: "친구에게 · 생일", photo: "/reviews/03-bedside-v1.webp" },
];
const DIST = [["아주 좋아요", 100], ["만족해요", 0], ["보통이에요", 0], ["그저그래요", 0], ["아쉬워요", 0]] as const;
const QNA = [
  { q: "편지책은 몇 페이지인가요?", a: "30페이지 기준이에요. 편지 길이와 사진 수에 따라 달라질 수 있어요." },
  { q: "제작과 배송은 얼마나 걸리나요?", a: "주문 후 제작에 4~5일, 배송에 1~2일 정도 걸려요. 받으실 날짜 7일 전까지 주문해 주세요." },
  { q: "주문 전에 미리 볼 수 있나요?", a: "네, 완성한 편지책을 사진으로 먼저 받아 보고 주문할 수 있어요." },
];

export default function ProductTabs() {
  const [tab, setTab] = useState(0);
  const [gallery, setGallery] = useState(false);
  const tabs = [`리뷰 (${REVIEWS.length})`, "제품 상세", `Q&A (${QNA.length})`];
  return <div className="ptabs">
    <div className="ptabs__bar" role="tablist">
      {tabs.map((t, i) => <button key={t} role="tab" aria-selected={tab === i} className={tab === i ? "is-on" : ""} onClick={() => setTab(i)}>{t}</button>)}
    </div>
    {tab === 0 && <div role="tabpanel">
      <div className="ptabs__head"><h3>리뷰 <b>{REVIEWS.length}개</b></h3><button className="ptabs__more">전체 리뷰 보기 ›</button></div>
      <p className="ptabs__example-note">사진은 AI로 만든 제품 연출 이미지이며, 아래 후기와 별점은 예시입니다.</p>
      <div className="ptabs__score"><p><strong>5.0</strong> / 5.0</p><p className="ptabs__stars" aria-label="별점 5점 만점에 5점">★★★★★</p></div>
      <ul className="ptabs__dist">{DIST.map(([l, p]) => <li key={l} className={p ? "is-on" : ""}><span>{l}</span><i><em style={{ width: `${p}%` }} /></i><span>{p}%</span></li>)}</ul>
      <div className="ptabs__photos">{REVIEWS.map(r => <img key={r.photo} src={r.photo} alt="오모이레터 책의 표지와 내지를 집에서 촬영한 듯한 AI 제품 연출 이미지" loading="lazy" width={180} height={225} />)}<button type="button" onClick={() => setGallery(true)} className="ptabs__photomore" aria-label="사진 더보기"><span aria-hidden="true">+</span></button></div>
      <ul className="ptabs__list">{REVIEWS.map(r => <li key={r.who}><p className="ptabs__stars ptabs__stars--sm">★★★★★</p><p>{r.text}</p><small>{r.who}</small></li>)}</ul>
    </div>}
    {tab === 1 && <div role="tabpanel" className="ptabs__detail">
      <h3>사진과 마음이 담긴 한 권의 편지책</h3>
      <img className="ptabs__hero" src="/product-book/cover.png" alt="오모이레터 편지책 표지" />
      <dl><dt>구성</dt><dd>편지 + 사진, 30페이지 기준</dd><dt>가격</dt><dd>49,000원</dd><dt>제작</dt><dd>사진 배치 → 편지 작성 → 편지 배치 → 미리보기 → 주문</dd><dt>배송</dt><dd>제작 4~5일 + 배송 1~2일<br /><b>받으실 날짜 7일 전까지 주문해 주세요.</b></dd></dl>
    </div>}
    {tab === 2 && <div role="tabpanel" className="ptabs__qna">
      {QNA.map(x => <details key={x.q}><summary>Q. {x.q}</summary><p>A. {x.a}</p></details>)}
    </div>}
    {gallery && <div className="ptabs-gallery" role="dialog" aria-modal="true" aria-label="사진 리뷰 모아보기" onClick={() => setGallery(false)}>
      <div className="ptabs-gallery__box" onClick={e => e.stopPropagation()}>
        <div className="ptabs-gallery__head"><h3>사진 리뷰 <b>{REVIEWS.length}</b></h3><button type="button" autoFocus aria-label="닫기" onClick={() => setGallery(false)}>✕</button></div>
        <ul>{REVIEWS.map(r => <li key={r.photo}><img src={r.photo} alt="" /><p className="ptabs__stars ptabs__stars--sm">★★★★★</p><p>{r.text}</p><small>{r.who}</small></li>)}</ul>
      </div>
    </div>}
  </div>;
}
