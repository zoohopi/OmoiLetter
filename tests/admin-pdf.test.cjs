const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { chromium } = require("playwright");
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/admin/pdf-parts.ts"),"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const scope = { exports:{} }; vm.runInNewContext(output,scope);
const { orderPdfRanges } = scope.exports;

test("cover and interior page ranges keep the first and last pages out of the interior", () => {
  assert.equal(orderPdfRanges(3).cover,"1,3");
  assert.equal(orderPdfRanges(3).interior,"2");
  assert.equal(orderPdfRanges(20).cover,"1,20");
  assert.equal(orderPdfRanges(20).interior,"2-19");
  for (const count of [0,2,101,3.5,NaN]) assert.throws(() => orderPdfRanges(count));
});

test("Chromium produces a two-page cover and four-page interior from a six-page book", {skip:process.platform!=="win32"}, async () => {
  const browser = await chromium.launch({headless:true,channel:"msedge"});
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>@page{size:217mm 217mm;margin:0}body{margin:0}.leaf{height:217mm;break-after:page}.leaf:last-child{break-after:auto}</style>${Array.from({length:6},(_,i)=>`<div class="leaf">PAGE ${i+1}</div>`).join("")}`);
    const ranges=orderPdfRanges(6);
    for (const [part,count] of [["cover",2],["interior",4]]) {
      const bytes=await page.pdf({preferCSSPageSize:true,pageRanges:ranges[part]});
      const pages=(bytes.toString("latin1").match(/\/Type\s*\/Page\b/g)||[]).length;
      assert.equal(pages,count,part);
      assert.match(bytes.toString("latin1"),/\/MediaBox/);
    }
  } finally { await browser.close(); }
});
