// Manufacturing flat: front (left), 8mm spine, back (right).
export const COVER_SPINE_MM = 8;
export function mountCoverSpread(spec: { width: number; height: number; bleed: number; spine: number }) {
  const book = document.querySelector<HTMLElement>('.admin-print-book');
  const leaves = book?.querySelectorAll<HTMLElement>(':scope > .bp');
  if (!book || !leaves || leaves.length < 2) throw new Error('Cover pages missing');
  const front = leaves[0].cloneNode(true) as HTMLElement;
  const back = leaves[leaves.length - 1].cloneNode(true) as HTMLElement;
  const width = spec.width * 2 + spec.spine + spec.bleed * 2;
  const height = spec.height + spec.bleed * 2;
  const paper = getComputedStyle(leaves[0]).backgroundColor;
  const anniversary = book.dataset.anniversaryDate?.replaceAll("-", ".") ?? "";
  const style = document.createElement('style');
  style.textContent = `@page{size:${width}mm ${height}mm;margin:0}.admin-print-book{width:${width}mm!important;margin:0!important}.admin-cover-spread{display:flex;width:${width}mm;height:${height}mm;overflow:hidden;background:${paper};break-inside:avoid}.admin-cover-panel{position:relative;width:${spec.width + spec.bleed}mm;height:${height}mm;overflow:hidden;flex:none}.admin-cover-panel .bp{position:absolute!important;top:0!important;margin:0!important;break-after:auto!important}.admin-cover-spine{width:${spec.spine}mm;height:${height}mm;flex:none;position:relative;background:${paper}}.admin-cover-spine-title{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(90deg);font:400 8pt Arial,Helvetica,sans-serif;letter-spacing:1pt;white-space:nowrap;color:#695974}.admin-cover-spine-date{position:absolute;left:50%;bottom:12mm;transform:translateX(-50%) rotate(90deg);transform-origin:center;font:400 5pt Arial,Helvetica,sans-serif;white-space:nowrap;color:#695974}`;
  document.body.append(style);
  const spread = document.createElement('div');
  spread.className = 'admin-cover-spread';
  for (const [index, leaf] of [front, back].entries()) {
    const panel = document.createElement('div');
    panel.className = 'admin-cover-panel';
    panel.dataset.coverSide = index === 0 ? 'front' : 'back';
    leaf.style.left = index === 0 ? '0' : `-${spec.bleed}mm`;
    panel.append(leaf);
    if (index === 1) {
      const spine = document.createElement('div');
      spine.className = 'admin-cover-spine';
      spine.dataset.spineMm = String(spec.spine);
      const title = document.createElement('span');
      title.className = 'admin-cover-spine-title';
      title.textContent = 'OMOILETTER';
      spine.append(title);
      if (anniversary) {
        const date = document.createElement('span');
        date.className = 'admin-cover-spine-date';
        date.textContent = anniversary;
        spine.append(date);
      }
      spread.append(spine);
    }
    spread.append(panel);
  }
  book.replaceChildren(spread);
  book.dataset.pageCount = '1';
  document.querySelector('.admin-print-actions')?.remove();
  return { width, height };
}
