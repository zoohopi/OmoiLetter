// 홈페이지(p.06 책 미리보기, p.08 인스타그램 예시)에 보여 주는 샘플 편지책 한 권.
// 실제 편지책과 같은 템플릿(BookPage)·매거진 디자인으로 그린다. 사진은 public/sample/.
import type { PageSpec } from "@/components/letter/BookPage";
import type { DesignId, LayoutId } from "./designs";

export const SAMPLE_DESIGN: DesignId = "magazine";
export const SAMPLE_NAME = "지은";
export const SAMPLE_DATE = "2026-12-24";
export const SAMPLE_COVER = "/sample/mag-cover.jpg";

const SPREADS: { layout: LayoutId; photo: string; question: string; answer: string }[] = [
  {
    layout: "landscape",
    photo: "/sample/mag-1.jpg",
    question: "그 사람의 첫인상은 어땠나요?",
    answer:
      "처음 만난 날, 카페 창가에 앉아 있던 너는 햇빛 때문에 자꾸 눈을 찡그렸어. 그게 이상하게 계속 생각났어.\n\n무슨 말을 나눴는지는 조금 흐릿해졌지만, 네가 웃던 순간만큼은 아직 선명해.",
  },
  {
    layout: "portrait",
    photo: "/sample/mag-2.jpg",
    question: "함께라서 가장 행복했던 날은 언제였나요?",
    answer:
      "특별한 날보다 아무 일도 없었던 오후가 떠올라.\n\n같은 풍경을 바라보고, 나란히 걸음을 맞추던 시간. 그런 작은 순간들이 모여 우리의 이야기가 되었어.",
  },
  {
    layout: "portrait2",
    photo: "/sample/mag-3.jpg",
    question: "지금 꼭 하고 싶은 말이 있나요?",
    answer:
      "말로는 잘 못 했지만, 늘 고마웠어.\n\n앞으로의 계절도 지금처럼 나란히 걷고 싶어. 생일 축하해, 사랑해.",
  },
];

/** 표지 → 펼침 3개(왼쪽·오른쪽) → 뒷표지 */
export const SAMPLE_PAGES: PageSpec[] = [
  { kind: "cover", photoId: SAMPLE_COVER },
  ...SPREADS.flatMap((s, i) =>
    (["left", "right"] as const).map(
      (side): PageSpec => ({ kind: "leaf", side, layout: s.layout, no: i + 1, photoId: s.photo, question: s.question, answer: s.answer }),
    ),
  ),
  { kind: "back", photoId: SAMPLE_COVER },
];
