// Move the existing page object so its crop, layout and attached letters keep their IDs.
export function movePage<T extends { id: string }>(pages: T[], fromId: string, toId: string): T[] {
  const from = pages.findIndex(page => page.id === fromId);
  const to = pages.findIndex(page => page.id === toId);
  if (from < 0 || to < 0 || from === to) return pages;
  const result = [...pages];
  const [page] = result.splice(from, 1);
  result.splice(to, 0, page);
  return result;
}
