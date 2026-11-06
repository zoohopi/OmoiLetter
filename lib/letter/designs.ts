// 편지책 디자인 3종. 06. DESIGN/*/ … ver.2.designcraft 를 그대로 옮긴 값이다.
// 좌표·글자 크기는 DesignCraft의 pt (한 쪽 = 598.11pt = 211mm). 오른쪽 면은 펼침 좌표에서 R()로 옮긴다.
//
// 글 안의 자리표시:
//   {name} 받는 분  {date} 2026. 12. 24  {dateDot} 2026.12.24  {no} 펼침 번호 01
//   {pl} {pr} 펼침의 왼쪽·오른쪽 쪽 번호 (표지 = 1쪽)  {il} {ir} 내지만 센 쪽 번호 (첫 펼침 = 01·02)
//   {q} 질문  {lead} 답의 첫 문장

export type DesignId = "minimal" | "magazine"; // 우표는 추후 작업 (06. DESIGN/03 우표 디자인)
export type LayoutId = "landscape" | "portrait" | "portrait2" | "square";

export type Rect = [number, number, number, number];
type Font = "serif" | "sans" | "arial" | "pre";

export type TextStyle = {
  font: Font;
  size: number;
  weight?: number;
  lead?: number; // 행간 pt (없으면 자동)
  track?: number; // 자간 1/1000 em
  color: string;
  align?: "left" | "center" | "right";
  vertical?: boolean;
};

export type El =
  | { t: "rect"; r: Rect; fill?: string; stroke?: string; sw?: number; round?: boolean; opacity?: number }
  | { t: "img"; r: Rect; src: string; opacity?: number }
  | { t: "photo"; r: Rect }
  | { t: "text"; r: Rect; text: string; s: TextStyle; fit?: boolean }
  // 답 칸. head가 있으면 그 아래부터 답이 흐르고, 넘치면 글자가 줄어든다.
  | { t: "answer"; r: Rect; s: TextStyle; head?: { text: string; s: TextStyle; gap: number }; columns?: number; gap?: number };

export type PageDesign = { bg: string; els: El[] };

export type Layout = {
  id: LayoutId;
  label: string;
  photoSide: "left" | "right";
  left: PageDesign;
  right: PageDesign;
};

export type Design = {
  id: DesignId;
  name: string;
  cover: PageDesign;
  back: PageDesign;
  layouts: Layout[];
};

// Shared stock color for the editor, print preview and Instagram mockups.
export const BOOK_PAPER_COLOR = "#F6F5F0";
export const PAGE_PT = 598.1102362204725;
const R = (x0: number, y0: number, x1: number, y1: number): Rect => [x0 - PAGE_PT, y0, x1 - PAGE_PT, y1];

/* ---------------- 미니멀 ---------------- */
const MV = "#695974";
const MP = BOOK_PAPER_COLOR;
const mArial = (size: number, lead: number, more: Partial<TextStyle> = {}): TextStyle => ({ font: "arial", size, lead, color: MV, ...more });
const mSerif = (size: number, lead: number, more: Partial<TextStyle> = {}): TextStyle => ({ font: "serif", size, lead, color: MV, ...more });

