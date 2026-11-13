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

        <div className="notice" style={{ textAlign: "center" }}>
          <b>주문 전 꼭 확인해 주세요.</b>
          <ol style={{ margin: "16px 0 0", padding: 0, listStyle: "none", color: "var(--cream-dim)", lineHeight: 1.8 }}>
            <li>1. 사진과 글을 꼼꼼히 확인해 주세요. 주문 후에는 수정할 수 없습니다.</li>
            <li style={{ marginTop: 12 }}>2. 지금은 무료 테스트 기간입니다. 결제 없이 접수되며, 제작·배송 일정은 별도로 안내해 드립니다.</li>
            <li style={{ marginTop: 12 }}>3. 책을 받으신 후 문제가 있다면 연락해 주세요. 확인 후 해결을 도와드리겠습니다.</li>
          </ol>
        </div>

        <div className="actions" style={{ justifyContent: "center" }}>
          <Link className="btn btn--small done-order" href="/account">무료 테스트 주문하기</Link>
          <Link className="btn btn--small" href="/letter/share">
            인스타그램용 사진 받기
          </Link>
        </div>
      </div>
    </main>
  );
}
