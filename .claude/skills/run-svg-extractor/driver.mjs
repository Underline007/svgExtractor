// Driver cho SVG Extractor: mở svg-extractor.html trong Chrome headless, nạp file SVG, (tùy chọn) gộp/tách/loại trừ,
// đợi phân tích + giảm dung lượng xong, rồi ghi từng SVG con ra đĩa, chụp màn hình và in bảng tóm tắt.
//
//   node .claude/skills/run-svg-extractor/driver.mjs <file.svg> [tùy chọn]
//
//   --out <thư-mục>      ghi <tên>_<n>.svg cho từng SVG con (mặc định: không ghi)
//   --shot <file.png>    chụp màn hình giao diện sau khi xong
//   --preset <mức>       off | light | balanced | strong (mặc định: balanced, giống giao diện)
//   --merge 3,4          chọn các mục (đánh số từ 1 như trên giao diện) rồi bấm "Gộp"
//   --split 3            chọn một mục rồi bấm "Tách nhỏ"
//   --exclude 5,6        bật/tắt loại trừ cho các mục
//   --zip <file.zip>     ghi file ZIP đúng như nút "Tải ZIP (file này)"
//   --opt k=v[,k=v]      đặt tùy chọn tách: merge=always|auto|never tol=<số> vec=0|1 key=0|1 bg=0|1 page=0|1 pad=<số>
//   --json               in JSON thay vì bảng
//
// Biến môi trường: CHROME = đường dẫn chrome.exe/msedge.exe nếu không nằm ở vị trí mặc định.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { launch } from "../../../tests/cdp.mjs";

const argv = process.argv.slice(2);
const file = argv[0];   // file SVG luôn là đối số đầu tiên
const opt = name => { const i = argv.indexOf("--" + name); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true); };
const list = v => (v ? String(v).split(",").map(Number) : []);
if (!file || file.startsWith("--")) { console.error("Dùng: node driver.mjs <file.svg> [--out dir] [--shot png] [--preset ...] [--merge 3,4] [--split 3] [--exclude 5] [--zip file] [--opt k=v] [--json]"); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const { evaluate, send, close } = await launch();
try {
  // Tùy chọn tách phải đặt trước khi nạp file (mỗi lần đổi, giao diện tự phân tích lại).
  const ids = { merge: "optMerge", tol: "optTol", vec: "optVec", key: "optKey", bg: "optBg", page: "optPage", pad: "optPad" };
  const preset = opt("preset") || "balanced";
  await evaluate(`(() => { const p = document.getElementById("optPreset"); p.value = ${JSON.stringify(preset)}; p.onchange(); })()`);
  for (const kv of String(opt("opt") || "").split(",").filter(Boolean)) {
    const [k, v] = kv.split("=");
    if (!ids[k]) throw new Error("tùy chọn không hợp lệ: " + k);
    await evaluate(`(() => { const e = document.getElementById(${JSON.stringify(ids[k])}); if (e.type === "checkbox") e.checked = ${v === "1"}; else e.value = ${JSON.stringify(v)}; })()`);
  }

  const idle = async () => {
    for (let i = 0; i < 600; i++) {   // tối đa ~3 phút (file Canva 13 MB mất khoảng 2–3 giây)
      const s = await evaluate(`({ busy: __state.busy, sum: document.getElementById("summary").textContent, n: __state.clusters.length, ok: !!__state.session,
        err: document.getElementById("status").className === "err" ? document.getElementById("status").textContent : null })`);
      if (!s.busy && !s.ok && s.err) throw new Error(s.err);   // file lỗi: giao diện đã hiện thông báo, không cần chờ thêm
      if (!s.busy && s.ok && !/Đang/.test(s.sum)) return s;
      await sleep(300);
    }
    throw new Error("quá thời gian chờ phân tích/tối ưu");
  };
  const click = async (selIdx, button) => {
    await evaluate(`(async () => { const st = __state; st.selected = new Set(${JSON.stringify(selIdx)}.map(i => st.clusters[i - 1])); await document.getElementById(${JSON.stringify(button)}).onclick(); })()`);
    await idle();
  };

  await evaluate(`__addText(${JSON.stringify(basename(file))}, ${JSON.stringify(readFileSync(file, "utf8"))}).then(() => 1)`);
  await idle();
  if (list(opt("merge")).length) await click(list(opt("merge")), "bMerge");
  if (list(opt("split")).length) await click(list(opt("split")), "bSplit");
  if (list(opt("exclude")).length) await click(list(opt("exclude")), "bExcl");

  // Lấy SVG cuối cùng của từng cụm bằng đúng hàm mà giao diện dùng khi tải xuống.
  const rows = JSON.parse(await evaluate(`(async () => {
    const st = __state, o = optOpts(), out = [];
    for (let i = 0; i < st.clusters.length; i++) {
      const c = st.clusters[i], r = await finalSvg(st.session, c, c.excluded ? null : o);
      out.push({ n: i + 1, excluded: c.excluded, box: [c.box.x0, c.box.y0, c.box.x1, c.box.y1].map(v => +v.toFixed(2)), raw: r.raw, size: r.text.length, text: r.text });
    }
    return JSON.stringify(out);
  })()`));

  if (opt("out")) {
    const dir = resolve(opt("out")); mkdirSync(dir, { recursive: true });
    const base = basename(file).replace(/\.svg$/i, "");
    let k = 0;
    for (const r of rows) if (!r.excluded) { r.path = join(dir, `${base}_${++k}.svg`); writeFileSync(r.path, r.text); }
  }
  if (opt("zip")) {
    const z = await evaluate(`(async () => {
      let got = null; const keep = window.download;
      window.download = b => { got = b; };
      document.getElementById("zipOne").click();
      for (let i = 0; i < 300 && !got; i++) await new Promise(r => setTimeout(r, 200));
      window.download = keep;
      if (!got) return null;
      const buf = new Uint8Array(await got.arrayBuffer());
      let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(s);
    })()`);
    if (!z) throw new Error("không tạo được ZIP");
    writeFileSync(resolve(opt("zip")), Buffer.from(z, "base64"));
  }
  if (opt("shot")) {
    await send("Page.enable");
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(opt("shot")), Buffer.from(shot.result.data, "base64"));
  }

  const kb = n => n > 1048576 ? (n / 1048576).toFixed(2) + " MB" : (n / 1024).toFixed(1) + " KB";
  if (opt("json")) console.log(JSON.stringify(rows.map(({ text, ...r }) => r), null, 1));
  else {
    console.log(`${basename(file)}: ${rows.filter(r => !r.excluded).length} SVG con (+${rows.filter(r => r.excluded).length} loại trừ), mức nén: ${preset}`);
    for (const r of rows) console.log(`  #${r.n}${r.excluded ? " [loại trừ]" : ""} box=(${r.box.join(", ")}) ${kb(r.raw)} → ${kb(r.size)}${r.path ? "  " + r.path : ""}`);
    if (opt("zip")) console.log("zip:", resolve(opt("zip")));
    if (opt("shot")) console.log("screenshot:", resolve(opt("shot")));
  }
} catch (e) { console.error("LỖI:", e.message); process.exitCode = 1; } finally { close(); }
process.exit(process.exitCode || 0);
