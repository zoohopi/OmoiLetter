import "server-only";
import { chromium } from "playwright";
import { cookies } from "next/headers";
import { AdminError } from "./access";

export const PDF_TEMPLATE_VERSION = 1;
const running = new Set<string>();
export async function renderOrderPdf(orderId: string) {
  if (running.size >= 2 || running.has(orderId)) throw new AdminError("PDF를 생성 중이에요. 잠시 후 다시 눌러 주세요.", 429);
  const base = process.env.SITE_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  if (!base) throw new AdminError("서버에 SITE_URL을 설정해 주세요.", 503);
  const origin = new URL(base).origin;
  if (!/^https?:\/\//.test(origin)) throw new AdminError("사이트 주소 설정을 확인해 주세요.", 503);
  const executablePath = process.env.PDF_BROWSER_EXECUTABLE || undefined;
  const channel = !executablePath && process.platform === "win32" ? "msedge" : undefined;
  running.add(orderId);
  let browser;
  try {
    try { browser = await chromium.launch({ headless: true, executablePath, channel }); }
    catch { throw new AdminError("서버에 PDF용 Chromium을 설치하거나 PDF_BROWSER_EXECUTABLE을 설정해 주세요.", 503); }
    const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, reducedMotion: "reduce" });
    const jar = await cookies();
    await context.addCookies(jar.getAll().map(({ name, value }) => ({ name, value, url: origin, secure: origin.startsWith("https:") })));
    // Only our own print route/assets may be requested by the privileged browser.
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.emulateMedia({ media: "print" });
    await page.goto(`${origin}/admin/print/${orderId}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('[data-print-ready="true"]') || document.querySelector("[data-print-error]"), null, { timeout: 60000 });
    if (await page.locator("[data-print-error]").count()) throw new AdminError("주문 사진을 불러오지 못했어요. 잠시 후 다시 생성해 주세요.", 500);
    const pageCount = Number(await page.locator(".admin-print-book").getAttribute("data-page-count"));
    if (!Number.isInteger(pageCount) || pageCount < 3 || pageCount > 100) throw new AdminError("PDF 페이지 구성을 확인해 주세요.", 500);
    const buffer = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    return { buffer, pageCount };
  } finally { if (browser) await browser.close(); running.delete(orderId); }
}