const minimal: Design = {
  id: "minimal",
  name: "미니멀",
  cover: {
    bg: MP,
    els: [
      { t: "photo", r: [36, 60, 562, 412] },
      { t: "text", r: [36, 449, 286, 511], text: "말하지 못한 마음을,\n한 권의 편지로.", s: mSerif(11, 21) },
      { t: "text", r: [303.02, 444, 563.02, 484], text: "想い", s: mSerif(24, 32, { align: "right" }) },
      { t: "text", r: [440.02, 479, 560.02, 504], text: "OMOI LETTER", s: mArial(12, 14.4, { align: "right" }) },
      { t: "text", r: [36, 543, 256, 563], text: "A LETTER FOR YOU", s: mArial(7, 12.6) },
      { t: "text", r: [350.02, 543, 560.02, 565], text: "{date}", s: mArial(8, 14.4, { align: "right" }) },
    ],
  },
  back: {
    bg: MP,
    els: [
      { t: "rect", r: [280, 415, 318, 453], stroke: MV, sw: 0.5, round: true },
      { t: "text", r: [149.06, 428.47, 449.06, 450.47], text: "想い", s: mSerif(11, 16, { align: "center" }) },
      { t: "text", r: [149, 465, 449, 483], text: "OMOI LETTER", s: mArial(8, 12, { align: "center" }) },
      { t: "text", r: [149, 487, 449, 521], text: "누군가를 생각하는 마음을 인터뷰하고,\n편지로 전합니다.", s: mSerif(7.5, 12, { align: "center" }) },
      { t: "text", r: [149, 528, 449, 544], text: "A LETTER FOR YOU", s: mArial(6, 10, { align: "center" }) },
    ],
  },
  layouts: [
    {
      id: "landscape",
      label: "가로",
      photoSide: "right",
      left: {
        bg: MP,
        els: [
          { t: "answer", r: [166.5, 168, 451.5, 448.5], head: { text: "{no}. {q}", s: { font: "sans", size: 17, lead: 26, color: MV, align: "center" }, gap: 29.5 }, s: mSerif(10, 19) },
          { t: "text", r: [36, 551, 356, 571], text: "{il}  OMOI LETTER", s: mArial(7, 12.6) },
        ],
      },
      right: {
        bg: MP,
        els: [
          { t: "photo", r: R(702.17, 164.06, 1092.17, 434.06) },
          { t: "text", r: R(1105.53, 569.61, 1245.53, 589.61), text: "{ir}  OMOI PHOTO", s: mArial(7, 12.6) },
        ],
      },
    },
    {
      id: "portrait",
      label: "세로",
      photoSide: "right",
      left: {
        bg: MP,
        els: [
          { t: "answer", r: [187, 153.19, 427, 472], head: { text: "{q}", s: mSerif(20, 29, { align: "center" }), gap: 21.8 }, s: mSerif(10.5, 20) },
          { t: "text", r: [34.59, 564, 354.59, 584], text: "{il}  OMOI LETTER", s: mArial(7, 12.6) },
        ],
      },
      right: {
        bg: MP,
        els: [
          { t: "photo", r: R(754.17, 108.06, 1040.17, 490.06) },
          { t: "text", r: R(1105.71, 568, 1245.71, 588), text: "{ir}  OMOI PHOTO", s: mArial(7, 12.6) },
        ],
      },
    },
  ],
};

/* ---------------- 매거진 ---------------- */
const GV = "#695974";
const GC = BOOK_PAPER_COLOR;
const gArial = (size: number, lead: number, more: Partial<TextStyle> = {}): TextStyle => ({ font: "arial", size, lead, color: GV, ...more });
const gSerif = (size: number, lead: number, more: Partial<TextStyle> = {}): TextStyle => ({ font: "serif", size, lead, color: GV, ...more });
// 제목 앞 큰 따옴표 장식 (80pt). DesignCraft에서는 글상자보다 위로 그려져서 그만큼 올린다.
const gQuote = (x: number, y: number): El => ({ t: "text", r: [x, y - 32, x + 212, y + 44], text: "“", s: gSerif(80, 27) });

