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


test("manufacturing cover is one 436x217mm flat with an 8mm spine and no interior pages", {skip:process.platform!=="win32"}, async () => {
  const coverScope = {exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/admin/cover-spread.ts"),"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, coverScope);
  assert.equal(coverScope.exports.COVER_SPINE_MM,8);
  const browser = await chromium.launch({headless:true,channel:"msedge"});
  try {
    const page = await browser.newPage();
    await page.setContent('<style>@page{size:217mm 217mm;margin:0}body{margin:0}.bp{width:217mm;height:217mm;background:#f6f5f0;break-after:page}</style><div class="admin-print-book">'+Array.from({length:6},(_,i)=>'<div class="bp">PAGE '+(i+1)+'</div>').join('')+'</div>');
    const spec = {width:211,height:211,bleed:3,spine:8};
    await page.evaluate(coverScope.exports.mountCoverSpread,spec);
    assert.equal(await page.locator('.bp').count(),2);
    assert.equal(await page.locator('[data-cover-side="front"]').textContent(),'PAGE 1');
    assert.equal(await page.locator('[data-cover-side="back"]').textContent(),'PAGE 6');
    assert.equal(await page.locator('.admin-cover-spine').getAttribute('data-spine-mm'),'8');
    assert.equal(await page.locator('.admin-cover-spine-title').textContent(),'OMOILETTER');
    const boxes=await page.locator('.admin-cover-spread > *').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,w:e.getBoundingClientRect().width})));
    assert.ok(Math.abs(boxes[1].w-8*96/25.4)<.1);
    assert.ok(Math.abs(boxes[0].x+boxes[0].w-boxes[1].x)<.1);
    assert.ok(Math.abs(boxes[1].x+boxes[1].w-boxes[2].x)<.1);
    const bytes=await page.pdf({preferCSSPageSize:true,printBackground:true});
    const raw=bytes.toString('latin1');
    assert.equal((raw.match(/\/Type\s*\/Page\b/g)||[]).length,1);
    const media=raw.match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/);
    assert.ok(media);
    assert.ok(Math.abs(Number(media[1])*25.4/72-436)<.2);
    assert.ok(Math.abs(Number(media[2])*25.4/72-217)<.2);
  } finally {await browser.close();}
});
