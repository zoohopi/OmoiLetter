"use client";

// 편지책 한 쪽. 실제 크기(mm)로 그린다 — 화면 미리보기는 ScaledPage로 줄여 보여주고,
// 인쇄용 화면(/letter/print)은 이 크기 그대로 PDF가 된다. (05. INTERVIEW.md 2장)
// 무엇을 어디에 그릴지는 lib/letter/designs.ts (DesignCraft 파일을 옮긴 값)가 정한다.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { beginDraftEdit, endDraftEdit, usePhotoUrl } from "@/lib/letter/store";
import { BLEED_MM, trimOf } from "@/lib/letter/rules";
import { designOf, layoutOf, photoPageDesign, PAGE_PT, type DesignId, type El, type LayoutId, type Rect, type TextStyle } from "@/lib/letter/designs";
import type { BookSize, Draft, PhotoTransform } from "@/lib/letter/types";
import { bookContent } from "@/lib/letter/bookContent";
import PhotoSelection from "./PhotoSelection";
import "./BookPage.css";

export type PhotoAdjust = { mode: "image" | null; activate: () => void; change: (value: PhotoTransform) => void; remove: () => void; finish: () => void };
export type Side = "left" | "right";

export type PageSpec =
  | { kind: "cover"; photoId: string | null }
  | { kind: "back"; photoId: string | null }
  | {
      kind: "leaf";
      side: Side;
      layout: LayoutId;
      no: number; // 몇 번째 펼침인지 (1부터)
      photoId: string | null;
      question: string;
      answer: string;
      qid?: string;
      photoPage?: boolean;
    };

/**
 * 내지 = 답한 질문마다 펼침 한 쌍 [왼쪽 | 오른쪽]. 앞뒤로 표지(1쪽, 오른쪽)·뒷표지가 붙는다.
 * 어느 쪽에 사진이 오는지는 고른 레이아웃이 정한다.
 */
export function buildInnerPages(draft: Draft): PageSpec[] {
  const design = designOf(draft.design);
  const pages: PageSpec[] = [];
  if (draft.bookPhotos) return bookContent(draft).map((q, i) => ({
    kind: "leaf", side: i % 2 === 0 ? "left" : "right", layout: layoutOf(design, draft.photoLayout?.[q.id]).id,
    no: i + 1, photoId: q.photoId || null, question: q.question, answer: q.answer, qid: q.id, photoPage: true,
  }));
  let no = 0;
  for (const q of bookContent(draft)) {
    no++;
    const layout = layoutOf(design, draft.photoLayout?.[q.id]).id;
    for (const side of ["left", "right"] as const) {
      pages.push({ kind: "leaf", side, layout, no, photoId: q.photoId, question: q.question, answer: q.answer, qid: q.id });
    }
  }
  return pages;
}

/** 이 레이아웃에서 사진이 놓이는 면 / 글이 놓이는 면 */
export function sideOf(design: DesignId | undefined, layout: LayoutId | undefined, what: "photo" | "text"): Side {
  const photoSide = layoutOf(designOf(design), layout).photoSide;
  return what === "photo" ? photoSide : photoSide === "left" ? "right" : "left";
}

type Props = {
  page: PageSpec;
  design?: DesignId;
  size: BookSize;
  bleed?: boolean;
  recipientName: string;
  anniversaryDate: string;
  /** 표지를 책 위에서 바로 고칠 때 (시작 화면) */
  photoUrls?: Record<string, string>;
  coverPhotoTransform?: PhotoTransform;
  photoTransform?: PhotoTransform;
  photoFrame?: PhotoTransform;
  photoAdjust?: PhotoAdjust;
  coverEdit?: CoverEdit;
  /** 사진 칸에 바로 사진을 넣을 때 */
  photoEdit?: { onPhoto: (file: File) => void; busy?: boolean };
  /** 답 칸에 바로 쓸 때 */
  textEdit?: { onChange: (value: string) => void; maxLength: number; placeholder: string };
};

