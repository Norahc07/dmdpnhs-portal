const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(
  __dirname,
  "..",
  "..",
  "dmdpnhs logo white.png"
);
const imagesDir = path.join(__dirname, "..", "public", "images");
const iconsDir = path.join(__dirname, "..", "public", "icons");

async function run() {
  if (!fs.existsSync(src)) {
    throw new Error(`Source logo not found: ${src}`);
  }

  await sharp(src)
    .resize(256, 256, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(imagesDir, "logo-sm.png"));

  await sharp(src)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(imagesDir, "logo.png"));

  await sharp(src)
    .resize(192, 192, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-192.png"));

  await sharp(src)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-512.png"));

  for (const f of ["logo-sm.png", "logo.png"]) {
    console.log(f, fs.statSync(path.join(imagesDir, f)).size);
  }
  for (const f of ["icon-192.png", "icon-512.png"]) {
    console.log(f, fs.statSync(path.join(iconsDir, f)).size);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
