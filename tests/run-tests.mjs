// Chạy svg-extractor.html trong Chrome headless và kiểm tra kết quả tách.
// Dùng: node tests/run-tests.mjs [đường-dẫn-chrome]
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const { evaluate, send, close } = await launch(process.argv[2]);

const fx = join(here, "fixtures");
const outDir = join(here, "out"); mkdirSync(outDir, { recursive: true });
const results = {};
const inputs = readdirSync(fx).filter(n => n.endsWith(".svg")).map(n => join(fx, n))
  .concat((process.env.SVGX_EXTRA || "").split(";").filter(Boolean));
for (const path of inputs) {
  const f = basename(path);
  const text = readFileSync(path, "utf8");
  const res = await evaluate(`(async () => {
    const text = ${JSON.stringify(text)};
    await __addText(${JSON.stringify(f)}, text);
    const st = __state, s = st.session;
    // Bản gốc không có nền (để so điểm ảnh từng SVG con)
    const d = new DOMParser().parseFromString(text, "image/svg+xml");
    d.querySelectorAll(".bg").forEach(n => n.remove());
    const vb = d.documentElement.viewBox.baseVal;
    [...d.documentElement.children].filter(n => n.localName === "rect" && +n.getAttribute("width") >= vb.width && +n.getAttribute("height") >= vb.height).forEach(n => n.remove());
    const noBg = new XMLSerializer().serializeToString(d);
    const out = [];
    for (const c of st.clusters) {
      const svg = s.exportSvg(c, c.box);
      const others = st.clusters.filter(o => o !== c && !o.excluded && SVGX.Box.inter(o.box, c.box) && SVGX.Box.area(SVGX.Box.inter(o.box, c.box)) > 0);
      out.push({ box: Object.fromEntries(Object.entries(c.box).map(([k, v]) => [k, +v.toFixed(3)])), excluded: c.excluded, units: c.units.length,
        bytes: svg.length, images: (svg.match(/data:image/g) || []).length, svg,
        diff: c.excluded || others.length ? null : await __diff(noBg, svg, c.box) });
    }
    return out;
  })()`);
  results[f] = res;
  console.log(`\n=== ${f}: ${res.filter(r => !r.excluded).length} SVG con (+${res.filter(r => r.excluded).length} loại trừ)`);
  res.forEach((r, i) => {
    const b = r.box;
    console.log(`  #${i + 1}${r.excluded ? " [loại trừ]" : ""} box=(${b.x0}, ${b.y0}) → (${b.x1}, ${b.y1}) units=${r.units} bytes=${r.bytes} images=${r.images}` +
      (r.diff ? ` pixelDiff=${r.diff.bad}/${r.diff.total} max=${r.diff.maxd}` : ""));
    writeFileSync(join(outDir, `${f.replace(".svg", "")}_${i + 1}.svg`), r.svg);
  });
}

// Thao tác: khoảng cách gộp, Gộp, Tách nhỏ
const ops = await evaluate(`(async () => {
  const st = __state, boxes = () => st.clusters.filter(c => !c.excluded).length;
  const r = {};
  const idx = st.files.findIndex(f => f.name === "flat.svg");
  document.getElementById("optTol").value = 70;
  await openFile(idx, true); r.flatTol70 = boxes();
  document.getElementById("optTol").value = 0;
  await openFile(idx, true); r.flatTol0 = boxes();
  st.selected = new Set(st.clusters.slice(2, 4)); await document.getElementById("bMerge").onclick(); r.afterMerge = boxes();
  st.selected = new Set([st.clusters[2]]); await document.getElementById("bSplit").onclick(); r.afterSplit = boxes();
  const ci = st.files.findIndex(f => f.name === "canva-like.svg");
  await openFile(ci, false);
  st.selected = new Set([st.clusters[2]]); await document.getElementById("bSplit").onclick(); r.canvaRingsSplit = boxes();
  await openFile(ci, true); r.canvaFresh = boxes();
  return r;
})()`);
console.log("\n=== thao tác:", JSON.stringify(ops));
await send("Page.enable");
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(join(outDir, "ui.png"), Buffer.from(shot.result.data, "base64"));
close();
writeFileSync(join(outDir, "results.json"), JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.map(({ svg, ...r }) => r)])), null, 1));