export type CoverEdit = {
  adjustingPhoto?: boolean;
  onAdjustPhoto?: () => void;
  onPhotoTransform?: (value: PhotoTransform) => void;
  onPhoto: (file: File) => void;
  onName: (value: string) => void;
  onDate: (value: string) => void;
  minDate: string;
  busy?: boolean;
};

type Ctx = {
  bleedPt: number;
  name: string;
  date: string;
  no: number;
  question: string;
  answer: string;
  photoId: string | null;
  photoUrls?: Record<string, string>;
  coverPhotoTransform?: PhotoTransform;
  photoTransform?: PhotoTransform;
  photoFrame?: PhotoTransform;
  photoAdjust?: PhotoAdjust;
  coverEdit?: CoverEdit;
  photoEdit?: Props["photoEdit"];
  textEdit?: Props["textEdit"];
};

export default function BookPage({ page, design: designId, size, bleed = false, recipientName, anniversaryDate, coverEdit, photoUrls, coverPhotoTransform, photoTransform, photoFrame, photoAdjust, photoEdit, textEdit }: Props) {
  const design = designOf(designId);
  const pd =
    page.kind === "cover" ? design.cover : page.kind === "back" ? design.back : page.photoPage ? photoPageDesign(designId, page.layout, Boolean(page.answer.trim())) : layoutOf(design, page.layout)[page.side];

  const style = {
    "--trim": `${trimOf(size).w}mm`,
    "--trim-h": `${trimOf(size).h}mm`,
    "--bleed": bleed ? `${BLEED_MM}mm` : "0mm",
    "--pt": `calc(var(--trim) / ${PAGE_PT})`,
    background: pd.bg,
  } as CSSProperties;

  const ctx: Ctx = {
    bleedPt: bleed ? BLEED_MM * PAGE_PT / trimOf(size).w : 0,
    photoUrls,
    name: recipientName,
    date: anniversaryDate,
    no: page.kind === "leaf" ? page.no : 0,
    question: page.kind === "leaf" ? page.question : "",
    answer: page.kind === "leaf" ? page.answer : "",
    photoId: page.photoId,
    photoTransform: photoTransform ?? (page.kind === "cover" ? coverPhotoTransform : undefined),
    photoFrame,
    photoAdjust,
    coverEdit: page.kind === "cover" ? coverEdit : undefined,
    coverPhotoTransform: page.kind === "cover" ? coverPhotoTransform : undefined,
    photoEdit: page.kind === "leaf" ? photoEdit : undefined,
    textEdit: page.kind === "leaf" ? textEdit : undefined,
  };

  return (
    <div className={`bp tp tp--${design.id} tp--${page.kind}`} style={style}>
      {pd.els.map((el, i) => (
        <Element key={i} el={el} ctx={ctx} />
      ))}
    </div>
  );
}

/* ---------------- 배치 ---------------- */

// 쪽 가장자리에 닿은 요소는 재단여백(bleed)까지 늘린다.
function box(r: Rect): CSSProperties {
  const edge = (v: number) => `calc(var(--bleed) + var(--pt) * ${v})`;
  return {
    position: "absolute",
    left: r[0] <= 0.5 ? 0 : edge(r[0]),
    top: r[1] <= 0.5 ? 0 : edge(r[1]),
    right: r[2] >= PAGE_PT - 0.5 ? 0 : edge(PAGE_PT - r[2]),
    bottom: r[3] >= PAGE_PT - 0.5 ? 0 : edge(PAGE_PT - r[3]),
  };
}

const FONTS = {
  serif: "var(--font-serif), serif",
  sans: "var(--font-sans-kr), sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  pre: "var(--font-body), sans-serif",
};

