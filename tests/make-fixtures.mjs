// Sinh các file SVG mẫu để kiểm thử (chạy: node tests/make-fixtures.mjs)
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
mkdirSync(out, { recursive: true });

// PNG RGBA tối giản
function png(w, h, px) {
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = ~0; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = px(x, y); raw.set([r, g, b, a], y * (w * 4 + 1) + 1 + x * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return "data:image/png;base64," + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]).toString("base64");
}
const imgA = png(64, 64, (x, y) => [200, 150 + y, 140, 255]);
const imgB = png(64, 64, (x, y) => [60 + x, 60, 70 + y, 255]);
const lumMask = png(64, 64, (x, y) => [255, 255, 255, 255]);

// 1) Cấu trúc kiểu Canva: phẳng, mỗi đối tượng là <g clip-path> riêng, ảnh nhúng, mask, nền trắng to hơn trang.
writeFileSync(join(out, "canva-like.svg"), `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="2061" zoomAndPan="magnify" viewBox="0 0 1546 760" height="1013" preserveAspectRatio="xMidYMid meet" version="1.0">
<defs>
<filter x="0%" y="0%" width="100%" height="100%" id="f1"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" color-interpolation-filters="sRGB"/></filter>
<clipPath id="c0"><path d="M 0 0 L 1546 0 L 1546 760 L 0 760 Z" clip-rule="nonzero"/></clipPath>
<image x="0" y="0" width="64" height="64" id="imgB" xlink:href="${imgB}" preserveAspectRatio="none"/>
<mask id="m1"><g filter="url(#f1)"><g filter="url(#f1)" transform="matrix(11.53125, 0, 0, 11.15625, 18, 38)"><image x="0" y="0" width="64" height="64" xlink:href="${lumMask}"/></g></g></mask>
<clipPath id="c1"><path d="M 18 38 L 756 38 L 756 752 L 18 752 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="c2"><path d="M 771 55 L 1180 55 L 1180 555 L 771 555 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="c3"><path d="M 1195 67 L 1546 67 L 1546 425 L 1195 425 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="c4"><path d="M 1195 67 L 1546 67 L 1546 425 L 1195 425 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="c5"><path d="M 1195 67 L 1546 67 L 1546 425 L 1195 425 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="c6"><path d="M 1195 67 L 1546 67 L 1546 425 L 1195 425 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="c7"><path d="M 1195 67 L 1546 67 L 1546 425 L 1195 425 Z" clip-rule="nonzero"/></clipPath>
</defs>
<g clip-path="url(#c0)">
<rect class="bg" x="-154.6" width="1855.2" fill="#ffffff" y="-76" height="912" fill-opacity="1"/>
<rect class="bg" x="-154.6" width="1855.2" fill="#ffffff" y="-76" height="912" fill-opacity="1"/>
<g clip-path="url(#c1)"><g mask="url(#m1)"><g transform="matrix(11.53125, 0, 0, 11.15625, 18, 38)"><image x="0" y="0" width="64" height="64" xlink:href="${imgA}" preserveAspectRatio="none"/></g></g></g>
<g clip-path="url(#c2)"><use xlink:href="#imgB" transform="matrix(7.015625, 0, 0, 7.8125, 751, 55)"/></g>
<g clip-path="url(#c3)"><path fill="none" stroke="#000" stroke-width="12" d="M 1205 320 A 95 95 0 1 0 1395 320 A 95 95 0 1 0 1205 320 Z"/></g>
<g clip-path="url(#c4)"><path fill="none" stroke="#000" stroke-width="12" d="M 1340 310 A 100 100 0 1 0 1540 310 A 100 100 0 1 0 1340 310 Z"/></g>
<g clip-path="url(#c5)"><path fill="#000" d="M 1275 160 L 1300 140 L 1360 140 L 1385 160 L 1330 225 Z"/></g>
<g clip-path="url(#c6)"><path fill="#000" d="M 1330 80 L 1360 122 L 1390 80 L 1375 68 L 1360 78 L 1345 68 Z"/></g>
<g clip-path="url(#c7)"><path fill="#000" d="M 1415 117 L 1445 160 L 1470 117 L 1458 105 L 1445 115 L 1430 105 Z"/></g>
</g>
</svg>`);

