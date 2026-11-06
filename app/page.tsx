import Link from "next/link";
import Topbar from "@/components/Topbar";
import Reveal from "@/components/Reveal";
import TryQuestion from "@/components/TryQuestion";
import WorryCards from "@/components/WorryCards";
import StoryScroll from "@/components/StoryScroll";
import InstaPost from "@/components/InstaPost";
import BookPreview from "@/components/BookPreview";

// 기준: 02. SITE/02. SITE.md — "사이트 = 한 권의 편지책". 최종 행동은 '편지 시작하기' 하나.

// p.03 — 인터뷰 질문 중 대표 3개 (05. INTERVIEW.md 1장의 1·3·7번)
const ROUTE = [
  { name: "편지가 완성돼요", sub: "원고 확정" },
  { name: "편지가 길을 떠나요", sub: "제작 · 배송 4일" },
  { name: "그 사람에게 닿아요", sub: "받는 분 주소로" },
];

export default function Home() {
  return (
    <>
      <Topbar />

      <main>
        {/* HERO — 맨 첫 화면: 사진·영상만 (글자 없음). 영상이 나오면 이 자리에 넣는다 */}
        <section id="hero" className="hero" aria-label="Omoi Letter">
          <div className="hero__media" aria-hidden="true" />
          {/* 손하트 → 장미 → 노을 하늘(想い Omoi) 순서로 번갈아 */}
          <div className="hero__media hero__media--rose" aria-hidden="true" />
          <div className="hero__media hero__media--sky" aria-hidden="true" />
          <p className="hero__cue" aria-hidden="true">
            <span />
          </p>
        </section>

        {/* p.06 BOOK */}
        <section id="p06" className="page page--book">
          <div className="inner center">
            <Reveal>
              <p className="eyebrow">p.01</p>
              <h2 className="headline">편지에 남기고 싶은 사진을 넣어 주세요.</h2>
              <p className="lead">
                사진은 몇 장이면 충분합니다.
                <br />
                <strong>글과 함께 기억하고 싶은 추억을 편지에 담아 주세요.</strong>
              </p>
            </Reveal>
            <Reveal delay={200}>
              <BookPreview />
            </Reveal>
            <Reveal>
              <div className="specs">
                <span className="spec">8×8 · 211mm</span>
                <span className="spec">무선 제본</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* p.08 STORY — 확정 원고(짧은 버전), 스크롤하면 한 문단씩 */}
        <section id="p08" className="page page--story">
          <StoryScroll />
        </section>

        {/* p.01 HOOK — 늘 마음속에 있는 말 */}
        <section id="p01" className="page hook">
          <div className="inner">
            <div className="hook__lines" aria-label="미안해. 사랑해. 고마워.">
              <Reveal as="p" className="hook__line">미안해.</Reveal>
              <Reveal as="p" className="hook__line" delay={900}>사랑해.</Reveal>
              <Reveal as="p" className="hook__line" delay={1800}>고마워.</Reveal>
            </div>
            <Reveal as="p" className="hook__question" delay={2800}>
              늘 마음속에 있는 말인데, 왜 이렇게 꺼내기 어려울까요.
            </Reveal>

            <Reveal className="hook__brand" delay={3700}>
              <h1 className="wordmark">
                Omoi Letter
                <small>(想い Letter)</small>
              </h1>
              <p className="slogan">말하지 못한 마음을, 한 권의 편지로</p>
              <p className="subcopy">누군가를 생각하는 마음을 인터뷰하고, 편지로 전합니다.</p>
            </Reveal>

            <p className="scroll-cue">
              첫 장을 넘겨 보세요
              <span />
            </p>
          </div>
        </section>

        {/* p.02 TARGET */}
        <section id="p02" className="page">
          <div className="inner">
            <Reveal>
              <p className="eyebrow">p.04</p>
              <h2 className="headline">이번 기념일 선물, 정하셨나요?</h2>
              <p className="lead">혹시 이런 고민, 하고 계신가요?</p>
            </Reveal>
            {/* 고민 카드 — 한 장씩 넘겨 본다 */}
            <Reveal delay={300}>
              <WorryCards />
            </Reveal>
            <Reveal className="check-result" delay={700}>
              하나라도 해당된다면, 이미 전할 마음은 충분합니다.
            </Reveal>
          </div>
        </section>

        {/* p.03 EPIPHANY — 빈 편지지 + 인터뷰 예시 (예전 p.04 TRY와 합침) */}
        <section id="p03" className="page">
          <div className="inner">
            <Reveal className="center">
              <p className="eyebrow">p.05</p>
              <h2 className="headline">빈 편지지 앞에서는 누구나 막힙니다.</h2>
              <p className="lead">
                다양한 인터뷰 질문을 통해
                <br />
                전하고 싶은 속마음을 이끌어 드릴게요.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <TryQuestion />
            </Reveal>
          </div>
        </section>

        {/* p.09 SHARE — 크기는 8×8 하나. 완성한 편지책을 인스타그램용 사진으로 */}
        <section id="p09" className="page">
          <div className="inner">
            <Reveal className="center">
              <p className="eyebrow">p.06</p>
              <h2 className="headline">
                편지는 그 사람에게만,
                <br />
                추억은 인스타그램에
              </h2>
              <p className="lead">
                완성한 편지책을 인스타그램에 올리기 좋은 사진으로 만들어 드려요.
                <br />
                <strong>편지 글은 담지 않고, 표지와 사진만 보여 줘요.</strong>
              </p>
            </Reveal>

            <Reveal delay={150}>
              <InstaPost />
            </Reveal>

            <Reveal>
              <ul className="share-steps">
                <li>
                  <b>1</b>편지를 완성하면
                </li>
                <li>
                  <b>2</b>‘인스타그램용 사진 받기’를 누르고
                </li>
                <li>
                  <b>3</b>4:5 사진으로 저장하거나 바로 공유해요
                </li>
              </ul>
              <div className="specs">
                <span className="spec">8×8 · 211 × 211mm</span>
                <span className="spec">무선 제본</span>
                <span className="spec">인스타그램 4:5 사진</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* p.07 DELIVERY */}
        <section id="p07" className="page">
          <div className="inner">
            <Reveal className="center">
              <p className="eyebrow">p.07</p>
              <h2 className="headline">4일 전에 제작해 주세요.</h2>
              <p className="lead">
                <strong>편지를 완성하면, 4일 안에 도착합니다.</strong>
              </p>
            </Reveal>
            <ol className="route">
              {ROUTE.map((r, i) => (
                <Reveal as="li" key={r.name} className="route__item" delay={i * 250}>
                  <span className="route__dot" aria-hidden="true" />
                  <p className="route__name">{r.name}</p>
                  <p className="route__sub">
                    {r.sub.includes("4일") ? <span className="route__point">{r.sub}</span> : r.sub}
                  </p>
                </Reveal>
              ))}
            </ol>
            <Reveal>
              <p className="fineprint center">
                받는 분 주소로 바로 보내 드려요. 길을 떠나면 카카오톡으로 알려드려요.
              </p>
            </Reveal>
          </div>
        </section>

        {/* p.11 EXIT */}
        <section id="p11" className="page exit">
          <div className="inner">
            <Reveal>
              <p className="wordmark">
                Omoi Letter
                <small>(想い Letter)</small>
              </p>
              <h2 className="slogan">말하지 못한 마음을, 한 권의 편지로</h2>
              <p className="subcopy">누군가를 생각하는 마음을 인터뷰하고, 편지로 전합니다.</p>
            </Reveal>
            <Reveal className="exit__cta" delay={200}>
              <Link className="btn" href="/start">
                편지 시작하기 <span className="heart">♥</span>
              </Link>            </Reveal>
          </div>
        </section>
      </main>

      <footer className="footer">
        <b>Omoi Letter</b>
        말하지 못한 마음을, 한 권의 편지로
      </footer>
    </>
  );
}
