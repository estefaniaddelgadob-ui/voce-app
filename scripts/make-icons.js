#!/usr/bin/env node
// Generates minimal valid PNG icons for the PWA manifest.
// Uses only Node.js built-ins (fs + zlib) — no extra packages needed.
const fs   = require("fs");
const zlib = require("zlib");

// Build CRC-32 lookup table (standard PNG requirement)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const lenBuf  = Buffer.alloc(4);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf  = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePNG(width, height, r, g, b) {
  // PNG file signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: 13 bytes — dimensions, 8-bit RGB
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // colour type: RGB truecolour
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Raw scanline data: one filter byte (0 = None) then W × 3 RGB bytes per row
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const o = y * (1 + width * 3) + 1 + x * 3;
      raw[o]     = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Voce indigo #6366F1 = rgb(99, 102, 241)
const R = 99, G = 102, B = 241;
fs.mkdirSync("./public/icons", { recursive: true });
fs.writeFileSync("./public/icons/icon-192.png", makePNG(192, 192, R, G, B));
fs.writeFileSync("./public/icons/icon-512.png", makePNG(512, 512, R, G, B));
console.log("✓ public/icons/icon-192.png  (192×192, voce-indigo)");
console.log("✓ public/icons/icon-512.png  (512×512, voce-indigo)");
