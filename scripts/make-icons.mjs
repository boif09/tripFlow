// Genera los iconos PNG de la PWA (una "T" blanca sobre teal, como la marca de la app) sin dependencias.
// Uso: node scripts/make-icons.mjs   (los PNG se guardan en public/icons/)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BACKGROUND = [0x1f, 0x6f, 0x78];
const FOREGROUND = [0xff, 0xff, 0xff];
const SUPERSAMPLE = 4;

const BAR_HALF_WIDTH = 0.2;
const BAR_TOP = -0.22;
const BAR_BOTTOM = -0.13;
const STEM_HALF_WIDTH = 0.045;
const STEM_BOTTOM = 0.22;

function insideLetter(u, v) {
  const inBar = Math.abs(u) <= BAR_HALF_WIDTH && v >= BAR_TOP && v <= BAR_BOTTOM;
  const inStem = Math.abs(u) <= STEM_HALF_WIDTH && v >= BAR_TOP && v <= STEM_BOTTOM;
  return inBar || inStem;
}

// Forma del icono en coordenadas 0..1. `scale` encoge el símbolo (zona segura de los iconos "maskable").
function shapeAt(x, y, { rounded, scale }) {
  if (rounded) {
    const r = 0.22;
    const cx = Math.min(Math.max(x, r), 1 - r);
    const cy = Math.min(Math.max(y, r), 1 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 > r ** 2) return null;
  }
  const u = (x - 0.5) / scale;
  const v = (y - 0.5) / scale;
  return insideLetter(u, v) ? FOREGROUND : BACKGROUND;
}

function render(size, options) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0; let g = 0; let b = 0; let a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const color = shapeAt((px + (sx + 0.5) / SUPERSAMPLE) / size, (py + (sy + 0.5) / SUPERSAMPLE) / size, options);
          if (!color) continue;
          r += color[0]; g += color[1]; b += color[2]; a += 255;
        }
      }
      const samples = SUPERSAMPLE ** 2;
      const offset = (py * size + px) * 4;
      const coverage = a / 255;
      pixels[offset] = coverage ? Math.round(r / coverage) : 0;
      pixels[offset + 1] = coverage ? Math.round(g / coverage) : 0;
      pixels[offset + 2] = coverage ? Math.round(b / coverage) : 0;
      pixels[offset + 3] = Math.round(a / samples);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true, scale: 1.1 },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 1.1 },
  { file: 'maskable-512.png', size: 512, rounded: false, scale: 0.8 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 1 },
];

fs.mkdirSync(outDir, { recursive: true });
for (const icon of ICONS) {
  fs.writeFileSync(path.join(outDir, icon.file), encodePng(icon.size, render(icon.size, icon)));
  console.log(`public/icons/${icon.file}`);
}