// 1b) Đúng cấu trúc Canva thật: không có khung cắt trang, icon nhẫn bị tách thành 3 path rời —
// tim 1 có clip sát riêng, tim 2 không có clip, cặp nhẫn có clip riêng.
writeFileSync(join(out, "canva-real.svg"), `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1920" zoomAndPan="magnify" viewBox="0 0 1440 809.999993" height="1080" preserveAspectRatio="xMidYMid meet" version="1.0">
<defs>
<filter x="0%" y="0%" width="100%" height="100%" id="f1"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" color-interpolation-filters="sRGB"/></filter>
<mask id="m1"><g filter="url(#f1)"><g transform="matrix(10.44, 0, 0, 10.125, 0, 0)"><image x="0" y="0" width="64" height="64" xlink:href="${lumMask}"/></g></g></mask>
<clipPath id="cc"><path d="M 682.42 15.37 L 1051 15.37 L 1051 468 L 682.42 468 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="ch"><path d="M 1188 26 L 1241 26 L 1241 79 L 1188 79 Z" clip-rule="nonzero"/></clipPath>
<clipPath id="cr"><path d="M 1065.95 91 L 1383.2 91 L 1383.2 350 L 1065.95 350 Z" clip-rule="nonzero"/></clipPath>
</defs>
<rect class="bg" x="-144" width="1728" fill="#ffffff" y="-81" height="972" fill-opacity="1"/>
<rect class="bg" x="-144" width="1728" fill="#ffffff" y="-81" height="972" fill-opacity="1"/>
<g mask="url(#m1)"><g transform="matrix(10.44, 0, 0, 10.125, 0, 0)"><image x="0" y="0" width="64" height="64" xlink:href="${imgA}"/></g></g>
<g clip-path="url(#cc)"><image x="682.42" y="15.37" width="368.58" height="452.63" xlink:href="${imgB}" preserveAspectRatio="none"/></g>
<g clip-path="url(#ch)"><path fill="#000000" d="M 1214.5 79 L 1188 45 L 1201 26 L 1214.5 37 L 1228 26 L 1241 45 Z"/></g>
<path fill="#000000" d="M 1300 120 L 1280 90 L 1290 62 L 1300 72 L 1312 62 L 1322 90 Z"/>
<g clip-path="url(#cr)"><path fill="#111111" d="M 1070 260 A 85 85 0 1 0 1240 260 A 85 85 0 1 0 1070 260 Z M 1090 260 A 65 65 0 1 0 1220 260 A 65 65 0 1 0 1090 260 Z M 1210 250 A 85 85 0 1 0 1380 250 A 85 85 0 1 0 1210 250 Z M 1230 250 A 65 65 0 1 0 1360 250 A 65 65 0 1 0 1230 250 Z M 1130 140 L 1150 100 L 1190 100 L 1210 140 L 1170 180 Z" fill-rule="evenodd"/></g>
</svg>`);

// 2) Có nhóm rõ ràng; khung "arch" và "couple" chồng lên nhau một chút.
writeFileSync(join(out, "grouped.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" width="1000" height="500">
<rect class="bg" width="1000" height="500" fill="#fff"/>
<g id="Layer_1">
 <g id="arch"><path fill="#c96" d="M 50 450 L 50 150 Q 50 50 200 50 Q 350 50 350 150 L 350 450 L 320 450 L 320 160 Q 320 80 200 80 Q 80 80 80 160 L 80 450 Z"/><circle cx="100" cy="120" r="40" fill="pink"/></g>
 <g id="couple" transform="translate(340 60)"><rect x="0" y="0" width="200" height="380" fill="#333"/><ellipse cx="100" cy="40" rx="30" ry="40" fill="#fc9"/></g>
 <g id="rings"><circle cx="700" cy="300" r="80" fill="none" stroke="#000" stroke-width="10"/><circle cx="800" cy="300" r="80" fill="none" stroke="#000" stroke-width="10"/><path d="M 720 120 l 20 30 l 20 -30 z" fill="#000"/></g>
</g></svg>`);

// 3) Phẳng kiểu Illustrator: mọi path nằm cùng một cấp, dùng class CSS.
writeFileSync(join(out, "flat.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" width="10in" height="5in">
<defs><style>.a{fill:#c96}.b{fill:none;stroke:#000;stroke-width:10px}.c{fill:#333}</style></defs>
<g id="Layer_1">
<path class="a" d="M 50 450 L 50 150 Q 50 50 200 50 Q 350 50 350 150 L 350 450 L 320 450 L 320 160 Q 320 80 200 80 Q 80 80 80 160 L 80 450 Z"/>
<circle cx="100" cy="120" r="40" fill="pink"/>
<rect class="c" x="380" y="60" width="200" height="380"/>
<ellipse cx="480" cy="100" rx="30" ry="40" fill="#fc9"/>
<circle class="b" cx="700" cy="300" r="80"/>
<circle class="b" cx="800" cy="300" r="80"/>
<path d="M 720 120 l 20 30 l 20 -30 z"/>
</g></svg>`);

// 4) Trường hợp khó: svg lồng có viewBox, use→symbol, hình xoay, bóng đổ (filter), chữ, gradient.
writeFileSync(join(out, "tricky.svg"), `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 900 300">
<defs>
 <linearGradient id="gr"><stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient>
 <linearGradient id="gr2" xlink:href="#gr" x1="0" x2="0" y1="0" y2="1"/>
 <symbol id="star" viewBox="0 0 10 10"><path d="M5 0 L6.2 3.8 L10 3.8 L7 6.2 L8 10 L5 7.6 L2 10 L3 6.2 L0 3.8 L3.8 3.8 Z"/></symbol>
 <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="8" dy="8" stdDeviation="3" flood-color="#000"/></filter>
 <path id="unused" d="M0 0h10v10z"/>
</defs>
<svg x="20" y="20" width="200" height="200" viewBox="0 0 100 100"><circle cx="50" cy="50" r="70" fill="url(#gr2)"/></svg>
<use xlink:href="#star" x="260" y="40" width="120" height="120" fill="gold"/>
<rect x="450" y="80" width="100" height="60" fill="green" transform="rotate(30 500 110)"/>
<ellipse cx="700" cy="110" rx="60" ry="30" fill="purple" transform="rotate(45 700 110)"/>
<rect x="780" y="200" width="60" height="40" fill="orange" filter="url(#shadow)"/>
<text x="40" y="280" font-size="30" font-family="Arial" fill="#222">Hello</text>
<polyline points="300,200 360,280 420,200" fill="none" stroke="teal" stroke-width="16" stroke-linejoin="miter"/>
</svg>`);
console.log("fixtures written to", out);
