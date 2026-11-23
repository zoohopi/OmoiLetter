"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const MEDIA = "/product-book/video/book-rotation-s25-smooth";
const subscribe = () => () => {};
// WebKit can play WebM while discarding its alpha. Use the transparent WebP
// animation there rather than letting a black rectangle cover the site.
const needsImage = () => /AppleWebKit/.test(navigator.userAgent) && !/(Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent);

export default function BookTurn() {
  const video = useRef<HTMLVideoElement>(null);
  const imageFallback = useSyncExternalStore(subscribe, needsImage, () => false);

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    player.defaultPlaybackRate = 0.8;
    player.playbackRate = 0.8;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void player.play().catch(() => {});
      else player.pause();
    });
    observer.observe(player);
    return () => observer.disconnect();
  }, [imageFallback]);

  return <section className="product-book" aria-label="오모이레터 편지책">
    {imageFallback ? (
      // Animated WebP retains transparency on Safari, including iPhone/iPad.
      // eslint-disable-next-line @next/next/no-img-element
      <img className="product-book__turn" src={`${MEDIA}-08x.webp`} width={960} height={960} alt="회전하는 오모이레터 편지책" />
    ) : (
      <video
        className="product-book__turn"
        ref={video}
        src={`${MEDIA}.webm`}
        poster={`${MEDIA}-poster.webp`}
        width={960}
        height={960}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label="회전하는 오모이레터 편지책"
      />
    )}
    <p className="product-book__price"><del aria-label="정가 79,000원">79,000원</del><span aria-hidden="true">→</span><strong aria-label="할인가 49,000원">49,000원</strong></p>
    <p className="product-book__caption">사진과 마음이 담긴 한 권의 편지책</p>
    <p className="product-book__note">*30페이지 기준</p>
  </section>;
}
