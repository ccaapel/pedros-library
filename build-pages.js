// Gera a pasta docs/ (GitHub Pages) a partir de index.html, o mesmo arquivo do Artifact do claude.ai.
// Uso: node build-pages.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const out = path.join(root, 'docs');
fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* Página completa: o arquivo do Artifact não tem <html>, <head> nem <body> */
const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0A0A0A">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Stuff">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
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
  description: 'Guarde, leia, anote, ouça e revise o que chamou sua atenção no dia.',
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#0A0A0A',
  theme_color: '#0A0A0A',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ],
  share_target: {
    action: './',
    method: 'GET',
    params: { title: 'title', text: 'text', url: 'url' }
  }
}, null, 2));

/* Service worker: abre o app mesmo sem internet (os dados já ficam no aparelho) */
fs.writeFileSync(path.join(out, 'sw.js'), `const V = 'bp-v3';
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

/* Ícones PNG desenhados à mão (sem dependências): fundo escuro e um marcador verde */
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
  const bg = [0x0a, 0x0a, 0x0a], fg = [0xee, 0x4b, 0x32];
  const raw = Buffer.alloc((size * 3 + 1) * size);
  /* marcador: retângulo com entalhe em V embaixo, centrado, ocupando 'scale' do lado */
  const w = size * scale * 0.5, h = size * scale * 0.72;
  const x0 = (size - w) / 2, y0 = (size - h) / 2, x1 = x0 + w, y1 = y0 + h, mid = (x0 + x1) / 2, notch = h * 0.22;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      if (inside) {
        const d = Math.abs(x - mid) / (w / 2);
        if (y > y1 - notch * (1 - d)) inside = false;
      }
      const c = inside ? fg : bg;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}
fs.writeFileSync(path.join(out, 'icon-192.png'), png(192, 0.62));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512, 0.62));
fs.writeFileSync(path.join(out, 'icon-512-maskable.png'), png(512, 0.5));
console.log('docs/ gerado');
