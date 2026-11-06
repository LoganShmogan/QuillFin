// Renders assets/brand/quillfin-app-icon.svg to every platform's icon files.
// Run from the repo root after changing the icon: node tool/build_icons.mjs
// (sharp comes with the web app's dependencies, so `npm install` first).
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const rounded = readFileSync("assets/brand/quillfin-app-icon.svg", "utf8");
// iOS, Play and maskable icons are masked by the platform, so they must be
// full-bleed squares; iOS also rejects any transparency.
const square = rounded.replace(/ rx="\d+"/, "");

const png = (svg, size, out, { flatten = false } = {}) => {
  let img = sharp(Buffer.from(svg), { density: 300 }).resize(size, size);
  if (flatten) img = img.flatten({ background: "#0E3B4F" }).removeAlpha();
  return img.png().toFile(out);
};

const jobs = [];

const ios = "ios/Runner/Assets.xcassets/AppIcon.appiconset";
for (const i of JSON.parse(readFileSync(`${ios}/Contents.json`, "utf8")).images) {
  const size = Math.round(parseFloat(i.size) * parseInt(i.scale));
  jobs.push(png(square, size, `${ios}/${i.filename}`, { flatten: true }));
}

for (const [dpi, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  jobs.push(png(rounded, size, `android/app/src/main/res/mipmap-${dpi}/ic_launcher.png`));
}

for (const size of [16, 32, 64, 128, 256, 512, 1024]) {
  jobs.push(png(rounded, size, `macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_${size}.png`));
}

jobs.push(
  png(rounded, 192, "web/icons/Icon-192.png"),
  png(rounded, 512, "web/icons/Icon-512.png"),
  png(square, 192, "web/icons/Icon-maskable-192.png"),
  png(square, 512, "web/icons/Icon-maskable-512.png"),
  png(rounded, 32, "web/favicon.png"),
  png(rounded, 192, "webapp/app/icon.png"),
  png(square, 180, "webapp/app/apple-icon.png", { flatten: true }),
);

// Store listing graphics (uploaded by hand, see Docs/store_listing.md).
mkdirSync("store", { recursive: true });
jobs.push(png(square, 512, "store/play-icon-512.png", { flatten: true }));
const mark = rounded.match(/<g transform[\s\S]*<\/g>/)[0].replace(/translate\(192 192\) scale\(10\)/, "translate(120 90) scale(5)");
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E3B4F"/><stop offset="1" stop-color="#0F8A7E"/></linearGradient></defs>
  <rect width="1024" height="500" fill="url(#bg)"/>${mark}
  <text x="470" y="240" font-family="Outfit, sans-serif" font-weight="700" font-size="96" fill="#FFFFFF">QuillFin</text>
  <text x="474" y="300" font-family="Inter, sans-serif" font-size="32" fill="#9ED8E6">Notes that quiz you back</text>
</svg>`;
jobs.push(sharp(Buffer.from(feature)).flatten().png().toFile("store/play-feature-graphic.png"));

await Promise.all(jobs);
console.log(`Wrote ${jobs.length} icons.`);