function textCss(s: TextStyle): CSSProperties {
  return {
    fontFamily: FONTS[s.font],
    fontWeight: s.weight ?? 400,
    fontSize: `calc(var(--pt) * ${s.size} * var(--fit, 1))`,
    lineHeight: s.lead ? `calc(var(--pt) * ${s.lead} * var(--fit, 1))` : 1.25,
    letterSpacing: s.track ? `${s.track / 1000}em` : undefined,
    color: s.color,
    textAlign: s.align ?? "left",
    writingMode: s.vertical ? "vertical-rl" : undefined,
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  };
}

function formatDate(value: string, sep: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return [y, m, d].join(sep);
}

// 답의 첫 문장 (매거진 인용구)
function leadOf(answer: string) {
  const first = answer.trim().split(/\n|(?<=[.!?。])\s/)[0] ?? "";
  return first.length > 60 ? `${first.slice(0, 58)}…` : first;
}

function fill(text: string, ctx: Ctx) {
  const two = String(ctx.no).padStart(2, "0");
  return text
    .replaceAll("{name}", ctx.name || "○○")
    .replaceAll("{dateDot}", formatDate(ctx.date, "."))
    .replaceAll("{date}", formatDate(ctx.date, ". "))
    .replaceAll("{no}", two)
    .replaceAll("{pl}", String(ctx.no * 2).padStart(2, "0"))
    .replaceAll("{pr}", String(ctx.no * 2 + 1).padStart(2, "0"))
    .replaceAll("{il}", String(ctx.no * 2 - 1).padStart(2, "0"))
    .replaceAll("{ir}", String(ctx.no * 2).padStart(2, "0"))
    .replaceAll("{q}", ctx.question)
    .replaceAll("{lead}", leadOf(ctx.answer));
}

function Element({ el, ctx }: { el: El; ctx: Ctx }) {
  switch (el.t) {
    case "rect":
      return (
        <div
          aria-hidden
          style={{
            ...box(el.r),
            background: el.fill,
            border: el.stroke ? `calc(var(--pt) * ${el.sw ?? 1}) solid ${el.stroke}` : undefined,
            borderRadius: el.round ? 9999 : undefined,
            opacity: el.opacity,
          }}
        />
      );
    case "img":
      return (
        <div aria-hidden className="tp-deco" style={{ ...box(el.r), opacity: el.opacity }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 디자인 장식(SVG). 칸 크기에 맞춰 그대로 깐다 */}
          <img alt="" src={el.src} />
        </div>
      );
    case "photo":
      return <PhotoSlot r={el.r} ctx={ctx} />;
    case "text":
      return el.fit ? (
        <FitText style={{ ...box(el.r), ...textCss(el.s) }} deps={[el.text, ctx.question, ctx.answer]}>
          {fill(el.text, ctx)}
        </FitText>
      ) : (
        <div style={{ ...box(el.r), ...textCss(el.s) }}>{ctx.coverEdit ? <CoverText text={el.text} ctx={ctx} /> : fill(el.text, ctx)}</div>
      );
    case "answer":
      return <AnswerSlot el={el} ctx={ctx} />;
  }
}

/* ---------------- 사진 ---------------- */

