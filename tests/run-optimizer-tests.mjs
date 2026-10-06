// Kiểm thử giảm dung lượng: độ đúng của bộ đọc/ghi path, và dung lượng + độ lệch điểm ảnh của từng mức nén.
// Dùng: node tests/run-optimizer-tests.mjs   (SVGX_EXTRA="a.svg;b.svg" để thêm file riêng)
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const { evaluate, close } = await launch();
let failed = 0;
const check = (ok, msg) => { if (!ok) { failed++; console.log("  ✗ FAIL:", msg); } };

// 1) Bộ đọc/ghi path: ghi ở 6 chữ số rồi đọc lại phải ra đúng các lệnh và số ban đầu.
const pathCases = ["M10-20.5.5.5L1e2 3z", "m1 2 3 4 5 6", "M0 0a1 1 0 00.5.5", "M0 0h5v5H0z", "M 1,2 C 3,4 5,6 7,8 S 9,10 11,12 Q 1 2 3 4 T 5 6 Z", "M.5.5.5.5-.5-.5zM1 1l2 2zm3 3z"];
const pr = await evaluate(`(() => JSON.stringify(${JSON.stringify(pathCases)}.map(d => {
  const a = Optimizer._parsePath(d), w = a && Optimizer._writePath(a, 6), b = w && Optimizer._parsePath(w);
  return { d, w, same: !!a && !!b && JSON.stringify(a) === JSON.stringify(b) };
})))()`);
console.log("=== path");
for (const r of JSON.parse(pr)) { console.log(`  ${r.same ? "ok " : "BAD"} ${r.d}  →  ${r.w}`); check(r.same, "path roundtrip " + r.d); }
const bad = await evaluate(`["M1 2 3", "L", "M1 2 x", "1 2"].map(d => Optimizer._parsePath(d)).every(v => v === null)`);
check(bad === true, "đường dẫn hỏng phải trả về null (giữ nguyên bản gốc)");

// 2) Từng mức nén trên từng SVG con.
const fx = join(here, "fixtures"), outDir = join(here, "out"); mkdirSync(outDir, { recursive: true });
const inputs = readdirSync(fx).filter(n => n.endsWith(".svg")).map(n => join(fx, n)).concat((process.env.SVGX_EXTRA || "").split(";").filter(Boolean));
const kb = n => n > 1048576 ? (n / 1048576).toFixed(2) + " MB" : (n / 1024).toFixed(1) + " KB";
for (const path of inputs) {
  const f = basename(path);
  const res = JSON.parse(await evaluate(`(async () => {
    await __addText(${JSON.stringify(f)}, ${JSON.stringify(readFileSync(path, "utf8"))});
    const st = __state, s = st.session, out = [];
    for (const c of st.clusters.filter(c => !c.excluded)) {
      const raw = s.exportSvg(c, c.box);
      const row = { raw: raw.length, presets: {} };
      for (const name of ["light", "balanced", "strong"]) {
        const t0 = performance.now();
        const opt = await Optimizer.optimize(raw, Optimizer.PRESETS[name]);
        const ms = Math.round(performance.now() - t0);
        const d = await __diff(raw, opt, c.box);
        row.presets[name] = { size: opt.length, ms, mean: +d.mean.toFixed(3), maxd: d.maxd, badPct: +(100 * d.bad / d.total).toFixed(3),
          images: (opt.match(/<image/g) || []).length, uses: (opt.match(/<use/g) || []).length, meta: /metadata|c2pa/.test(opt), save: name === "balanced" ? opt : null };
      }
      out.push(row);
    }
    return JSON.stringify(out);
  })()`));
  console.log(`\n=== ${f}`);
  res.forEach((r, i) => {
    console.log(`  #${i + 1} gốc ${kb(r.raw)}`);
    for (const [n, p] of Object.entries(r.presets)) {
      console.log(`     ${n.padEnd(8)} ${kb(p.size).padStart(9)} (−${Math.round(100 * (1 - p.size / r.raw))}%)  ${String(p.ms).padStart(5)}ms  lệch TB=${p.mean} max=${p.maxd} pixel>2: ${p.badPct}%  image=${p.images} use=${p.uses}`);
      check(!p.meta, `${f}#${i + 1} ${n}: metadata còn sót`);
      check(p.size <= r.raw, `${f}#${i + 1} ${n}: file lớn hơn bản gốc`);
      const lim = { light: 1.5, balanced: 3, strong: 8 }[n];
      check(p.mean <= lim, `${f}#${i + 1} ${n}: độ lệch trung bình ${p.mean} > ${lim}`);
      if (p.save) writeFileSync(join(outDir, `opt_${f.replace(".svg", "")}_${i + 1}.svg`), p.save);
    }
  });
}

// 3) ZIP có nén: giải bằng CompressionStream/DecompressionStream và đối chiếu nội dung.
const z = await evaluate(`(async () => {
  const text = "<svg>" + "abcdef".repeat(5000) + "</svg>";
  const blob = await Zip([{ name: "a.svg", data: text }, { name: "b.txt", data: "x" }]);
  const buf = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(buf.buffer);
  const method = dv.getUint16(8, true), csize = dv.getUint32(18, true), usize = dv.getUint32(22, true), nlen = dv.getUint16(26, true);
  const body = buf.slice(30 + nlen, 30 + nlen + csize);
  const ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(); w.write(body); w.close();
  const back = new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
  return { method, csize, usize, same: back === text, total: buf.length };
})()`);
console.log("\n=== zip", JSON.stringify(z));
check(z.method === 8 && z.same && z.csize < z.usize / 10, "ZIP deflate sai");

close();
console.log(failed ? `\n${failed} kiểm tra THẤT BẠI` : "\nTất cả kiểm tra đạt");
process.exit(failed ? 1 : 0);
