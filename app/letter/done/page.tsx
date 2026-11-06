"use client";

import Link from "next/link";
import { useDraftGuard } from "@/lib/letter/guard";
import { BOOK_LABEL, answeredQuestions, formatKoreanDate } from "@/lib/letter/rules";

// 확정 후. 다듬기 → 결제 → 제작·발주는 Supabase·결제 연결 후 구현한다.
export default function DonePage() {
  const draft = useDraftGuard({ allowSubmitted: true });
  if (!draft) return null;

  if (draft.status !== "submitted") {
    return (
      <main className="maker">
        <div className="maker__inner">
          <h1 className="maker__title">아직 완성되지 않은 편지예요</h1>
          <div className="actions">
            <Link className="btn btn--small" href="/letter/preview">
              미리보기로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [y, m, d] = draft.anniversaryDate.split("-").map(Number);

  return (
    <main className="maker">
      <div className="maker__inner center">
        <p className="eyebrow">DONE</p>
        <h1 className="maker__title">
          {draft.recipientName}에게 갈 편지가
          <br />
          완성되었어요 <span className="heart">♥</span>
        </h1>
        <p className="maker__lead">
          질문 {answeredQuestions(draft).length}개 · {BOOK_LABEL} 편지책 ·{" "}
          {formatKoreanDate(new Date(y, m - 1, d))} 생일
        </p>

        <div className="notice" style={{ textAlign: "left" }}>
          <b>이다음은 이렇게 진행돼요</b>
          <ol style={{ margin: "10px 0 0", paddingLeft: 20, color: "var(--cream-dim)" }}>
            <li>맞춤법·띄어쓰기만 다듬어 확인을 받아요. 말투는 그대로예요.</li>
            <li>결제 후 4일 안에 받는 분께 닿아요.</li>
            <li>길을 떠나면 카카오톡으로 알려드려요.</li>
          </ol>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--cream-dim)" }}>
            (다듬기·결제·배송 연결은 준비 중이에요)
          </p>
        </div>

        <div className="actions" style={{ justifyContent: "center" }}>
          <Link className="btn btn--small" href="/account">내 계정에 보관·주문하기</Link>
          <Link className="btn btn--small" href="/letter/share">
            인스타그램용 사진 받기
          </Link>
          <Link className="btn btn--small btn--ghost" href="/letter/print">
            인쇄용 화면 확인 (내부)
          </Link>
          <Link className="link-btn" href="/start">
            처음 화면으로
          </Link>
        </div>
      </div>
    </main>
  );
}
