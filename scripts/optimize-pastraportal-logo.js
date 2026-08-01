const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(__dirname, "..", "..", "PastraPortal Logo1.png");
const imagesDir = path.join(__dirname, "..", "public", "images");
const iconsDir = path.join(__dirname, "..", "public", "icons");
const appDir = path.join(__dirname, "..", "src", "app");
const publicDir = path.join(__dirname, "..", "public");

async function circularPng(inputPath, size, outPath) {
  const resized = await sharp(inputPath)
    .resize(size, size, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  );

  await sharp(resized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function run() {
  if (!fs.existsSync(src)) {
    throw new Error(`Source logo not found: ${src}`);
  }

  const meta = await sharp(src).metadata();
  console.log("source", meta.width, meta.height);

  await sharp(src)
    .resize(512, 512, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(imagesDir, "logo-pastraportal.png"));

  await sharp(src)
    .resize(256, 256, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(imagesDir, "logo-pastraportal-sm.png"));

  // Circular desktop title / PWA icons
  await circularPng(src, 48, path.join(publicDir, "favicon.png"));
  await circularPng(src, 32, path.join(appDir, "icon.png"));
  await circularPng(src, 180, path.join(appDir, "apple-icon.png"));
  await circularPng(src, 192, path.join(iconsDir, "icon-192.png"));
  await circularPng(src, 512, path.join(iconsDir, "icon-512.png"));

  console.log("PastraPortal Logo1 assets updated (circular favicons).");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
