"use client";

import { useEffect, useRef, useState } from "react";

export default function HomeMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);



  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.05;
    let active = true;

    function removeListeners() {
      document.removeEventListener("click", start);
      document.removeEventListener("keydown", start);
    }

    function start(event: Event) {
      if ((event.target instanceof Element && event.target.closest("[data-home-music]")) || (event instanceof KeyboardEvent && event.repeat)) return;
      removeListeners();
      void audio?.play().catch(() => {});
    }

    void audio.play().catch((error: DOMException) => {
      if (active && error.name === "NotAllowedError") {
        document.addEventListener("click", start);
        document.addEventListener("keydown", start);
      }
    });
    audio.addEventListener("play", removeListeners);

    return () => {
      active = false;
      removeListeners();
      audio.removeEventListener("play", removeListeners);
      audio.pause();
    };
  }, []);
  return (
    <>
      <audio ref={audioRef} src="/the_mountain-love-guitar-628398.mp3" loop />
      <button
        type="button"
        className="btn"
        data-home-music
        aria-label="배경음악 음소거"
        aria-pressed={muted}
        style={{ position: "fixed", bottom: 16, left: 16, zIndex: 20, width: 44, height: 44, minHeight: 44, padding: 0 }}
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          audio.muted = audio.paused ? false : !audio.muted;
          setMuted(audio.muted);
          if (audio.paused) void audio.play().catch(() => {});
        }}
      >
        <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
      </button>
    </>
  );
}
