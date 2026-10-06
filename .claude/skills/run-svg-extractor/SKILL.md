---
name: run-svg-extractor
description: Run, drive, test and screenshot SVG Extractor (svg-extractor.html), the tool that splits one big SVG into child SVGs and shrinks their size. Use when asked to start the app, split/extract/merge an SVG, compress SVG size, take a screenshot of its UI, or run its tests.
---

SVG Extractor is a single self-contained page, `svg-extractor.html` (no build, no server, no dependencies). The agent path is `.claude/skills/run-svg-extractor/driver.mjs`: it opens the page in headless Chrome over the DevTools protocol, loads an SVG, optionally merges/splits/excludes, waits for analysis and compression to finish, then writes the child SVGs, a ZIP and a screenshot to disk.

All paths below are relative to the repo root (`svgExtractor/`). Commands were run in Git Bash on Windows 11.

## Prerequisites

- Node 22+ (needs the built-in global `WebSocket`; verified on Node 24).
- Google Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`. For another install, set `CHROME` to the full path. Only Chrome was tested.
- No `npm install`: the driver and tests have no dependencies.

## Run (agent path)

Split a file, compress with the default preset ("Cân bằng"), write children, a ZIP and a screenshot:

```bash
mkdir -p tests/out/drv
node .claude/skills/run-svg-extractor/driver.mjs "C:/Users/63200506/Downloads/Untitled design.svg" --out tests/out/drv --zip tests/out/drv/all.zip --shot tests/out/drv/ui.png
```

Output is one line per cluster (`#n`, box in SVG units, size before → after compression). `[loại trừ]` clusters (the full-page white background) are listed but not written. Takes about 3–4 s for a 13 MB Canva file. Then look at the screenshot file.

Options (first argument is always the SVG path):

| option | effect |
|---|---|
| `--preset off\|light\|balanced\|strong` | compression level, default `balanced`, same as the UI default |
| `--merge 3,4` | select clusters 3 and 4 (numbered as the badges in the UI, from 1) and press "Gộp" |
| `--split 3` | select cluster 3 and press "Tách nhỏ" |
| `--exclude 5` | toggle exclusion of cluster 5 |
| `--opt k=v,k=v` | split options: `merge=auto\|always\|never`, `tol=<n>`, `vec=0\|1`, `key=0\|1`, `bg=0\|1`, `page=0\|1`, `pad=<n>` |
| `--out dir` / `--zip f.zip` / `--shot f.png` | write children / the same ZIP the "Tải ZIP" button makes / screenshot |
| `--json` | machine-readable summary |

`--merge`, `--split` and `--exclude` run in that order, and each number refers to the numbering at that moment (it renumbers after a merge or split).

Examples that were run and worked:

```bash
node .claude/skills/run-svg-extractor/driver.mjs tests/fixtures/canva-real.svg --preset off --opt vec=0 --merge 3,4
node .claude/skills/run-svg-extractor/driver.mjs tests/fixtures/flat.svg --preset off --opt tol=70 --split 1 --exclude 2
```

The first turns off the auto-join of loose vector pieces (so the hearts show up as cluster 4), then merges them back by hand. Check the effect by comparing the cluster counts: 4 clusters before the merge, 3 after.

## Direct invocation

For changes that don't touch the UI, call the page's functions directly. `tests/cdp.mjs` exports `launch()`, which returns `{ evaluate, send, close }` with the page loaded. Useful globals inside `evaluate`: `__addText(name, svgText)`, `__state` (`.session`, `.clusters`), `SVGX`, `Optimizer.optimize(svgText, Optimizer.PRESETS.balanced)`, `finalSvg(session, cluster, optOpts())`, and `__diff(svgA, svgB, box)` for a pixel comparison. `tests/run-optimizer-tests.mjs` is a worked example.

## Test

```bash
node tests/make-fixtures.mjs
node tests/run-tests.mjs
node tests/run-optimizer-tests.mjs
```

`run-tests.mjs` checks splitting: every child must match the original pixel for pixel (`pixelDiff=0`). `run-optimizer-tests.mjs` checks compression and ends with `Tất cả kiểm tra đạt` when everything passes. Both accept `SVGX_EXTRA="path-a.svg;path-b.svg"` to add your own files.

## Run (human path)

Open `svg-extractor.html` in Chrome and drag an SVG onto it. Useless headless; use the driver instead.

## Gotchas

- **Noise line `Ignoring extra certs from ...corp-ca.pem, load failed`**: harmless, comes from `NODE_EXTRA_CA_CERTS` on this machine. Pipe through `grep -v corp-ca` if you want clean output.
- **Screenshots are 1400×900 and the left panel scrolls**: the "Giảm dung lượng" controls sit below the fold. The cards and the summary line on the right are visible.
- **Compression is lossy and on by default** (`balanced`: WebP q85, ≤2× display size). Pass `--preset off` when you need the exact pixels of the split, which is what `run-tests.mjs` verifies.
- **A Canva "image" is two images**: an RGB content image (megabytes) cut by a small grayscale mask image. They are not duplicates, so "Dùng chung ảnh trùng lặp" does nothing for them. The size win comes from re-encoding the RGB image.
- **`getScreenCTM()` returns an `SVGMatrix`**, which `DOMMatrix.multiply` rejects (`parameter 1 is not of type 'SVGMatrix'`). Wrap it with `new DOMMatrix([a,b,c,d,e,f])` as `Optimizer` does.
- **Top-level `const`/`let` are not on `window`** but are still reachable from `evaluate` (global lexical scope). `__state` and `__addText` are exposed explicitly for convenience.
- **Option changes re-analyse the file** (UI `onchange` → `openFile`), so the driver sets `--opt` values before loading the SVG.

## Troubleshooting

- **`LỖI: tùy chọn không hợp lệ: foo`**: unknown key in `--opt`. Valid keys are in the table above.
- **`Error: spawn C:/Program Files/Google/Chrome/Application/chrome.exe ENOENT`**: Chrome is not at the default path. Set `CHROME` to the full path of `chrome.exe` and rerun.
- **`LỖI: File SVG không hợp lệ: ... error on line 1 at column 50`**: the input is not well-formed XML; the message is the browser's own parse error (exit code 1). Fix the file.
- **`LỖI: quá thời gian chờ phân tích/tối ưu`**: analysis did not finish in about 3 minutes (a very large or pathological file). Rerun with `--shot` and look at the status line under the middle panel.
- **`ERR_UNSUPPORTED_ESM_URL_SCHEME ... Received protocol 'c:'`**: an ad-hoc script imported `tests/cdp.mjs` by a bare Windows path. Import it as `file:///C:/...`.