const magazine: Design = {
  id: "magazine",
  name: "매거진",
  cover: {
    bg: GC,
    els: [
      { t: "photo", r: [0, 0, 398, PAGE_PT] },
      { t: "text", r: [422, 44, 582, 144], text: "OMOI\nLetter", s: gSerif(29, 32) },
      { t: "text", r: [422, 180, 572, 290], text: "A LETTER FOR YOU\n\n말하지 못한 마음을,\n한 권의 편지로.", s: gSerif(9, 17) },
      { t: "text", r: [422, 505, 572, 535], text: "TO. {name}", s: gSerif(10, 16) },
      { t: "text", r: [422, 535, 572, 555], text: "{date}", s: gArial(8, 12.8, { track: 80 }) },
    ],
  },
  back: {
    bg: GC,
    els: [
      { t: "text", r: [40, 55, 540, 80], text: "EVERY LETTER BEGINS WITH SOMEONE.", s: gArial(7, 11.2, { track: 110 }) },
      { t: "photo", r: [40, 80, 558, 406] },
      { t: "text", r: [40, 443, 558, 475], text: "누군가를 생각하는 마음을 인터뷰하고, 편지로 전합니다.", s: gSerif(10, 16) },
      // DesignCraft는 첫 줄 기준선을 글꼴 높이에 맞춰 더 위에 둔다 — 아래 문구와 겹치지 않게 11pt 올림
      { t: "text", r: [40, 484, 558, 554], text: "Omoi Letter", s: gSerif(40, 52) },
      { t: "text", r: [45.73, 540, 525.73, 558], text: "想い : 누군가를 생각하는 마음", s: gArial(9, 14.4) },
    ],
  },
  layouts: [
    {
      id: "landscape",
      label: "가로",
      photoSide: "right",
      left: {
        bg: GC,
        els: [
          { t: "text", r: [48, 26, 528, 44], text: "A Letter for You", s: gArial(8, 14.4) },
          gQuote(48, 176.07),
          { t: "answer", r: [48, 212, 308, 533], head: { text: "{q}", s: gSerif(15, 27), gap: 24 }, s: gSerif(10, 17) },
          { t: "text", r: [48, 562, 548, 580], text: "{il}  OMOI LETTER", s: gArial(7, 12.6) },
        ],
      },
      right: {
        bg: GC,
        els: [
          { t: "text", r: R(1100.72, 26, 1190.72, 44), text: "OMOI LETTER", s: gArial(7, 12.6) },
          { t: "photo", r: R(646, 213, 1148, 515) },
          { t: "text", r: R(646, 527, 1096, 549), text: "FIRST IMPRESSIONS / A LETTER FOR YOU", s: gArial(7, 12.6) },
          { t: "text", r: R(1091.09, 562, 1156.09, 580), text: "{ir}  OMOI PHOTO", s: gArial(7, 12.6) },
        ],
      },
    },
    {
      id: "portrait",
      label: "세로 1",
      photoSide: "right",
      left: {
        bg: GC,
        els: [
          { t: "text", r: [40, 26, 520, 44], text: "A Letter for You", s: gArial(8, 14.4) },
          gQuote(48.9, 207.94),
          { t: "text", r: [48.9, 246.18, 298.9, 516.18], text: "{q}", s: gSerif(15, 27), fit: true },
          { t: "answer", r: [302.9, 246.18, 556.9, 516.18], s: gSerif(10, 17) },
          { t: "text", r: [40, 562, 540, 580], text: "{il}  OMOI LETTER", s: gArial(7, 12.6) },
        ],
      },
      right: {
        bg: GC,
        els: [
          { t: "text", r: R(1029.67, 70.43, 1119.67, 88.43), text: "OMOI LETTER", s: gArial(7, 12.6) },
          { t: "photo", r: R(717.17, 83.06, 1077.17, 515.06) },
          { t: "text", r: R(1100, 562, 1165, 580), text: "{ir}  OMOI PHOTO", s: gArial(7, 12.6) },
        ],
      },
    },
    {
      id: "portrait2",
      label: "세로 2",
      photoSide: "left",
      left: {
        bg: GC,
        els: [
          { t: "text", r: [22, 26, 502, 44], text: "A Letter for You", s: gArial(8, 14.4) },
          { t: "photo", r: [22, 60, 576, 544] },
          { t: "text", r: [22, 562, 522, 580], text: "{il}  OMOI PHOTO", s: gArial(7, 12.6) },
        ],
      },
      right: {
        bg: GC,
        els: [
          { t: "text", r: R(1070, 26, 1160, 44), text: "OMOI LETTER", s: gArial(7, 12.6) },
          gQuote(646 - PAGE_PT, 261.09),
          { t: "text", r: R(646, 300, 858.19, 545), text: "{q}", s: gSerif(16, 28.8), fit: true },
          { t: "answer", r: R(890, 300, 1148, 545), s: gSerif(10, 18) },
          { t: "text", r: R(1100, 562, 1165, 580), text: "{ir}  OMOI LETTER", s: gArial(7, 12.6) },
        ],
      },
    },
  ],
};