function PhotoSlot({ r, ctx }: { r: Rect; ctx: Ctx }) {
  // "/"로 시작하면 사이트 안의 샘플 사진 (홈 미리보기), 아니면 브라우저에 저장된 사진 id
  const isStatic = ctx.photoId?.startsWith("/") ?? false;
  const stored = usePhotoUrl(ctx.photoUrls || isStatic ? null : ctx.photoId);
  const url = ctx.photoUrls ? ctx.photoUrls[ctx.photoId ?? ""] ?? null : isStatic ? ctx.photoId : stored;
  const edit = ctx.coverEdit ?? ctx.photoEdit;
  const drag = useRef<{ x: number; y: number; value: PhotoTransform; unit: number } | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const transform = ctx.photoTransform ?? { scale: 1, x: 0, y: 0 };
  const [intrinsic, setIntrinsic] = useState<{ url: string; ratio: number } | null>(null);
  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image || !url) return;
    let alive = true;
    // Cached/static images may finish before hydration attaches onLoad.
    const measure = () => {
      if (alive && image.naturalWidth && image.naturalHeight) {
        const ratio = image.naturalWidth / image.naturalHeight;
        setIntrinsic(previous => previous?.url === url && previous.ratio === ratio ? previous : { url, ratio });
      }
    };
    if (image.complete) queueMicrotask(measure);
    image.addEventListener("load", measure);
    return () => { alive = false; image.removeEventListener("load", measure); };
  }, [url]);
  // Edge-to-edge photos also cover the physical bleed area in the print export.
  const width = r[2] - r[0] + (r[0] <= 0.5 ? ctx.bleedPt : 0) + (r[2] >= PAGE_PT - 0.5 ? ctx.bleedPt : 0);
  const height = r[3] - r[1] + (r[1] <= 0.5 ? ctx.bleedPt : 0) + (r[3] >= PAGE_PT - 0.5 ? ctx.bleedPt : 0);
  const ratio = intrinsic?.url === url ? intrinsic.ratio : width / height;
  // Size the full image itself, not an already-cropped object-fit box.
  const imageWidth = Math.max(width, height * ratio), imageHeight = imageWidth / ratio;
  const photoStyle = box(r);
  const imageStyle: CSSProperties = {
    inset: "auto", width: `calc(var(--pt) * ${imageWidth})`, height: `calc(var(--pt) * ${imageHeight})`,
    left: `calc(50% - var(--pt) * ${imageWidth / 2})`, top: `calc(50% - var(--pt) * ${imageHeight / 2})`,
    objectFit: "cover",
    transform: `translate(calc(var(--pt) * ${transform.x}), calc(var(--pt) * ${transform.y})) scale(${transform.scale})`,
    transformOrigin: "center",
    visibility: ctx.photoAdjust?.mode ? "hidden" : undefined,
  };
  const img = url ? (
    // eslint-disable-next-line @next/next/no-img-element -- 브라우저에 저장된 사진(blob)이라 next/image를 쓰지 않는다
    <img ref={imageRef} src={url} alt="" style={imageStyle} draggable={false} onLoad={(e) => setIntrinsic({ url, ratio: e.currentTarget.naturalWidth / e.currentTarget.naturalHeight })} />
  ) : (
    <span className="tp-photo__empty">{edit ? (edit.busy ? "넣는 중…" : ctx.coverEdit ? "표지 사진을 넣어주세요!" : "+ 사진 넣기") : "사진"}</span>
  );
  if (!edit) {
    return (
      <div className="tp-photo" style={photoStyle}>
        {img}
      </div>
    );
  }
  if (url && ctx.photoAdjust) {
    const adjust = ctx.photoAdjust;
    return <><div ref={anchor} className={`tp-photo tp-photo--adjust ${adjust.mode ? "is-adjusting" : ""}`}
      style={photoStyle} tabIndex={0} role="button" aria-label="사진 구도 편집"
      onDoubleClick={adjust.activate}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); adjust.activate(); } }}
      onPointerDown={(e) => {
        if (!adjust.mode) return;
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); beginDraftEdit();
        const page = e.currentTarget.closest(".bp")!;
        drag.current = { x: e.clientX, y: e.clientY, value: transform, unit: PAGE_PT / page.getBoundingClientRect().width };
      }}
      onPointerMove={(e) => {
        const start = drag.current; if (!start) return;
        const x = start.value.x + (e.clientX - start.x) * start.unit;
        const y = start.value.y + (e.clientY - start.y) * start.unit;
        adjust.change({ scale: start.value.scale,
          x: Math.max(-width * .75, Math.min(width * .75, x)),
          y: Math.max(-height * .75, Math.min(height * .75, y)) });
      }}
      onPointerUp={() => { drag.current = null; endDraftEdit(); }} onPointerCancel={() => { drag.current = null; endDraftEdit(); }}>
      {img}
    </div>
    {adjust.mode && <PhotoSelection anchor={anchor} url={url} width={width} height={height}
      imageWidth={imageWidth} imageHeight={imageHeight} value={transform} change={adjust.change} remove={adjust.remove} finish={adjust.finish} />}
    </>;
  }
  if (!url && ctx.coverEdit) {
    return <div className="tp-photo tp-cover-upload" style={photoStyle}>
      <button className="tp-cover-upload__button" type="button" disabled={edit?.busy} onClick={() => uploadInput.current?.click()}>
        {edit?.busy ? "넣는 중…" : "표지 사진을 넣어주세요!"}
      </button>
      <input ref={uploadInput} type="file" accept="image/*" hidden aria-label="표지 사진 선택" disabled={edit?.busy}
        onChange={(e) => { const file = e.target.files?.[0]; if (file) edit?.onPhoto(file); e.target.value = ""; }} />
    </div>;
  }
  return (
    <label className="tp-photo tp-photo--edit" style={photoStyle}>
      {img}
      <input
        type="file"
        accept="image/*"
        aria-label="사진 고르기"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) edit.onPhoto(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/* ---------------- 글 ---------------- */

// 표지 위에서 이름·날짜를 바로 고친다. {name} {date} 자리에 입력칸이 들어간다.
function CoverText({ text, ctx }: { text: string; ctx: Ctx }) {
  const edit = ctx.coverEdit!;
  const parts = text.split(/(\{name\}|\{date\}|\{dateDot\})/);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "{name}")
          return (
            <input
              key={i}
              className="tp-edit tp-edit--name"
              value={ctx.name}
              maxLength={12}
              placeholder="이름 또는 애칭"
              onChange={(e) => edit.onName(e.target.value)}
              aria-label="받는 분의 이름 또는 애칭"
            />
          );
        if (part === "{date}" || part === "{dateDot}")
          return (
            <input
              key={i}
              className="tp-edit tp-edit--date"
              type="date"
              min={edit.minDate}
              value={ctx.date}
              onChange={(e) => edit.onDate(e.target.value)}
              aria-label="기념일"
            />
          );
        return <span key={i}>{fill(part, ctx)}</span>;
      })}
    </>
  );
}

