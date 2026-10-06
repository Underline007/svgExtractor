// Khởi động Chrome headless, mở svg-extractor.html và trả về hàm evaluate để chạy mã trong trang.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Các hàm dựng sẵn trong trang: vẽ SVG ra điểm ảnh và so sánh hai SVG trên cùng một hộp.
const PAGE_HELPERS = `
window.__render = async (text, box, W, H) => {
  const d = new DOMParser().parseFromString(text, "image/svg+xml");
  const r = d.documentElement;
  r.setAttribute("viewBox", [box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0].join(" "));
  r.setAttribute("width", W); r.setAttribute("height", H); r.setAttribute("preserveAspectRatio", "none");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(d)], { type: "image/svg+xml" }));
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0, W, H);
  URL.revokeObjectURL(url);
  return g.getImageData(0, 0, W, H).data;
};
window.__diff = async (orig, exp, box) => {
  const W = 600, H = Math.max(1, Math.round(600 * (box.y1 - box.y0) / (box.x1 - box.x0)));
  const a = await __render(orig, box, W, H), b = await __render(exp, box, W, H);
  let bad = 0, maxd = 0, sum = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > 2) bad++; if (d > maxd) maxd = d; sum += d; }
  return { bad, maxd, total: a.length, mean: sum / a.length };
};`;

export async function launch(chrome = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe") {
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "svgx-"))}`, "--window-size=1400,900", "about:blank"], { stdio: "ignore" });
  let ver;
  for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${pathToFileURL(resolve(here, "../svg-extractor.html"))}`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let seq = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails, null, 1));
    return r.result.result.value;
  };
  for (let i = 0; i < 50; i++) { try { if (await evaluate('typeof window.__addText === "function"')) break; } catch {} await sleep(200); }
  await evaluate(PAGE_HELPERS);
  return { evaluate, send, close() { ws.close(); proc.kill(); } };
}