// Minimal full-page photo uses the same generous photo area as the magazine option.
minimal.layouts.push({
  id: "portrait2",
  label: "풀페이지",
  photoSide: "right",
  left: minimal.layouts[1].left,
  right: {
    bg: MP,
    els: [
      { t: "photo", r: [22, 60, 576, 544] },
      { t: "text", r: [36, 551, 356, 571], text: "{ir}  OMOI PHOTO", s: mArial(7, 12.6) },
    ],
  },
});
// Keep the original layouts; only rename the magazine portrait-2 option.
for (const design of [minimal, magazine]) {
  const portrait = design.layouts.find((layout) => layout.id === "portrait")!;
  portrait.label = "세로";
  const landscape = design.layouts.find((layout) => layout.id === "landscape")!;
  for (const side of ["left", "right"] as const) {
    portrait[side] = { ...portrait[side], els: portrait[side].els.map((el): El => {
      if (el.t !== "text" || !el.text.includes("OMOI LETTER")) return el;
      const reference = landscape[side].els.find((item) => item.t === "text" && item.text === el.text);
      return reference?.t === "text" ? { ...el, r: [...reference.r] as Rect, s: { ...reference.s } } : el;
    }) };
  }
  const portrait2 = design.layouts.find((layout) => layout.id === "portrait2");
  if (portrait2) portrait2.label = "풀페이지";
}

export const DESIGNS: Record<DesignId, Design> = { minimal, magazine };
export const DESIGN_LIST: Design[] = [minimal, magazine];
export const DEFAULT_DESIGN: DesignId = "minimal";

export function designOf(id: DesignId | undefined): Design {
  return DESIGNS[id ?? DEFAULT_DESIGN] ?? DESIGNS[DEFAULT_DESIGN];
}

// 표지에 받는 분 이름 자리가 있는지 (없으면 시작 화면에서 따로 받는다)
export function coverShowsName(id: DesignId | undefined) {
  return designOf(id).cover.els.some((el) => el.t === "text" && el.text.includes("{name}"));
}

// 고른 레이아웃이 이 디자인에 없으면 같은 방향의 첫 번째 것으로 (가로 2 → 가로)
export function layoutOf(design: Design, id: LayoutId | undefined): Layout {
  const want = id === "square" ? "portrait2" : id ?? "portrait";
  return (
    design.layouts.find((l) => l.id === want) ??
    design.layouts.find((l) => l.id.startsWith(want.replace("2", ""))) ??
    design.layouts[0]
  );
}

/** Every new interior page starts with its own photo. Letters share that page. */
export function photoPageDesign(designId: DesignId | undefined, layoutId: LayoutId | undefined, hasLetter: boolean): PageDesign {
  const design = designOf(designId);
  const layout = layoutOf(design, layoutId);
  const source = layout[layout.photoSide];
  const base = { ...source, els: source.els.map((el): El => el.t === "text" ? { ...el, text: el.text.replace(/\{(?:il|ir|pl|pr)\}/g, "{no}") } : el) };
  if (!hasLetter) return base;
  // The existing magazine portrait page already contains quote / question / answer.
  const stationery = magazine.layouts.find((l) => l.id === "portrait")!.left;
  return { bg: design.cover.bg, els: stationery.els.map((el): El => el.t === "text" ? { ...el, text: el.text.replace(/\{(?:il|ir|pl|pr)\}/g, "{no}") } : el) };
}

