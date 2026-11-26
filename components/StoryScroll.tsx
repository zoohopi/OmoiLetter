"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// p.07 대표 이야기 (확정 원고 · 짧은 버전).
// 화면을 고정(pin)한 채, 손가락으로 올릴 때마다 한 문단씩 바뀌어 나타난다 (GSAP ScrollTrigger).
const STORY: string[][] = [
  ["저는, 말을 잘 못하는 사람입니다."],
  ["사랑해, 고마워.", "늘 마음속에 있는 말인데"],
  ["꼭 전해야 하는 날에도", "입 밖으로 나오지 않았습니다."],
  ["그래서 편지를 써 보기로 했습니다."],
  ["막상 편지를 쓰자니", "편지지는 어떻게 준비해야할지"],
  ["무슨 말부터 써야 할지,", "시작조차 어려웠습니다."],
  ["그러다 알게 됐습니다."],
  ["**“속마음을 표현하는 법을 모르는구나.”**"],
  ["그래서 오모이레터를 만들었습니다."],
  ["마음은 있는데 꺼내기", "어려운 분들을 위해"],
  ["그 마음을 받은 사람이, 웃을 수 있도록."],
  ["그 마음을 전한 당신이, 웃을 수 있도록."],
];

function Line({ text }: { text: string }) {
  // **굵게** 부분만 강조
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p))}
    </>
  );
}

export default function StoryScroll() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const paras = gsap.utils.toArray<HTMLElement>(".story-scroll__para", el);
      const sign = el.querySelector(".story__sign");
      const heading = gsap.utils.toArray<HTMLElement>(".story-scroll__inner > .eyebrow, .story-scroll__inner > .headline", el);
      el.classList.add("is-pinned");
      gsap.set(paras, { autoAlpha: 0, y: 30, filter: "blur(6px)" });
      gsap.set(sign, { autoAlpha: 0 });
      gsap.set(heading, { autoAlpha: 1, y: 0 });

      const mobile = matchMedia("(max-width:768px)").matches;
      const stops: number[] = [0];
      let lower = 0;
      let upper = 1;
      let limiting = false;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${window.innerHeight * paras.length * 0.6}`, // 문단 하나당 화면 0.6장 분량
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: self => {
            if (!mobile || limiting || !self.isActive) return;
            const bounded = Math.max(lower, Math.min(upper, self.progress));
            if (Math.abs(bounded - self.progress) > .0001) {
              limiting = true;
              self.scroll(self.start + bounded * (self.end - self.start));
              self.update();
              limiting = false;
            }
          },
        },
      });

      // Clear the title before the letter starts, and restore it when scrolling back.
      tl.to(heading, { autoAlpha: 0, y: -14, duration: 0.65 });
      paras.forEach((p, i) => {
        tl.to(p, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1 });
        stops.push(tl.duration() + .4);
        tl.to({}, { duration: 0.8 }); // 읽는 시간
        // 마지막 문단은 남겨 둔다
        if (i < paras.length - 1) tl.to(p, { autoAlpha: 0, y: -30, filter: "blur(6px)", duration: 0.8 });
      });
      // 마지막 문단과 함께 서명이 나타난다
      tl.to(sign, { autoAlpha: 1, duration: 0.8 }, "-=0.8");

      const progressStops = [...stops.map(time => time / tl.duration()), 1];
      upper = progressStops[1];
      const beginGesture = () => {
        const trigger = tl.scrollTrigger;
        if (!trigger) return;
        const progress = trigger.progress;
        lower = [...progressStops].reverse().find(stop => stop < progress - .002) ?? 0;
        upper = progressStops.find(stop => stop > progress + .002) ?? 1;
      };
      if (mobile) window.addEventListener("touchstart", beginGesture, { passive:true });
      return () => {
        window.removeEventListener("touchstart", beginGesture);
        el.classList.remove("is-pinned");
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div className="story-scroll" ref={root}>
      <div className="story-scroll__inner">
        <p className="eyebrow">p.02</p>
        <h2 className="headline story-scroll__handwritten"><Image src="/handwriting/story-heading-marker-v1.webp" alt="오모이레터를 만든 이유" width={648} height={95} sizes="(max-width: 680px) 90vw, 640px" /></h2>
        <div className="story-scroll__stage">
          {STORY.map((para, i) => (
            <p key={i} className="story-scroll__para">
              {i < 7 ? <Image className="story-scroll__handwritten-line" src={`/handwriting/story-aligned-${i + 1}.webp`} alt={para.join(" ")} width={760} height={126} sizes="(max-width: 680px) 90vw, 640px" /> : para.map((line, j) => (
                <span key={j}>
                  <Line text={line} />
                  {j < para.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>

      </div>
    </div>
  );
}





