export type OrderPdfPart = "all" | "cover" | "interior";

// PrintBook renders front cover, all inner pages, then back cover.
export function orderPdfRanges(pageCount: number) {
  if (!Number.isInteger(pageCount) || pageCount < 3 || pageCount > 100) throw new Error("Invalid book page count");
  return { cover: `1,${pageCount}`, interior: pageCount === 3 ? "2" : `2-${pageCount - 1}` };
}