// 칸을 넘치면 글자를 5%씩 줄인다 (최소 65%).
function FitText({ style, deps, children }: { style: CSSProperties; deps: unknown[]; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) shrinkToFit(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 글이 바뀔 때만 다시 잰다
  }, deps);
  return (
    <div ref={ref} style={{ ...style, overflow: "hidden" }}>
      {children}
    </div>
  );
}

function shrinkToFit(el: HTMLElement) {
  let fit = 1;
  el.style.setProperty("--fit", "1");
  while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && fit > 0.65) {
    fit -= 0.05;
    el.style.setProperty("--fit", fit.toFixed(2));
  }
}

function AnswerSlot({ el, ctx }: { el: Extract<El, { t: "answer" }>; ctx: Ctx }) {
  const body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (body.current) shrinkToFit(body.current);
  }, [ctx.answer, ctx.question]);

  const columns: CSSProperties = el.columns
    ? { columnCount: el.columns, columnGap: `calc(var(--pt) * ${el.gap ?? 20})`, columnFill: "balance" }
    : {};

  return (
    <div className="tp-answer" style={box(el.r)}>
      {el.head && (
        <div style={{ ...textCss(el.head.s), marginBottom: `calc(var(--pt) * ${el.head.gap})` }}>{fill(el.head.text, ctx)}</div>
      )}
      {ctx.textEdit ? (
        <textarea
          className="tp-answer__input"
          style={textCss(el.s)}
          value={ctx.answer}
          maxLength={ctx.textEdit.maxLength}
          placeholder={ctx.textEdit.placeholder}
          aria-label={ctx.question}
          onChange={(e) => ctx.textEdit!.onChange(e.target.value)}
        />
      ) : (
        <div ref={body} className="tp-answer__body" style={{ ...textCss(el.s), ...columns }}>
          {ctx.answer}
        </div>
      )}
    </div>
  );
}
