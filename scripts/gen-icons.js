const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const dir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(dir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const r = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x += 1) {
      const i = 1 + x * 3;
      r[i] = 0x80;
      r[i + 1] = 0x00;
      r[i + 2] = 0x00;
    }
    rows.push(r);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(dir, "icon-192.png"), png(192));
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512));
console.log("PWA icons written");
