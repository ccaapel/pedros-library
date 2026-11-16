// Gera a pasta docs/ (GitHub Pages) a partir de index.html, o mesmo arquivo do Artifact do claude.ai.
// Uso: node build-pages.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const out = path.join(root, 'docs');
fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const BG = '#101412';

/* Página completa: o arquivo do Artifact não tem <html>, <head> nem <body> */
const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${BG}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Stuff">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${src}
<script>
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), page);

fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'Stuff',
  short_name: 'Stuff',
  description: 'Guarde, leia, ouça e lembre o que te prende.',
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: BG,
  theme_color: BG,
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ],
  share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } }
}, null, 2));

/* Service worker: abre o app mesmo sem internet (os dados já ficam no aparelho) */
fs.writeFileSync(path.join(out, 'sw.js'), `const V = 'stuff-v4';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
`);

/* Ícone: o mesmo livro aberto da animação de abertura, desenhado em traço (sem dependências).
   Coordenadas na grade 120x120, iguais às do SVG em index.html. */
function bez(p0, p1, p2, p3, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
              u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return pts;
}
const GREEN = [0x6d, 0xb5, 0x9c], CLAY = [0xe5, 0x82, 0x5e], WHEAT = [0xe8, 0xc5, 0x6a];
const strokes = [
  // página esquerda: M60 50 C48 40 30 38 14 44 v52 c16-6 34-4 46 6
  { c: GREEN, w: 5, p: [...bez([60, 50], [48, 40], [30, 38], [14, 44]), [14, 96], ...bez([14, 96], [30, 90], [48, 92], [60, 102])] },
  // página direita
  { c: GREEN, w: 5, p: [...bez([60, 50], [72, 40], [90, 38], [106, 44]), [106, 96], ...bez([106, 96], [90, 90], [72, 92], [60, 102])] },
  { c: GREEN, w: 5, p: [[60, 50], [60, 102]] },
  // as três coisas que saem do livro
  { c: CLAY, w: 4, p: Array.from({ length: 25 }, (_, i) => [44 + 5 * Math.cos(i / 24 * 6.2832), 22 + 5 * Math.sin(i / 24 * 6.2832)]) },
  { c: WHEAT, w: 4, p: [[56, 8], [66, 8], [66, 18], [56, 18], [56, 8]] },
  { c: CLAY, w: 4, p: [[74, 18], [83, 23], [74, 28], [74, 18]] }
];
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, scale) {
  const bg = [0x10, 0x14, 0x12];
  const k = size * scale / 120, ox = (size - 120 * k) / 2, oy = (size - 120 * k) / 2 + 4 * k;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = (x + .5 - ox) / k, gy = (y + .5 - oy) / k;
      let col = bg, a = 0;
      for (const s of strokes) {
        let best = 1e9;
        for (let i = 0; i < s.p.length - 1; i++) {
          const [x1, y1] = s.p[i], [x2, y2] = s.p[i + 1];
          const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1e-9;
          let t = ((gx - x1) * dx + (gy - y1) * dy) / l2; t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(gx - (x1 + t * dx), gy - (y1 + t * dy));
          if (d < best) best = d;
        }
        const cov = Math.max(0, Math.min(1, (s.w / 2 - best) * k + .5)); // borda suave
        if (cov > a) { a = cov; col = s.c; }
      }
      const i = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[i + c] = Math.round(bg[c] + (col[c] - bg[c]) * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}
fs.writeFileSync(path.join(out, 'icon-180.png'), png(180, 0.72));
fs.writeFileSync(path.join(out, 'icon-192.png'), png(192, 0.72));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512, 0.72));
fs.writeFileSync(path.join(out, 'icon-512-maskable.png'), png(512, 0.56));
console.log('docs/ gerado');
