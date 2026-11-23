import "server-only";
import { chromium } from "playwright";
import { cookies } from "next/headers";
import { AdminError } from "./access";
import { orderPdfRanges } from "./pdf-parts";
import { COVER_SPINE_MM, mountCoverSpread } from "./cover-spread";
import { BLEED_MM, BOOK_TRIM } from "../letter/rules";

export const PDF_TEMPLATE_VERSION = 30;
const running = new Set<string>();
export async function renderOrderPdf(orderId: string) {
  let stage = "브라우저 실행";
  if (running.size >= 2 || running.has(orderId)) throw new AdminError("PDF를 생성 중이에요. 잠시 후 다시 눌러 주세요.", 429);
  const base = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  if (!base) throw new AdminError("서버에 SITE_URL을 설정해 주세요.", 503);
  const origin = new URL(base).origin;
  if (!/^https?:\/\//.test(origin)) throw new AdminError("사이트 주소 설정을 확인해 주세요.", 503);
  const executablePath = process.env.PDF_BROWSER_EXECUTABLE || undefined;
  const channel = !executablePath && process.platform === "win32" ? "msedge" : undefined;
  running.add(orderId);
  let browser;
  try {
    try {
      if (process.env.VERCEL && !executablePath) {
        const serverless = (await import("@sparticuz/chromium")).default;
        browser = await chromium.launch({ headless:true, executablePath:await serverless.executablePath(), args:serverless.args });
      } else browser = await chromium.launch({ headless: true, executablePath, channel });
    }
    catch { throw new AdminError("서버에 PDF용 Chromium을 설치하거나 PDF_BROWSER_EXECUTABLE을 설정해 주세요.", 503); }
    const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, reducedMotion: "reduce" });
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      await context.setExtraHTTPHeaders({ "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET });
    }
    const jar = await cookies();
    await context.addCookies(jar.getAll().map(({ name, value }) => ({ name, value, url: origin, secure: origin.startsWith("https:") })));
    // Only our own print route/assets may be requested by the privileged browser.
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(45000);
    stage = "주문 원고 열기";
    await page.emulateMedia({ media: "print" });
    const navigation = await page.goto(`${origin}/admin/print/${orderId}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!navigation?.ok()) throw new AdminError(`원고 페이지 접근 실패 (${navigation?.status() ?? "응답 없음"}). 배포 접근 제한을 확인해 주세요.`, 503);
    stage = "사진·글꼴 불러오기";
    await page.waitForFunction(() => document.querySelector('[data-print-ready="true"]') || document.querySelector("[data-print-error]"), null, { timeout: 60000 });
    if (await page.locator("[data-print-error]").count()) throw new AdminError((await page.locator("[data-print-error]").first().textContent()) || "주문 사진을 불러오지 못했어요.", 500);
    const pageCount = Number(await page.locator(".admin-print-book").getAttribute("data-page-count"));
    if (!Number.isInteger(pageCount) || pageCount < 3 || pageCount > 100) throw new AdminError("PDF 페이지 구성을 확인해 주세요.", 500);
    stage = "PDF 파일 생성";
    const ranges = orderPdfRanges(pageCount);
    const createPdf = async (pageRanges?: string) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      return Promise.race([
        page.pdf({ preferCSSPageSize:true, printBackground:true, displayHeaderFooter:false, pageRanges, margin:{top:0,right:0,bottom:0,left:0} }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("PDF render timeout")), 45000); }),
      ]).finally(() => clearTimeout(timer));
    };
    const buffer = await createPdf();
    stage = "속지 PDF 생성";
    const interiorBuffer = await createPdf(ranges.interior);
    stage = "책등 포함 표지 펼침 PDF 생성";
    await page.evaluate(mountCoverSpread, { width: BOOK_TRIM.w, height: BOOK_TRIM.h, bleed: BLEED_MM, spine: COVER_SPINE_MM });
    const coverBuffer = await createPdf();
    return { buffer, coverBuffer, interiorBuffer, pageCount };

  } catch (error) {
    if (error instanceof AdminError) throw error;
    console.error("admin_pdf_failed", { stage, name: error instanceof Error ? error.name : "Error" });
    throw new AdminError(`${stage} 단계에서 처리가 지연됐어요. 잠시 후 다시 시도하거나 원고 미리보기에서 PDF로 저장해 주세요.`, 504);
  } finally { if (browser) await browser.close(); running.delete(orderId); }
}
