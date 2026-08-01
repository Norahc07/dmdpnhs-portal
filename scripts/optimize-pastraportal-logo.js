const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(__dirname, "..", "..", "PastraPortal Logo.png");
const imagesDir = path.join(__dirname, "..", "public", "images");
const iconsDir = path.join(__dirname, "..", "public", "icons");
const appDir = path.join(__dirname, "..", "src", "app");

async function run() {
  if (!fs.existsSync(src)) {
    throw new Error(`Source logo not found: ${src}`);
  }

  await sharp(src)
    .resize(512, 512, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(imagesDir, "logo-pastraportal.png"));

  await sharp(src)
    .resize(256, 256, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(imagesDir, "logo-pastraportal-sm.png"));

  await sharp(src)
    .resize(192, 192, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-192.png"));

  await sharp(src)
    .resize(512, 512, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-512.png"));

  await sharp(src)
    .resize(48, 48, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(__dirname, "..", "public", "favicon.png"));

  await sharp(src)
    .resize(32, 32, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(appDir, "icon.png"));

  await sharp(src)
    .resize(180, 180, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(appDir, "apple-icon.png"));

  console.log("PastraPortal logo assets updated.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
