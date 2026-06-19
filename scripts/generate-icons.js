// Generates simple PNG app icons (no external deps) so the app is installable
// as a PWA. Brand-green tile with a white circle + a small "+" cross (a neutral
// "help/aid" mark). Replace later with a designed icon if you like.
//
//   node scripts/generate-icons.js
//
// Writes public/icon-192.png and public/icon-512.png.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// CRC32 for PNG chunks.
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  const W = size, H = size;
  const cx = W / 2, cy = H / 2;
  const rCircle = size * 0.34;
  const armW = size * 0.07; // cross thickness
  const armL = size * 0.20; // cross half-length
  // Brand green background, white circle, green cross inside.
  const bg = [29, 138, 78];
  const white = [255, 255, 255];

  const raw = Buffer.alloc((W * 4 + 1) * H);
  let o = 0;
  for (let y = 0; y < H; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const inCircle = dx * dx + dy * dy <= rCircle * rCircle;
      const inCross =
        (Math.abs(dx) <= armW && Math.abs(dy) <= armL) ||
        (Math.abs(dy) <= armW && Math.abs(dx) <= armL);
      let col;
      if (inCircle && inCross) col = bg;
      else if (inCircle) col = white;
      else col = bg;
      raw[o++] = col[0];
      raw[o++] = col[1];
      raw[o++] = col[2];
      raw[o++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public");
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), makePng(size));
  console.log(`wrote public/icon-${size}.png`);
}
